"""Evidence levels, the readiness score and the return metric. No provider traffic."""
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from uuid import uuid4

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import create_access_token
from database import Base, get_db
from models import InterviewSession, User
from routers.admin_routes import interview_return_metrics
from routers.interview_routes import router
from services import interview_provider as provider
from services.readiness import DIMENSIONS, readiness


def levels(**given):
    return {"dimensions": [{"dimension": d, "turn_id": "", "quote": "", "level": given.get(d, "not_assessed")}
                           for d in DIMENSIONS]}


class ReadinessScoreTest(unittest.TestCase):
    def test_fixed_arithmetic_over_assessed_dimensions(self):
        result = readiness(levels(motivation="strong", work_experience="partial", communication="strong"))
        self.assertEqual((result["status"], result["score"], result["assessed"]), ("full", 83, 3))
        self.assertEqual(readiness(levels(motivation="strong", work_experience="strong", academics="strong",
                                          projects="strong", communication="strong"))["score"], 100)
        self.assertEqual(readiness(levels(motivation="missing", work_experience="missing", communication="missing"))["score"], 0)
        # 100 * 1 / 8 = 12.5 rounds half up, never banker's rounding.
        self.assertEqual(readiness(levels(motivation="partial", work_experience="missing", academics="missing",
                                          communication="missing"))["score"], 13)

    def test_same_levels_same_score(self):
        report = levels(motivation="partial", projects="strong", communication="partial")
        self.assertEqual(readiness(report), readiness(json.loads(json.dumps(report))))

    def test_thin_interview_is_partial_without_a_number(self):
        result = readiness(levels(motivation="strong", communication="partial"))
        self.assertEqual((result["status"], result["score"]), ("partial", None))

    def test_no_levels_no_score(self):
        self.assertIsNone(readiness(None))
        self.assertIsNone(readiness({"summary": "pre-v12 debrief"}))
        self.assertIsNone(readiness(levels()))


class DimensionEvidenceTest(unittest.TestCase):
    transcript = [{"id": "a1", "role": "user", "text": "I chose an MBA to move from engineering into product strategy."},
                  {"id": "a2", "role": "user", "text": "I led the migration and cut costs by 20%."}]

    def report(self, dimensions):
        base = provider.demo_feedback(self.transcript)
        return {**base, "dimensions": dimensions}

    def test_unbacked_level_becomes_not_assessed(self):
        result = provider.validate_feedback(self.report([
            {"dimension": "motivation", "turn_id": "a1", "quote": "move from engineering into product strategy", "level": "strong"},
            {"dimension": "work_experience", "turn_id": "a2", "quote": "I led a team of 40", "level": "strong"},
            {"dimension": "academics", "turn_id": "", "quote": "", "level": "missing"},
            {"dimension": "projects", "turn_id": "", "quote": "", "level": "not_assessed"},
            {"dimension": "communication", "turn_id": "a2", "quote": "“I led the migration”", "level": "partial"},
        ]), self.transcript)
        by_name = {d["dimension"]: d for d in result["dimensions"]}
        self.assertEqual(by_name["motivation"]["quote"], "move from engineering into product strategy")
        self.assertEqual(by_name["work_experience"]["level"], "not_assessed")
        self.assertEqual(by_name["academics"]["level"], "not_assessed")
        self.assertEqual(by_name["communication"]["quote"], "I led the migration")
        self.assertEqual(result["dropped_levels"], 2)
        self.assertEqual([d["dimension"] for d in result["dimensions"]], list(DIMENSIONS))

    def test_duplicates_keep_first_and_fill_missing(self):
        quote = {"turn_id": "a1", "quote": "I chose an MBA"}
        result = provider.validate_feedback(self.report(
            [{"dimension": "motivation", **quote, "level": "partial"}] +
            [{"dimension": "motivation", **quote, "level": "strong"}] * 4), self.transcript)
        self.assertEqual([d["level"] for d in result["dimensions"]], ["partial"] + ["not_assessed"] * 4)

    def test_demo_debrief_never_scores(self):
        self.assertIsNone(readiness(provider.validate_feedback(provider.demo_feedback(self.transcript), self.transcript)))


class ReadinessApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/t.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(id=1, email="one@example.com", name="One", is_active=True),
                        User(id=2, email="two@example.com", name="Two", is_active=True),
                        User(id=3, email="three@example.com", name="Three", is_active=True)])
            db.commit()

        def test_db():
            with self.Session() as db:
                yield db
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self):
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    def add(self, user_id, days_ago, status="completed", feedback=None):
        with self.Session() as db:
            db.add(InterviewSession(id=str(uuid4()), user_id=user_id, create_request_id=str(uuid4()), create_fingerprint="x",
                                    context_json="{}", provider="openai", mode="chat", question_limit=5, status=status,
                                    feedback_json=json.dumps(feedback) if feedback else None,
                                    created_at=datetime.utcnow() - timedelta(days=days_ago)))
            db.commit()

    async def test_history_carries_readiness_and_count(self):
        self.add(1, 2, feedback=levels(motivation="strong", work_experience="partial", communication="strong"))
        self.add(1, 1, status="active")
        result = await self.client.get("/interviews/sessions",
                                       headers={"Authorization": "Bearer " + create_access_token({"sub": "1"})})
        self.assertEqual(result.status_code, 200, result.text)
        body = result.json()
        self.assertEqual(body["completed_count"], 1)
        self.assertIsNone(body["items"][0]["readiness"])
        self.assertEqual(body["items"][1]["readiness"]["score"], 83)
        self.assertNotIn("feedback", body["items"][1])

    def test_return_metric(self):
        self.add(1, 20); self.add(1, 16); self.add(1, 2)   # returned within 7 days, 3 interviews
        self.add(2, 30); self.add(2, 10)                   # came back, but after 20 days
        self.add(3, 3)                                     # too recent to count
        self.add(3, 1, status="active")                    # unfinished interviews never count
        with self.Session() as db:
            metrics = interview_return_metrics(db, datetime.utcnow())
        self.assertEqual(metrics, {"interviews_completed": 6, "interview_users": 3, "interviews_per_user": 2.0,
                                   "users_3plus_interviews": 1, "return_7d_eligible_users": 2, "return_7d_rate": 50.0})


class RescoreSummaryTest(unittest.TestCase):
    def test_agreement_and_gaps(self):
        from evals.r07.runner import rescore_summary

        def run(**given):
            report = levels(**given)
            return {"dimensions": report["dimensions"], "dropped_levels": 0, "readiness": readiness(report)}
        full = dict(motivation="strong", work_experience="partial", communication="strong")
        rows = [{"profile_id": "p1", "runs": [run(**full), run(**{**full, "work_experience": "strong"})]},
                {"profile_id": "p2", "runs": [run(motivation="partial"), None]}]
        summary = rescore_summary(rows)
        self.assertEqual((summary["complete_pairs"], summary["level_agreement"], summary["score_gaps"]), (1, 0.8, [17]))
        self.assertEqual(summary["failed_debriefs"], 1)
