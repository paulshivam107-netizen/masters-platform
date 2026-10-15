"""R06: account export isolation, deletion manifest coverage, re-authentication, and
post-deletion inaccessibility. Disposable SQLite DB; no network, no email, no AI provider."""
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import auth
from config import Settings
from database import Base, get_db
from models import (AdminEvent, ApplicationTracker, AuthToken, Essay, InterviewOperation, InterviewQuota,
                    InterviewSession, PilotFeedback, RefreshToken, ResumeQuestionSet, User)
from routers import account_routes, application_routes, auth_routes, essay_routes, interview_routes
from services import auth_flows
from services import interview_provider as provider
from services.account_data import DELETION_MANIFEST

PASSWORD = "strong-password-123"
COOKIE = "masters_refresh"


def make_settings() -> Settings:
    return Settings(SECRET_KEY="test-secret-key-that-is-long-enough-123456", APP_ENV="development",
                    PUBLIC_APP_URL="https://app.example.com", CORS_ORIGINS="https://app.example.com",
                    EXPOSE_DEV_AUTH_TOKENS=True, _env_file=None)


class ManifestTest(unittest.TestCase):
    def test_every_table_has_an_export_and_deletion_decision(self):
        tables = set(Base.metadata.tables) | {"alembic_version"}
        self.assertEqual(tables, set(DELETION_MANIFEST),
                         "a table was added or removed without updating DELETION_MANIFEST and docs/DATA_RETENTION.md")


class AccountDataTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/a.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        def test_db():
            with self.Session() as db:
                yield db

        app = FastAPI()
        for module in (auth_routes, account_routes, application_routes, essay_routes, interview_routes):
            app.include_router(module.router)
        app.dependency_overrides[get_db] = test_db
        settings = make_settings()
        self.patches = [
            patch.object(auth_routes, "settings", settings),
            patch.object(auth, "settings", settings),
            patch.object(auth_flows, "send_email_notification", return_value=(False, True, "dry run")),
            patch.object(provider, "api_key", return_value=""),
            patch("services.interview_provider.httpx.Client.post", side_effect=AssertionError("external request")),
        ]
        for p in self.patches:
            p.start()
        self.app = app
        self.client = self.new_client()

    def new_client(self):
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://testserver")

    async def asyncTearDown(self):
        for p in self.patches:
            p.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def signup(self, email, name="Applicant"):
        async with self.new_client() as c:
            r = await c.post("/auth/signup", json={"email": email, "name": name, "password": PASSWORD})
        self.assertEqual(r.status_code, 201, r.text)
        with self.Session() as db:
            uid = db.query(User).filter_by(email=email).one().id
        return {"id": uid, "headers": {"Authorization": "Bearer " + r.json()["access_token"]}, "cookie": r.cookies[COOKIE]}

    async def populate(self, who, tag):
        h = who["headers"]
        app_r = await self.client.post("/applications/", headers=h, json={
            "school_name": f"{tag} School", "program_name": "MBA", "deadline": "2027-01-15"})
        self.assertEqual(app_r.status_code, 201, app_r.text)
        essay = await self.client.post("/essays/", headers=h, json={
            "school_name": f"{tag} School", "program_type": "MBA", "essay_prompt": "Why this program?",
            "essay_content": f"SECRET-ESSAY-{tag} " + "word " * 10, "application_id": app_r.json()["id"]})
        self.assertEqual(essay.status_code, 200, essay.text)
        v2 = await self.client.post("/essays/", headers=h, json={
            "school_name": f"{tag} School", "program_type": "MBA", "essay_prompt": "Why this program?",
            "essay_content": f"SECRET-ESSAY-{tag} second " + "word " * 10, "parent_essay_id": essay.json()["id"]})
        self.assertEqual(v2.status_code, 200, v2.text)
        sess = await self.client.post("/interviews/sessions", headers=h, json={
            "request_id": str(uuid4()), "route": "cat", "provider": "demo", "question_limit": 3})
        self.assertEqual(sess.status_code, 201, sess.text)
        sess = sess.json()
        ans = await self.client.post(f"/interviews/sessions/{sess['id']}/answers", headers=h, json={
            "request_id": str(uuid4()), "expected_version": sess["version"], "text": f"SECRET-ANSWER-{tag} I led a team."})
        self.assertEqual(ans.status_code, 200, ans.text)
        with self.Session() as db:
            db.add(PilotFeedback(user_id=who["id"], message=f"SECRET-FEEDBACK-{tag}"))
            db.add(AdminEvent(user_id=who["id"], event_name="view_home", payload_json=json.dumps({"note": f"SECRET-EVT-{tag}"})))
            db.add(ResumeQuestionSet(id=str(uuid4()), user_id=who["id"], request_id=str(uuid4()), fingerprint="f" * 64,
                                     context_json=json.dumps({"roles": [f"SECRET-RESUME-{tag}"]}), questions_json="[]",
                                     usage_json=json.dumps({"model": "m", "input_tokens": 11, "output_tokens": 7}),
                                     status="completed"))
            db.commit()
        return {"application": app_r.json()["id"], "essay": essay.json()["id"], "session": sess["id"]}

    # --- export -------------------------------------------------------------------------------

    async def test_export_contains_only_requesting_users_data_and_no_secrets(self):
        a, b = await self.signup("a@example.com"), await self.signup("b@example.com")
        await self.populate(a, "ALPHA")
        await self.populate(b, "BRAVO")
        r = await self.client.get("/account/export", headers=a["headers"])
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.headers["cache-control"], "no-store")
        self.assertIn("attachment", r.headers["content-disposition"])
        text = r.text
        for needle in ("SECRET-ESSAY-ALPHA", "SECRET-ANSWER-ALPHA", "SECRET-FEEDBACK-ALPHA", "SECRET-EVT-ALPHA",
                       "SECRET-RESUME-ALPHA"):
            self.assertIn(needle, text)
        self.assertNotIn("BRAVO", text)
        self.assertNotIn("b@example.com", text)
        data = r.json()
        self.assertEqual(data["profile"]["email"], "a@example.com")
        self.assertEqual(len(data["essays"]), 2)
        self.assertEqual(len(data["interview_sessions"]), 1)
        self.assertEqual(data["interview_sessions"][0]["operations"][0]["kind"], "answer")
        # Secrets and server-internal fingerprints never leave the server.
        with self.Session() as db:
            secrets = [u.hashed_password for u in db.query(User)] + [t.token_hash for t in db.query(RefreshToken)]
            secrets += [t.token_hash for t in db.query(AuthToken)]
            secrets += [s.create_fingerprint for s in db.query(InterviewSession)]
        for secret in filter(None, secrets):
            self.assertNotIn(secret, text)
        for key in ("hashed_password", "token_hash", "family_id", "fingerprint"):
            self.assertNotIn(key, text)
        rb = await self.client.get("/account/export", headers=b["headers"])
        self.assertIn("SECRET-ESSAY-BRAVO", rb.text)
        self.assertNotIn("ALPHA", rb.text)

    async def test_export_requires_authentication(self):
        self.assertIn((await self.client.get("/account/export")).status_code, (401, 403))

    # --- deletion -----------------------------------------------------------------------------

    async def delete(self, who, **body):
        return await self.client.post("/account/delete", headers=who["headers"], json={"confirm": "DELETE", **body})

    async def test_deletion_requires_password_and_explicit_confirmation(self):
        a = await self.signup("a@example.com")
        self.assertEqual((await self.delete(a)).status_code, 403)
        wrong = await self.delete(a, password="not-my-password")
        self.assertEqual(wrong.status_code, 403)
        self.assertEqual(wrong.json()["detail"]["code"], "reauth_failed")
        no_confirm = await self.client.post("/account/delete", headers=a["headers"], json={"password": PASSWORD})
        self.assertEqual(no_confirm.status_code, 422)
        with self.Session() as db:
            self.assertEqual(db.query(User).count(), 1)

    async def test_deletion_removes_content_anonymises_aggregates_and_revokes_sessions(self):
        a, b = await self.signup("a@example.com"), await self.signup("b@example.com")
        ids = await self.populate(a, "ALPHA")
        other = await self.populate(b, "BRAVO")
        with self.Session() as db:
            db.add(InterviewQuota(id=f"ai:user:{a['id']}:2026-10-15", calls=3))
            db.add(InterviewQuota(id=f"ai:user:{a['id']}1:2026-10-15", calls=4))  # prefix look-alike, other user
            db.add(InterviewQuota(id="ai:global:2026-10-15", calls=9))
            db.commit()
        r = await self.delete(a, password=PASSWORD)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["deleted"])
        cookie = r.headers["set-cookie"].lower()
        self.assertIn(f"{COOKIE}=", cookie)
        self.assertTrue("max-age=0" in cookie or "1970" in cookie, "refresh cookie must be cleared")

        # The deleted user's token is dead; another user probing the old ids gets 404.
        for path in (f"/interviews/sessions/{ids['session']}", f"/essays/{ids['essay']}",
                     f"/applications/{ids['application']}"):
            self.assertEqual((await self.client.get(path, headers=a["headers"])).status_code, 401, path)
            self.assertEqual((await self.client.get(path, headers=b["headers"])).status_code, 404, path)
        self.assertEqual((await self.client.get("/account/export", headers=a["headers"])).status_code, 401)
        async with self.new_client() as c:
            self.assertEqual((await c.post("/auth/refresh", cookies={COOKIE: a["cookie"]})).status_code, 401)
            login = await c.post("/auth/login", json={"email": "a@example.com", "password": PASSWORD})
            self.assertEqual(login.status_code, 401)

        with self.Session() as db:
            self.assertIsNone(db.query(User).filter_by(email="a@example.com").first())
            for model in (ApplicationTracker, Essay, InterviewSession, ResumeQuestionSet, PilotFeedback):
                self.assertEqual(db.query(model).filter(model.user_id == a["id"]).count(), 0, model.__name__)
            self.assertEqual(db.query(RefreshToken).filter_by(user_id=a["id"]).count(), 0)
            live_sessions = [s.id for s in db.query(InterviewSession)]
            self.assertEqual(db.query(InterviewOperation).filter(
                ~InterviewOperation.session_id.in_(live_sessions)).count(), 0)
            dump = json.dumps([[e.payload_json for e in db.query(AdminEvent)],
                               [(q.id, q.calls) for q in db.query(InterviewQuota)]])
            self.assertNotIn("ALPHA", dump)
            self.assertEqual(db.query(AdminEvent).filter(AdminEvent.user_id == a["id"]).count(), 0)
            self.assertEqual(db.query(AdminEvent).filter_by(event_name="view_home", user_id=None).count(), 1,
                             "aggregate telemetry row is kept without the user or payload")
            ledger = json.loads(db.query(AdminEvent).filter_by(event_name="account_deleted").one().payload_json)
            self.assertEqual(ledger["usage_ledger"]["by_model"]["m"]["input_tokens"], 11)
            self.assertNotIn("a@example.com", json.dumps(ledger))
            quotas = {q.id: q.calls for q in db.query(InterviewQuota)}
            self.assertNotIn(f"ai:user:{a['id']}:2026-10-15", quotas)
            self.assertIn(f"ai:user:{a['id']}1:2026-10-15", quotas, "only the deleted user's counters are removed")
            self.assertEqual(quotas["ai:global:2026-10-15"], 9)
            self.assertEqual(db.query(Essay).filter_by(user_id=b["id"]).count(), 2)
            self.assertEqual(db.query(InterviewSession).filter_by(user_id=b["id"]).count(), 1)
        self.assertEqual((await self.client.get(f"/essays/{other['essay']}", headers=b["headers"])).status_code, 200)

        again = await self.signup("a@example.com")
        export = (await self.client.get("/account/export", headers=again["headers"])).json()
        self.assertEqual(export["essays"], [])
        self.assertEqual(export["interview_sessions"], [])

    async def test_deletion_revokes_other_signed_in_devices(self):
        a = await self.signup("a@example.com")
        async with self.new_client() as c:
            second = await c.post("/auth/login", json={"email": "a@example.com", "password": PASSWORD})
        other_headers = {"Authorization": "Bearer " + second.json()["access_token"]}
        self.assertEqual((await self.client.get("/account/export", headers=other_headers)).status_code, 200)
        self.assertEqual((await self.delete(a, password=PASSWORD)).status_code, 200)
        self.assertEqual((await self.client.get("/account/export", headers=other_headers)).status_code, 401)

    async def test_google_only_account_needs_a_fresh_login(self):
        with patch.object(auth_routes, "verify_google_identity_token", return_value=("g@example.com", "Gee")):
            async with self.new_client() as c:
                r = await c.post("/auth/google", json={"id_token": "x" * 40})
        self.assertEqual(r.status_code, 200, r.text)
        headers = {"Authorization": "Bearer " + r.json()["access_token"]}
        with self.Session() as db:
            self.assertIsNone(db.query(User).filter_by(email="g@example.com").one().hashed_password)
            db.query(RefreshToken).update({RefreshToken.created_at: datetime.utcnow() - timedelta(minutes=30)})
            db.commit()
        stale = await self.client.post("/account/delete", headers=headers, json={"confirm": "DELETE"})
        self.assertEqual(stale.status_code, 403)
        self.assertEqual(stale.json()["detail"]["code"], "reauth_required")
        self.assertEqual((await self.client.post("/account/delete", headers=headers,
                         json={"confirm": "DELETE", "password": "anything"})).status_code, 403)
        with self.Session() as db:
            db.query(RefreshToken).update({RefreshToken.created_at: datetime.utcnow() - timedelta(minutes=2)})
            db.commit()
        ok = await self.client.post("/account/delete", headers=headers, json={"confirm": "DELETE"})
        self.assertEqual(ok.status_code, 200, ok.text)
        with self.Session() as db:
            self.assertEqual(db.query(User).count(), 0)

    async def test_deletion_waits_for_in_flight_ai_step(self):
        a = await self.signup("a@example.com")
        ids = await self.populate(a, "ALPHA")
        with self.Session() as db:
            db.get(InterviewSession, ids["session"]).pending_until = datetime.utcnow() + timedelta(minutes=2)
            db.commit()
        r = await self.delete(a, password=PASSWORD)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["detail"]["code"], "operation_in_progress")
        with self.Session() as db:
            self.assertEqual(db.query(User).count(), 1)
            self.assertEqual(db.query(Essay).count(), 2)


if __name__ == "__main__":
    unittest.main()
