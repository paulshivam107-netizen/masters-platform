"""R01: auth email links, single-use tokens and non-enumerating responses.

Runs against a disposable SQLite DB with email delivery stubbed; no real mail is sent.
"""
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.parse import unquote, urlsplit

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import hash_refresh_token
from config import Settings
from database import Base, get_db
from models import AuthToken, User
from routers import auth_routes
from services import auth_flows, reminders
from services.rate_limit import rate_limiter


def make_settings(**overrides) -> Settings:
    values = {
        "SECRET_KEY": "test-secret-key-that-is-long-enough-123456",
        "APP_ENV": "development",
        "PUBLIC_APP_URL": "https://app.example.com",
        "EXPOSE_DEV_AUTH_TOKENS": True,
        "_env_file": None,
    }
    values.update(overrides)
    return Settings(**values)


class PublicAppUrlValidationTest(unittest.TestCase):
    def test_development_accepts_localhost(self):
        settings = make_settings(PUBLIC_APP_URL="http://localhost:3000")
        self.assertIsNone(settings.public_app_url_error)
        self.assertEqual(settings.public_app_origin, "http://localhost:3000")

    def test_trailing_slash_is_normalised(self):
        self.assertEqual(make_settings(PUBLIC_APP_URL="https://App.Example.com/").public_app_origin,
                         "https://app.example.com")

    def test_rejects_non_origin_values(self):
        for value in ["", "app.example.com", "ftp://app.example.com", "https://app.example.com/login",
                      "https://app.example.com?x=1", "https://user:pw@app.example.com",
                      "https://app.example.com:99999"]:
            with self.subTest(value=value):
                self.assertIsNotNone(make_settings(PUBLIC_APP_URL=value).public_app_url_error)

    def test_production_requires_https_public_host(self):
        for value in ["http://app.example.com", "https://localhost", "https://127.0.0.1:3000"]:
            with self.subTest(value=value):
                settings = make_settings(APP_ENV="production", PUBLIC_APP_URL=value)
                self.assertIsNotNone(settings.public_app_url_error)
        self.assertIsNone(make_settings(APP_ENV="production").public_app_url_error)


class SmtpResultTest(unittest.TestCase):
    def test_unconfigured_smtp_is_dry_run(self):
        sent, dry_run, _ = reminders.send_email_notification("s", "b", "to@example.com", None, 587, None, None, "f@x")
        self.assertEqual((sent, dry_run), (False, True))

    def test_configured_smtp_failure_is_not_reported_as_dry_run(self):
        with patch.object(reminders.smtplib, "SMTP", side_effect=OSError("connection refused")):
            sent, dry_run, message = reminders.send_email_notification(
                "s", "secret link body", "to@example.com", "smtp.example.com", 587, "u", "p", "f@x")
        self.assertEqual((sent, dry_run), (False, False))
        self.assertNotIn("connection refused", message)


class AuthEmailFlowTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limiter._events.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/auth.sqlite",
                                    connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        def get_test_db():
            with self.Session() as db:
                yield db

        app = FastAPI()
        app.include_router(auth_routes.router)
        app.dependency_overrides[get_db] = get_test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")

        self.sent_emails = []

        def fake_send(subject, body, recipient, **_kwargs):
            self.sent_emails.append({"subject": subject, "body": body, "recipient": recipient})
            return self.send_result

        self.send_result = (False, True, "SMTP not configured. Ran in dry-run mode.")
        self.patches = [
            patch.object(auth_routes, "settings", make_settings()),
            patch.object(auth_flows, "send_email_notification", side_effect=fake_send),
        ]
        for p in self.patches:
            p.start()

    async def asyncTearDown(self):
        for p in self.patches:
            p.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def signup(self, email="applicant@example.com"):
        response = await self.client.post("/auth/signup", json={
            "email": email, "name": "Applicant", "password": "strong-password-123"})
        self.assertEqual(response.status_code, 201, response.text)
        return response

    def link_token(self, body: str, route: str) -> str:
        link = next(line for line in body.splitlines() if line.startswith("https://"))
        parts = urlsplit(link)
        self.assertEqual(f"{parts.scheme}://{parts.netloc}", "https://app.example.com")
        self.assertEqual(parts.path, route)
        self.assertEqual(parts.query, "", "token must not be in the query string")
        self.assertTrue(parts.fragment.startswith("token="))
        self.assertNotIn("localhost", body)
        return unquote(parts.fragment[len("token="):])

    async def test_signup_email_link_verifies_once(self):
        await self.signup()
        self.assertEqual(len(self.sent_emails), 1)
        token = self.link_token(self.sent_emails[0]["body"], "/auth/verify-email")

        first = await self.client.post("/auth/verify-email", json={"token": token})
        self.assertEqual(first.status_code, 200, first.text)
        with self.Session() as db:
            self.assertTrue(db.query(User).filter_by(email="applicant@example.com").one().email_verified)

        replay = await self.client.post("/auth/verify-email", json={"token": token})
        self.assertEqual(replay.status_code, 400)

    async def test_signup_survives_email_failure(self):
        self.send_result = (False, False, "Email delivery failed. Please try again later.")
        await self.signup()
        with patch.object(auth_flows, "send_email_notification", side_effect=RuntimeError("boom")):
            await self.signup("second@example.com")

    async def test_reset_link_works_once_and_revokes_sessions(self):
        signup_response = await self.signup()
        old_cookie = signup_response.cookies.get("masters_refresh")
        old_access = signup_response.json()["access_token"]
        self.assertTrue(old_cookie)
        self.sent_emails.clear()

        response = await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
        self.assertEqual(response.status_code, 200)
        token = self.link_token(self.sent_emails[0]["body"], "/auth/reset-password")

        reset = await self.client.post("/auth/reset-password", json={"token": token, "new_password": "new-password-456"})
        self.assertEqual(reset.status_code, 200, reset.text)
        replay = await self.client.post("/auth/reset-password", json={"token": token, "new_password": "another-pass-789"})
        self.assertEqual(replay.status_code, 400)

        login = await self.client.post("/auth/login", json={"email": "applicant@example.com", "password": "new-password-456"})
        self.assertEqual(login.status_code, 200, login.text)
        self.client.cookies.clear()
        refresh = await self.client.post("/auth/refresh", cookies={"masters_refresh": old_cookie})
        self.assertEqual(refresh.status_code, 401)
        me = await self.client.get("/auth/me", headers={"Authorization": f"Bearer {old_access}"})
        self.assertEqual(me.status_code, 401, "old access token must stop working after a reset")

    async def test_new_reset_request_invalidates_previous_link(self):
        await self.signup()
        await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
        await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
        old_token = self.link_token(self.sent_emails[-2]["body"], "/auth/reset-password")
        new_token = self.link_token(self.sent_emails[-1]["body"], "/auth/reset-password")
        old = await self.client.post("/auth/reset-password", json={"token": old_token, "new_password": "new-password-456"})
        self.assertEqual(old.status_code, 400)
        new = await self.client.post("/auth/reset-password", json={"token": new_token, "new_password": "new-password-456"})
        self.assertEqual(new.status_code, 200)

    async def test_expired_token_is_rejected(self):
        await self.signup()
        await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
        token = self.link_token(self.sent_emails[-1]["body"], "/auth/reset-password")
        with self.Session() as db:
            row = db.query(AuthToken).filter_by(token_hash=hash_refresh_token(token)).one()
            row.expires_at = datetime.utcnow() - timedelta(minutes=1)
            db.commit()
        response = await self.client.post("/auth/reset-password", json={"token": token, "new_password": "new-password-456"})
        self.assertEqual(response.status_code, 400)

    async def test_responses_do_not_reveal_whether_account_exists(self):
        await self.signup()
        with patch.object(auth_routes, "settings", make_settings(EXPOSE_DEV_AUTH_TOKENS=False)):
            known = await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
            unknown = await self.client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
            self.assertEqual(known.json(), unknown.json())
            self.assertIsNone(known.json().get("dev_token"))

            unverified = await self.client.post("/auth/request-email-verification", json={"email": "applicant@example.com"})
            missing = await self.client.post("/auth/request-email-verification", json={"email": "nobody@example.com"})
            self.assertEqual(unverified.json(), missing.json())

    async def test_reset_marks_email_verified(self):
        await self.signup()
        await self.client.post("/auth/forgot-password", json={"email": "applicant@example.com"})
        token = self.link_token(self.sent_emails[-1]["body"], "/auth/reset-password")
        await self.client.post("/auth/reset-password", json={"token": token, "new_password": "new-password-456"})
        with self.Session() as db:
            self.assertTrue(db.query(User).filter_by(email="applicant@example.com").one().email_verified)


if __name__ == "__main__":
    unittest.main()
