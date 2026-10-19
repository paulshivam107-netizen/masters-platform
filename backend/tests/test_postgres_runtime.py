"""R02: PostgreSQL behaviour under the restricted runtime role.

Skipped unless TEST_POSTGRES_ADMIN_URL points at a disposable PostgreSQL server where the
given user may create databases, e.g.

  TEST_POSTGRES_ADMIN_URL=postgresql://postgres:secret@127.0.0.1:5432/postgres

Each run creates and drops its own database. No real applicant data is involved.
"""
import asyncio
import os
import sys
import threading
import unittest
import uuid
from datetime import date, timedelta
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, pool, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from database import get_db  # noqa: E402
from models import InterviewQuota, InterviewSession, User  # noqa: E402
from services.schema import migrate_to_head, schema_drift  # noqa: E402

ADMIN_URL = os.environ.get("TEST_POSTGRES_ADMIN_URL")
RUNTIME_ROLE = "app_runtime_test"
RUNTIME_PASSWORD = "runtime-test-password-" + uuid.uuid4().hex


@unittest.skipUnless(ADMIN_URL, "set TEST_POSTGRES_ADMIN_URL to run PostgreSQL runtime tests")
class PostgresRuntimeTest(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        import db_roles

        cls.db_name = "masters_test_" + uuid.uuid4().hex[:10]
        admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool)
        with admin.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{cls.db_name}"'))
        admin.dispose()

        owner_url = make_url(ADMIN_URL).set(database=cls.db_name)
        cls.owner_engine = create_engine(owner_url, poolclass=pool.NullPool)
        cls.status = migrate_to_head(cls.owner_engine)

        conn = db_roles.connect(owner_url.render_as_string(hide_password=False))
        try:
            db_roles.apply_runtime_role(conn, RUNTIME_ROLE, RUNTIME_PASSWORD)
        finally:
            conn.close()

        cls.runtime_url = owner_url.set(username=RUNTIME_ROLE, password=RUNTIME_PASSWORD)
        cls.runtime_engine = create_engine(cls.runtime_url, pool_size=10, max_overflow=10)
        cls.Session = sessionmaker(bind=cls.runtime_engine)

    @classmethod
    def tearDownClass(cls):
        cls.runtime_engine.dispose()
        cls.owner_engine.dispose()
        admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool)
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{cls.db_name}" WITH (FORCE)'))
            conn.execute(text(f'DROP ROLE IF EXISTS "{RUNTIME_ROLE}"'))
        admin.dispose()

    async def asyncSetUp(self):
        from routers.application_routes import router as application_router
        from routers.auth_routes import router as auth_router
        from routers.essay_routes import router as essay_router
        from routers.interview_routes import router as interview_router
        from services.rate_limit import reset_rate_limits

        reset_rate_limits(self.runtime_engine)

        def runtime_db():
            with self.Session() as db:
                yield db

        app = FastAPI()
        for router in (auth_router, application_router, essay_router, interview_router):
            app.include_router(router)
        app.dependency_overrides[get_db] = runtime_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def account(self):
        email = f"pg-{uuid.uuid4().hex[:10]}@example.com"
        response = await self.client.post("/auth/signup", json={
            "email": email, "name": "PG User", "password": "strong-password-123"})
        self.assertEqual(response.status_code, 201, response.text)
        return {"Authorization": "Bearer " + response.json()["access_token"]}

    # --- schema & privileges -------------------------------------------------

    def test_migrated_schema_matches_models(self):
        self.assertTrue(self.status.is_current)
        self.assertEqual(schema_drift(self.owner_engine), [])

    def test_runtime_role_has_no_elevated_attributes_and_reapply_strips_them(self):
        import db_roles

        flags = text("SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls "
                     "FROM pg_roles WHERE rolname = :r")
        with self.owner_engine.begin() as conn:
            self.assertEqual(tuple(conn.execute(flags, {"r": RUNTIME_ROLE}).one()), (False,) * 5)
            conn.execute(text(f'ALTER ROLE "{RUNTIME_ROLE}" CREATEDB'))
        owner_url = self.owner_engine.url.render_as_string(hide_password=False)
        conn = db_roles.connect(owner_url)
        try:
            db_roles.apply_runtime_role(conn, RUNTIME_ROLE, RUNTIME_PASSWORD)
        finally:
            conn.close()
        with self.owner_engine.connect() as conn:
            self.assertEqual(tuple(conn.execute(flags, {"r": RUNTIME_ROLE}).one()), (False,) * 5)

    def test_runtime_role_cannot_change_schema(self):
        forbidden = [
            "CREATE TABLE evil (id int)",
            "ALTER TABLE users ADD COLUMN evil int",
            "DROP TABLE interview_quotas",
            "UPDATE alembic_version SET version_num = '0001'",
            "TRUNCATE users",
        ]
        for statement in forbidden:
            with self.subTest(statement=statement), self.runtime_engine.connect() as conn:
                with self.assertRaises(DBAPIError):
                    conn.execute(text(statement))
        with self.runtime_engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT version_num FROM alembic_version")).scalar(),
                             self.status.head)

    # --- ownership under the real runtime role ---------------------------------

    async def test_account_b_cannot_touch_account_a_data(self):
        a, b = await self.account(), await self.account()
        app = await self.client.post("/applications/", headers=a, json={
            "school_name": "IIM Ahmedabad", "program_name": "PGPX",
            "deadline": str(date.today() + timedelta(days=30))})
        self.assertEqual(app.status_code, 201, app.text)
        app_id = app.json()["id"]
        essay = await self.client.post("/essays/", headers=a, json={
            "school_name": "IIM Ahmedabad", "program_type": "PGPX", "essay_prompt": "Why now?",
            "essay_content": "Private draft that only A should ever see.", "application_id": app_id})
        self.assertEqual(essay.status_code, 200, essay.text)
        essay_id = essay.json()["id"]
        interview = await self.client.post("/interviews/sessions", headers=a, json={
            "request_id": str(uuid.uuid4()), "route": "cat", "provider": "demo"})
        self.assertEqual(interview.status_code, 201, interview.text)
        session_id = interview.json()["id"]

        attempts = [
            ("GET", f"/applications/{app_id}", None),
            ("PUT", f"/applications/{app_id}", {"status": "Submitted"}),
            ("DELETE", f"/applications/{app_id}", None),
            ("GET", f"/essays/{essay_id}", None),
            ("GET", f"/essays/{essay_id}/versions", None),
            ("DELETE", f"/essays/{essay_id}", None),
            ("POST", "/essays/", {"school_name": "XLRI", "program_type": "MBA", "essay_prompt": "Why this school?",
                                  "essay_content": "Trying to attach to A data.", "application_id": app_id}),
            ("POST", "/essays/", {"school_name": "XLRI", "program_type": "MBA", "essay_prompt": "Why this school?",
                                  "essay_content": "Trying to version A essay draft.", "parent_essay_id": essay_id}),
            ("GET", f"/interviews/sessions/{session_id}", None),
            ("GET", f"/interviews/sessions/{session_id}/export", None),
            ("DELETE", f"/interviews/sessions/{session_id}", None),
        ]
        for method, path, body in attempts:
            with self.subTest(method=method, path=path):
                response = await self.client.request(method, path, headers=b, json=body)
                self.assertEqual(response.status_code, 404, response.text)

        for path, key in (("/applications/", app_id), ("/essays/", essay_id)):
            listed = (await self.client.get(path, headers=b)).json()
            self.assertNotIn(key, [item["id"] for item in listed])
        sessions = (await self.client.get("/interviews/sessions", headers=b)).json()
        self.assertNotIn(session_id, str(sessions))

        # A's data is untouched.
        self.assertEqual((await self.client.get(f"/applications/{app_id}", headers=a)).status_code, 200)
        self.assertEqual((await self.client.get(f"/essays/{essay_id}", headers=a)).status_code, 200)
        self.assertEqual((await self.client.get(f"/interviews/sessions/{session_id}", headers=a)).status_code, 200)

    # --- concurrency -----------------------------------------------------------

    def test_concurrent_quota_reservations_never_exceed_cap(self):
        from services.interviews import reserve_quota

        user_id = 900000 + int(uuid.uuid4().int % 1000)
        cap = 5  # resume family cap
        successes, barrier = [], threading.Barrier(20)

        def worker():
            with self.Session() as db:
                barrier.wait()
                try:
                    reserve_quota(db, user_id, "resume")
                    db.commit()
                    successes.append(1)
                except HTTPException:
                    db.rollback()

        threads = [threading.Thread(target=worker) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(successes), cap)
        with self.Session() as db:
            rows = db.query(InterviewQuota).filter(InterviewQuota.id.like(f"resume:user:{user_id}:%")).all()
            self.assertEqual([r.calls for r in rows], [cap])

    async def test_concurrent_duplicate_interview_create_yields_one_session(self):
        headers = await self.account()
        payload = {"request_id": str(uuid.uuid4()), "route": "cat", "provider": "demo"}
        responses = await asyncio.gather(*[
            self.client.post("/interviews/sessions", headers=headers, json=payload) for _ in range(8)])
        self.assertTrue(all(r.status_code == 201 for r in responses), [r.text for r in responses])
        self.assertEqual(len({r.json()["id"] for r in responses}), 1)
        with self.Session() as db:
            count = db.query(InterviewSession).filter_by(create_request_id=payload["request_id"]).count()
        self.assertEqual(count, 1)

    def test_concurrent_first_tasters_insert_only_one(self):
        with self.Session() as db:
            user = User(email=f"taster-{uuid.uuid4().hex[:10]}@example.com", name="Taster", is_active=True)
            db.add(user)
            db.commit()
            user_id = user.id
        successes, conflicts, barrier = [], [], threading.Barrier(8)

        def worker():
            with self.Session() as db:
                db.add(InterviewSession(id=str(uuid.uuid4()), user_id=user_id, create_request_id=str(uuid.uuid4()),
                                        create_fingerprint="x", kind="taster", context_json="{}", provider="openai",
                                        mode="chat", question_limit=3))
                barrier.wait()
                try:
                    db.commit()
                    successes.append(1)
                except IntegrityError:
                    db.rollback()
                    conflicts.append(1)

        threads = [threading.Thread(target=worker) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual((len(successes), len(conflicts)), (1, 7))
        with self.Session() as db:
            db.add(InterviewSession(id=str(uuid.uuid4()), user_id=user_id, create_request_id=str(uuid.uuid4()),
                                    create_fingerprint="x", kind="full", context_json="{}", provider="openai",
                                    mode="chat", question_limit=3))
            db.commit()  # full interviews are not limited by the taster index

    async def test_concurrent_reset_link_use_succeeds_once(self):
        from unittest.mock import patch
        from routers import auth_routes
        from services import auth_flows

        await self.account()
        captured = []
        with patch.object(auth_routes.settings, "EXPOSE_DEV_AUTH_TOKENS", True), \
                patch.object(auth_flows, "send_email_notification",
                             side_effect=lambda **kw: (False, True, "dry run")) as _:
            email = f"reset-{uuid.uuid4().hex[:8]}@example.com"
            await self.client.post("/auth/signup", json={"email": email, "name": "Reset", "password": "strong-password-123"})
            forgot = await self.client.post("/auth/forgot-password", json={"email": email})
            captured.append(forgot.json()["dev_token"])
        token = captured[0]
        responses = await asyncio.gather(*[
            self.client.post("/auth/reset-password", json={"token": token, "new_password": f"new-password-{i:03d}"})
            for i in range(8)])
        self.assertEqual(sorted(r.status_code for r in responses), [200] + [400] * 7)


    async def test_concurrent_cookie_refresh_rotates_exactly_once(self):
        signup = await self.client.post("/auth/signup", json={
            "email": f"tabs-{uuid.uuid4().hex[:8]}@example.com", "name": "Tabs", "password": "strong-password-123"})
        cookie = signup.cookies["masters_refresh"]

        async def refresh():
            async with httpx.AsyncClient(transport=self.client._transport, base_url="http://testserver") as c:
                return await c.post("/auth/refresh", cookies={"masters_refresh": cookie})

        results = await asyncio.gather(*[refresh() for _ in range(8)])
        codes = sorted(r.status_code for r in results)
        self.assertEqual(codes.count(200), 1, codes)
        self.assertTrue(all(code in (200, 409) for code in codes), codes)

    def test_deleting_an_admin_with_ledger_and_catalogue_history_respects_foreign_keys(self):
        """Postgres enforces FKs (SQLite tests do not): deletion must clear every reference."""
        from datetime import date as _date
        from models import AiCostEntry, CatalogCycle, CatalogProgram, CatalogRevision, User
        from services.account_data import delete_account

        with self.Session() as db:
            admin = User(email=f"admin-{uuid.uuid4().hex[:8]}@example.com", name="Admin", role="admin",
                         is_active=True, email_verified=True)
            db.add(admin)
            db.flush()
            slug = "prog-" + uuid.uuid4().hex[:8]
            db.add(CatalogProgram(id=slug, school_name="Example School", program_name="PGP",
                                  degree="MBA", country="India"))
            db.flush()
            cycle = CatalogCycle(program_id=slug, cycle="2026-27")
            db.add(cycle)
            db.flush()
            revision = CatalogRevision(cycle_id=cycle.id, revision_number=1, created_by_user_id=admin.id,
                                       reviewer_user_id=admin.id)
            entry = AiCostEntry(id=str(uuid.uuid4()), user_id=admin.id, day=_date.today(), operation="test",
                                model="m", price_source="default", status="settled", reserved_paise=100,
                                actual_paise=80, resolved_by_user_id=admin.id, note="private note")
            db.add_all([revision, entry])
            db.commit()
            admin_id, revision_id, entry_id = admin.id, revision.id, entry.id

            delete_account(db, db.get(User, admin_id))
            db.commit()

        with self.Session() as db:
            self.assertIsNone(db.get(User, admin_id))
            kept = db.get(CatalogRevision, revision_id)
            self.assertIsNotNone(kept, "catalogue history is kept")
            self.assertIsNone(kept.created_by_user_id)
            self.assertIsNone(kept.reviewer_user_id)
            ledger = db.get(AiCostEntry, entry_id)
            self.assertEqual((ledger.user_id, ledger.note, ledger.actual_paise), (None, None, 80))

if __name__ == "__main__":
    unittest.main()
