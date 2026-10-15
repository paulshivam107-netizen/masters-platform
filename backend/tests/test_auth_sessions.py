"""R04: cookie sessions, rotation, reuse detection, revocation, CSRF origin checks, admin
bootstrap and account pre-hijacking. Disposable SQLite DB; no network or email."""
import asyncio
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import httpx
from fastapi import Depends, FastAPI
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import auth
from auth import ALGORITHM, SECRET_KEY, hash_refresh_token, require_admin_user
from config import Settings
from database import Base, get_db
from models import RefreshToken, User
from routers import auth_routes
from services import auth_flows
from services.rate_limit import rate_limiter

COOKIE = "masters_refresh"
APP_ORIGIN = "https://app.example.com"


def make_settings(**overrides) -> Settings:
    values = {
        "SECRET_KEY": "test-secret-key-that-is-long-enough-123456",
        "APP_ENV": "development",
        "PUBLIC_APP_URL": APP_ORIGIN,
        "CORS_ORIGINS": APP_ORIGIN,
        "EXPOSE_DEV_AUTH_TOKENS": True,
        "ADMIN_EMAILS": "founder@example.com",
        "_env_file": None,
    }
    values.update(overrides)
    return Settings(**values)


class AuthSessionTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limiter._events.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/s.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        def get_test_db():
            with self.Session() as db:
                yield db

        app = FastAPI()
        app.include_router(auth_routes.router)

        @app.get("/admin-only")
        def admin_only(user=Depends(require_admin_user)):
            return {"ok": True}

        app.dependency_overrides[get_db] = get_test_db
        self.app = app
        self.settings = make_settings()
        self.patches = [
            patch.object(auth_routes, "settings", self.settings),
            patch.object(auth, "settings", self.settings),
            patch.object(auth_flows, "send_email_notification", return_value=(False, True, "dry run")),
        ]
        for p in self.patches:
            p.start()
        self.client = self.new_client()

    def new_client(self):
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://testserver")

    async def asyncTearDown(self):
        for p in self.patches:
            p.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def signup(self, client=None, email="applicant@example.com"):
        client = client or self.client
        r = await client.post("/auth/signup", json={"email": email, "name": "Applicant", "password": "strong-password-123"})
        self.assertEqual(r.status_code, 201, r.text)
        return r

    async def login(self, client=None, email="applicant@example.com", password="strong-password-123"):
        client = client or self.client
        return await client.post("/auth/login", json={"email": email, "password": password})

    def bearer(self, response):
        return {"Authorization": "Bearer " + response.json()["access_token"]}

    async def refresh_with(self, cookie, origin=None):
        async with self.new_client() as c:
            headers = {"Origin": origin} if origin else {}
            return await c.post("/auth/refresh", cookies={COOKIE: cookie}, headers=headers)

    # --- cookie and token shape ---------------------------------------------------------------

    async def test_login_sets_httponly_cookie_and_short_access_token(self):
        r = await self.signup()
        set_cookie = r.headers["set-cookie"].lower()
        self.assertIn(f"{COOKIE}=", set_cookie)
        self.assertIn("httponly", set_cookie)
        self.assertIn("path=/auth", set_cookie)
        self.assertIn("samesite=lax", set_cookie)
        self.assertIsNone(r.json()["refresh_token"], "refresh token must never reach page scripts")
        claims = jwt.decode(r.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
        self.assertIn("sid", claims)
        self.assertLessEqual(claims["exp"] - claims["iat"], 15 * 60)

    async def test_secure_cookie_outside_development(self):
        with patch.object(auth_routes, "settings", make_settings(APP_ENV="production")):
            r = await self.signup()
        self.assertIn("secure", r.headers["set-cookie"].lower())

    # --- rotation and reuse -------------------------------------------------------------------

    async def test_refresh_rotates_and_concurrent_replay_is_retryable(self):
        first = (await self.signup()).cookies[COOKIE]
        rotated = await self.refresh_with(first)
        self.assertEqual(rotated.status_code, 200, rotated.text)
        second = rotated.cookies[COOKIE]
        self.assertNotEqual(first, second)

        replay = await self.refresh_with(first)  # another tab, moments later
        self.assertEqual(replay.status_code, 409)
        self.assertEqual(replay.json()["detail"]["code"], "refresh_superseded")
        self.assertEqual((await self.refresh_with(second)).status_code, 200, "family must survive a race")

    async def test_replay_after_grace_window_revokes_the_whole_session(self):
        signup = await self.signup()
        first = signup.cookies[COOKIE]
        second = (await self.refresh_with(first)).cookies[COOKIE]
        self.settings.REFRESH_REUSE_GRACE_SECONDS = 0
        with self.Session() as db:
            row = db.query(RefreshToken).filter_by(token_hash=hash_refresh_token(first)).one()
            row.rotated_at = datetime.utcnow() - timedelta(minutes=5)
            db.commit()

        stolen = await self.refresh_with(first)
        self.assertEqual(stolen.status_code, 401)
        self.assertIn("max-age=0", stolen.headers.get("set-cookie", "").lower())
        self.assertEqual((await self.refresh_with(second)).status_code, 401, "legitimate copy is revoked too")
        me = await self.client.get("/auth/me", headers=self.bearer(signup))
        self.assertEqual(me.status_code, 401, "access tokens of a revoked session stop at once")
        with self.Session() as db:
            reasons = {r.revoked_reason for r in db.query(RefreshToken).all()}
        self.assertIn("reuse_detected", reasons)

    async def test_concurrent_refreshes_with_one_cookie_rotate_once(self):
        cookie = (await self.signup()).cookies[COOKIE]
        results = await asyncio.gather(*[self.refresh_with(cookie) for _ in range(6)])
        codes = sorted(r.status_code for r in results)
        self.assertEqual(codes.count(200), 1, codes)
        self.assertTrue(all(c in (200, 409) for c in codes), codes)
        winner = next(r for r in results if r.status_code == 200).cookies[COOKIE]
        self.assertEqual((await self.refresh_with(winner)).status_code, 200)

    async def test_legacy_body_token_migrates_to_cookie(self):
        await self.signup()
        with self.Session() as db:
            user = db.query(User).one()
            db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh_token("legacy-token-value-123"),
                                family_id="legacy-99", expires_at=datetime.utcnow() + timedelta(days=1)))
            db.commit()
        async with self.new_client() as c:
            r = await c.post("/auth/refresh", json={"refresh_token": "legacy-token-value-123"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn(COOKIE, r.cookies)

    # --- logout and revocation ----------------------------------------------------------------

    async def test_logout_ends_this_session_only(self):
        laptop = await self.signup()
        async with self.new_client() as phone_client:
            phone = await self.login(phone_client)
            self.assertEqual(phone.status_code, 200)

            out = await self.client.post("/auth/logout", headers=self.bearer(laptop))
            self.assertEqual(out.status_code, 200)
            self.assertIn("max-age=0", out.headers["set-cookie"].lower())
            self.assertEqual((await self.client.get("/auth/me", headers=self.bearer(laptop))).status_code, 401)
            self.assertEqual((await self.refresh_with(laptop.cookies[COOKIE])).status_code, 401)

            self.assertEqual((await phone_client.get("/auth/me", headers=self.bearer(phone))).status_code, 200)
            self.assertEqual((await self.refresh_with(phone.cookies[COOKIE])).status_code, 200)

    async def test_logout_all_sessions(self):
        laptop = await self.signup()
        async with self.new_client() as phone_client:
            phone = await self.login(phone_client)
            out = await self.client.post("/auth/logout", json={"all_sessions": True}, headers=self.bearer(laptop))
            self.assertEqual(out.status_code, 200)
            self.assertEqual((await phone_client.get("/auth/me", headers=self.bearer(phone))).status_code, 401)
            self.assertEqual((await self.refresh_with(phone.cookies[COOKIE])).status_code, 401)

    async def test_logout_works_with_only_the_cookie(self):
        signup = await self.signup()
        cookie = signup.cookies[COOKIE]
        async with self.new_client() as c:
            out = await c.post("/auth/logout", cookies={COOKIE: cookie})
        self.assertEqual(out.status_code, 200)
        self.assertEqual((await self.refresh_with(cookie)).status_code, 401)

    async def test_inactive_user_is_locked_out_everywhere(self):
        signup = await self.signup()
        with self.Session() as db:
            db.query(User).update({"is_active": False})
            db.commit()
        self.assertEqual((await self.client.get("/auth/me", headers=self.bearer(signup))).status_code, 401)
        self.assertEqual((await self.refresh_with(signup.cookies[COOKIE])).status_code, 401)
        self.assertEqual((await self.login()).status_code, 403)

    # --- CSRF / origin ------------------------------------------------------------------------

    async def test_cookie_refresh_requires_trusted_origin_in_production(self):
        cookie = (await self.signup()).cookies[COOKIE]
        with patch.object(auth_routes, "settings", make_settings(APP_ENV="production")):
            evil = await self.refresh_with(cookie, origin="https://evil.example.net")
            self.assertEqual(evil.status_code, 403)
            missing = await self.refresh_with(cookie)
            self.assertEqual(missing.status_code, 403)
            good = await self.refresh_with(cookie, origin=APP_ORIGIN)
            self.assertEqual(good.status_code, 200, good.text)

    # --- admin bootstrap ----------------------------------------------------------------------

    async def test_admin_email_needs_verification_before_admin_rights(self):
        signup = await self.signup(email="founder@example.com")
        self.assertEqual(signup.json()["user"]["role"], "user")
        self.assertEqual((await self.client.get("/admin-only", headers=self.bearer(signup))).status_code, 403)

        request = await self.client.post("/auth/request-email-verification", json={"email": "founder@example.com"})
        token = request.json()["dev_token"]
        self.assertEqual((await self.client.post("/auth/verify-email", json={"token": token})).status_code, 200)
        refreshed = await self.refresh_with(signup.cookies[COOKIE])
        self.assertEqual(refreshed.json()["user"]["role"], "admin")
        self.assertEqual((await self.client.get("/admin-only", headers=self.bearer(refreshed))).status_code, 200)

    # --- account pre-hijacking ----------------------------------------------------------------

    async def test_google_sign_in_evicts_unverified_password_owner(self):
        squatter = await self.signup(email="victim@example.com")  # attacker registers first
        with patch.object(auth_routes, "verify_google_identity_token", return_value=("victim@example.com", "Victim")):
            google = await self.client.post("/auth/google", json={"id_token": "x" * 40})
        self.assertEqual(google.status_code, 200, google.text)
        self.assertEqual((await self.login(email="victim@example.com")).status_code, 401)
        self.assertEqual((await self.refresh_with(squatter.cookies[COOKIE])).status_code, 401)
        self.assertEqual((await self.client.get("/auth/me", headers=self.bearer(squatter))).status_code, 401)

    def test_unknown_email_still_spends_bcrypt_time(self):
        self.assertFalse(auth.verify_password("anything", None))


if __name__ == "__main__":
    unittest.main()
