"""Admin Users tab: the furthest step each account reached, read from existing rows. No provider calls."""
import tempfile
import unittest
from datetime import datetime

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import create_access_token
from database import Base, get_db
from models import InterviewOperation, InterviewSession, RefreshToken, ResumeQuestionSet, User
from routers.admin_routes import router

NOV = lambda day, hour=10: datetime(2026, 11, day, hour)  # noqa: E731


def session(sid, user_id, status="active", kind="full", updated=None):
    return InterviewSession(id=sid, user_id=user_id, create_request_id=sid, create_fingerprint="f", context_json="{}",
                            provider="mock", mode="text", question_limit=3, status=status, kind=kind,
                            created_at=NOV(5), updated_at=updated or NOV(5))


def operation(oid, sid, kind, status, day):
    return InterviewOperation(id=oid, session_id=sid, request_id=oid, kind=kind, fingerprint="f", status=status, created_at=NOV(day))


def token(user_id, n, day, hour=10):
    return RefreshToken(user_id=user_id, token_hash=f"hash-{user_id}-{n}", family_id="fam", expires_at=NOV(28), created_at=NOV(day, hour))


class UserProgressTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/progress.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([
                User(id=1, name="Test", email="admin@example.test", role="admin", is_active=True, email_verified=True, created_at=NOV(1)),
                User(id=2, name="Test", email="new@example.test", role="user", is_active=True, email_verified=False, created_at=NOV(2)),
                User(id=3, name="Test", email="verified@example.test", role="user", is_active=True, email_verified=True, created_at=NOV(3)),
                User(id=4, name="Test", email="resume@example.test", role="user", is_active=True, email_verified=True, created_at=NOV(4)),
                User(id=5, name="Test", email="midway@example.test", role="user", is_active=True, email_verified=True, created_at=NOV(5)),
                User(id=6, name="Test", email="done@example.test", role="user", is_active=True, email_verified=True, created_at=NOV(6)),
                User(id=7, name="Test", email="stuck@example.test", role="user", is_active=True, email_verified=True, created_at=NOV(7)),
            ])
            db.flush()
            # 4: one résumé build worked, one failed.
            db.add_all([ResumeQuestionSet(id="r1", user_id=4, request_id="r1", fingerprint="f", context_json="{}", status="completed", created_at=NOV(4, 12)),
                        ResumeQuestionSet(id="r2", user_id=4, request_id="r2", fingerprint="f", context_json="{}", status="failed", created_at=NOV(4, 13))])
            # 5: two answers landed, never finished; seen on three different days (two refreshes on the same day).
            db.add(session("s5", 5))
            db.add_all([operation("o1", "s5", "answer", "succeeded", 5), operation("o2", "s5", "answer", "succeeded", 5),
                        operation("o3", "s5", "answer", "failed", 5), operation("o4", "s5", "transcribe", "succeeded", 5)])
            db.add_all([token(5, 1, 5), token(5, 2, 5, 11), token(5, 3, 8), token(5, 4, 11)])
            # 6: finished a taster with no résumé questions at all.
            db.add(session("s6", 6, status="completed", kind="taster", updated=NOV(6, 15)))
            db.add(operation("o5", "s6", "answer", "succeeded", 6))
            # 7: started an interview, the only answer failed.
            db.add(session("s7", 7))
            db.add(operation("o6", "s7", "answer", "failed", 7))
            db.commit()

        def get_test_db():
            with self.Session() as db:
                yield db
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_db] = get_test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://testserver")
        self.headers = {"Authorization": "Bearer " + create_access_token({"sub": "1"})}

    async def asyncTearDown(self):
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def rows(self):
        response = await self.client.get("/admin/users", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        return {row["id"]: row for row in response.json()}

    async def test_each_account_reports_the_furthest_step_it_reached(self):
        rows = await self.rows()
        self.assertEqual({uid: row["furthest_step"] for uid, row in rows.items() if uid != 1},
                         {2: "signed_up", 3: "verified", 4: "resume_questions", 5: "interview_answered",
                          6: "interview_completed", 7: "interview_started"})

    async def test_dates_and_counts(self):
        rows = await self.rows()
        self.assertTrue(rows[2]["furthest_step_at"].startswith("2026-11-02"))          # signed up: the account date
        self.assertIsNone(rows[3]["furthest_step_at"])                                   # the verify click has no timestamp
        self.assertTrue(rows[4]["furthest_step_at"].startswith("2026-11-04T12"))        # first successful résumé build
        self.assertEqual((rows[4]["resume_ok"], rows[4]["resume_failed"]), (1, 1))
        self.assertEqual((rows[5]["answers_given"], rows[5]["interviews_started"], rows[5]["interviews_completed"]), (2, 1, 0))
        self.assertTrue(rows[6]["furthest_step_at"].startswith("2026-11-06T15"))        # when the interview finished
        self.assertEqual((rows[6]["resume_ok"], rows[6]["answers_given"]), (0, 1))      # the taster needs no résumé
        self.assertEqual((rows[7]["answers_given"], rows[7]["interviews_started"]), (0, 1))  # a failed answer is not progress

    async def test_return_visits_come_from_refresh_token_days(self):
        rows = await self.rows()
        self.assertEqual(rows[5]["active_days"], 3)                                       # four tokens, three distinct days
        self.assertTrue(rows[5]["last_seen_at"].startswith("2026-11-11"))
        self.assertEqual((rows[2]["active_days"], rows[2]["last_seen_at"]), (0, None))

    async def test_one_set_of_queries_however_many_users(self):
        from sqlalchemy import event
        count = 0

        def tick(*_):
            nonlocal count
            count += 1
        event.listen(self.engine, "before_cursor_execute", tick)
        await self.rows()
        with_seven = count
        with self.Session() as db:
            db.add_all([User(id=100 + n, name="Test", email=f"x{n}@example.test", role="user", is_active=True, created_at=NOV(9)) for n in range(5)])
            db.commit()
        count = 0
        await self.rows()
        self.assertEqual(count, with_seven)


if __name__ == "__main__":
    unittest.main()
