"""Signed-out "try one question": every rejection is free, spend stays inside the anon pool, nothing about the visitor is kept."""
import os
import tempfile
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from models import AdminEvent, AiCostEntry, AiRuntimeConfig, AiSpendCounter, InterviewSession, User
from routers import public_try_routes as routes
from services import ai_costs, rate_limit
from services import interview_provider as provider

ANSWER = "I led a team of six engineers at a logistics startup and I want an MBA to move from operations into strategy."
QUOTE = "led a team of six engineers"
USAGE = {"model": "gpt-4.1-mini", "input_tokens": 2200, "output_tokens": 80}


def settings(**changes):
    base = dict(ANON_TRY_ENABLED=True, TURNSTILE_SITE_KEY="", TURNSTILE_SECRET_KEY="", is_production_like_env=False)
    return SimpleNamespace(**{**base, **changes})


def model_question(**changes):
    return {"question": "You led six engineers. What exactly did you decide yourself?", "kind": "follow_up",
            "topic": "experience", "anchor_turn_id": "a1", "anchor_quote": QUOTE, "conflict": "", **changes}


class PublicTryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limit._memory.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/test.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add(User(id=1, email="one@example.com", name="One", is_active=True))
            db.commit()

        def test_db():
            with self.Session() as db:
                yield db
        app = FastAPI()
        app.include_router(routes.router)
        app.dependency_overrides[get_db] = test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        self.enforce_burst = False
        real_limited = routes.limited
        patches = [
            patch.object(routes, "get_settings", side_effect=lambda: self.cfg),
            patch.object(routes, "limited", side_effect=lambda request, db, action, *a: (
                real_limited(request, db, action, *a) if action != "try-burst" or self.enforce_burst else None)),
            patch.object(provider, "live_available", return_value=True),
            # A missed mock must fail rather than send a paid request.
            patch("httpx.Client.post", side_effect=AssertionError("Unexpected external request")),
            patch.dict(os.environ, {"AI_ANON_DAILY_CAP_PAISE": "1000"}),
        ]
        self.cfg = settings()
        for item in patches:
            item.start()
        self.patches = patches
        self.next_question = patch.object(provider, "next_question", return_value=(model_question(), USAGE))
        self.model = self.next_question.start()

    async def asyncTearDown(self):
        self.next_question.stop()
        for item in reversed(self.patches):
            item.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def post(self, **changes):
        body = {"question_id": "motivation", "answer": ANSWER, "request_id": str(uuid4()), "turnstile_token": "", "website": "",
                "source": "practice", **changes}
        return await self.client.post("/public/try/follow-up", json=body)

    def rows(self, model):
        with self.Session() as db:
            return db.query(model).all()

    def counter(self, scope):
        with self.Session() as db:
            row = db.get(AiSpendCounter, f"{scope}:{datetime.utcnow().date().isoformat()}")
            return (row.committed_paise, row.in_flight) if row else (0, 0)

    def assertNoSpend(self):
        self.model.assert_not_called()
        self.assertEqual(self.rows(AiCostEntry), [])

    # status
    async def test_status_reports_availability_and_the_fixed_question(self):
        self.cfg = settings(TURNSTILE_SITE_KEY="site-key")
        body = (await self.client.get("/public/try/status")).json()
        self.assertTrue(body["available"])
        self.assertEqual(body["turnstile_site_key"], "site-key")
        self.assertEqual(body["question"]["id"], "motivation")
        self.assertEqual((body["min_chars"], body["max_chars"]), (40, 1200))

    async def test_status_is_unavailable_behind_every_kill_switch(self):
        cases = [("flag off", lambda: setattr(self, "cfg", settings(ANON_TRY_ENABLED=False))),
                 ("production without turnstile", lambda: setattr(self, "cfg", settings(is_production_like_env=True))),
                 ("production with only a site key", lambda: setattr(self, "cfg", settings(is_production_like_env=True, TURNSTILE_SITE_KEY="k"))),
                 ("cap zero", lambda: os.environ.__setitem__("AI_ANON_DAILY_CAP_PAISE", "0")),
                 ("admin ai switch", lambda: self.admin_ai_off())]
        for name, apply in cases:
            with self.subTest(name):
                self.cfg = settings()
                os.environ["AI_ANON_DAILY_CAP_PAISE"] = "1000"
                with self.Session() as db:
                    db.query(AiRuntimeConfig).delete()
                    db.commit()
                apply()
                body = (await self.client.get("/public/try/status")).json()
                self.assertFalse(body["available"])
                self.assertIsNone(body["question"])
                self.assertIsNone(body["turnstile_site_key"])
                rate_limit._memory.clear()

    def admin_ai_off(self):
        with self.Session() as db:
            db.add(AiRuntimeConfig(ai_enabled=False))
            db.commit()

    async def test_provider_not_connected_means_unavailable(self):
        with patch.object(provider, "live_available", return_value=False):
            self.assertFalse((await self.client.get("/public/try/status")).json()["available"])
            self.assertEqual((await self.post()).status_code, 503)
        self.assertNoSpend()

    # the happy path
    async def test_follow_up_quotes_the_answer_and_spends_only_from_the_anon_pool(self):
        response = await self.post(source="school:chicago-booth")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertIn(body["quote"], ANSWER)
        self.assertFalse(body["fallback"])
        self.assertIn("six engineers", body["follow_up"])
        entry, = self.rows(AiCostEntry)
        self.assertIsNone(entry.user_id)
        self.assertEqual((entry.operation, entry.status), ("anon_follow_up", "settled"))
        anon, global_ = self.counter("anon"), self.counter("global")
        self.assertEqual(anon, global_)
        self.assertEqual(anon[0], entry.actual_paise)
        self.assertEqual(anon[1], 0)
        self.assertEqual(self.rows(InterviewSession), [])
        event, = self.rows(AdminEvent)
        self.assertIsNone(event.user_id)
        self.assertIn("school:chicago-booth", event.payload_json)

    async def test_nothing_the_visitor_wrote_is_stored(self):
        await self.post()
        for table in Base.metadata.sorted_tables:
            with self.engine.connect() as conn:
                for row in conn.execute(table.select()).fetchall():
                    self.assertNotIn("six engineers", repr(tuple(row)), table.name)

    # free rejections
    async def test_rejections_cost_nothing_and_never_reach_the_model(self):
        cases = {"too short": {"answer": "I like business a lot."},
                 "too long": {"answer": ("I managed projects. " * 100)[:1201]},
                 "gibberish": {"answer": "asdf qwer zxcv " * 5},
                 "honeypot": {"website": "http://spam.example"},
                 "stop request": {"answer": "Can we please stop the interview here, I have no interest in this at all."}}
        for name, changes in cases.items():
            with self.subTest(name):
                self.assertEqual((await self.post(**changes)).status_code, 422)
                self.assertIsInstance((await self.post(**changes)).json()["detail"], str)
        for bad in ({"question_id": "free-text"}, {"source": "https://evil.example"}, {"extra": 1}):
            with self.subTest(bad):
                self.assertEqual((await self.post(**bad)).status_code, 422)
        self.assertNoSpend()

    async def test_disabled_endpoint_rejects_before_any_work(self):
        self.cfg = settings(ANON_TRY_ENABLED=False)
        self.assertEqual((await self.post()).status_code, 503)
        self.assertNoSpend()

    # limits
    async def test_burst_limit(self):
        self.enforce_burst = True
        self.assertEqual((await self.post()).status_code, 200)
        second = await self.post()
        self.assertEqual(second.status_code, 429)
        self.assertIn("wait a few seconds", second.json()["detail"])
        self.assertEqual(self.model.call_count, 1)

    async def test_three_tries_a_day_per_address(self):
        for _ in range(3):
            self.assertEqual((await self.post()).status_code, 200)
        fourth = await self.post()
        self.assertEqual(fourth.status_code, 429)
        self.assertIn("free tries", fourth.json()["detail"])
        self.assertEqual(self.model.call_count, 3)

    async def test_anon_cap_denies_without_a_model_call_and_leaves_signed_in_users_alone(self):
        os.environ["AI_ANON_DAILY_CAP_PAISE"] = "20"
        response = await self.post()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["x-ai-limit"], "anon_daily_cap")
        self.assertNoSpend()
        with self.Session() as db:
            ai_costs.reserve(db, user_id=1, operation="test", model="gpt-4.1-mini", input_units=1000, output_units=100)
            db.commit()

    async def test_anon_spend_also_counts_against_the_global_cap(self):
        os.environ["AI_GLOBAL_DAILY_CAP_PAISE"] = "20"
        response = await self.post()
        self.assertEqual((response.status_code, response.headers["x-ai-limit"]), (503, "global_daily_cap"))
        self.assertNoSpend()
        self.assertEqual(self.counter("anon"), (0, 0))  # the anon increment rolled back with the denial

    # turnstile
    async def test_turnstile_gate(self):
        self.cfg = settings(is_production_like_env=True, TURNSTILE_SITE_KEY="site", TURNSTILE_SECRET_KEY="secret")
        self.assertEqual((await self.post()).status_code, 400)  # no token
        verify = MagicMock(status_code=200)
        verify.json.return_value = {"success": False}
        with patch("httpx.Client.post", return_value=verify):
            self.assertEqual((await self.post(turnstile_token="bad")).status_code, 400)
        with patch("httpx.Client.post", side_effect=httpx.ConnectError("down")):
            self.assertEqual((await self.post(turnstile_token="x")).status_code, 503)
        self.assertNoSpend()
        verify.json.return_value = {"success": True}
        with patch("httpx.Client.post", return_value=verify) as post:
            self.assertEqual((await self.post(turnstile_token="good")).status_code, 200)
        self.assertEqual(post.call_args.kwargs["data"], {"secret": "secret", "response": "good"})

    # model outcomes
    async def test_one_regrounding_retry_then_a_fixed_question(self):
        failure = provider.ProviderFailure("incomplete", billing="charged", usage=USAGE)
        self.model.side_effect = [failure, (model_question(), USAGE)]
        body = (await self.post()).json()
        self.assertFalse(body["fallback"])
        self.assertEqual(self.model.call_count, 2)
        self.assertEqual([e.status for e in self.rows(AiCostEntry)], ["settled", "settled"])
        self.model.reset_mock()
        self.model.side_effect = [failure, failure, failure]
        body = (await self.post()).json()
        self.assertTrue(body["fallback"])
        self.assertIsNone(body["quote"])
        self.assertEqual(self.model.call_count, 2)

    async def test_unusable_output_falls_back_without_another_call(self):
        for text in ("Email me at someone@example.com and tell me what you decided yourself.",
                     "See https://example.com for the details of what you decided yourself, please.", "x" * 301):
            with self.subTest(text[:20]):
                self.model.reset_mock()
                self.model.return_value = (model_question(question=text), USAGE)
                body = (await self.post()).json()
                self.assertTrue(body["fallback"])
                self.assertNotIn(text, body["follow_up"])
                self.assertEqual(self.model.call_count, 1)
                rate_limit._memory.clear()

    async def test_off_topic_answers_are_asked_again(self):
        self.model.return_value = (model_question(kind="off_topic"), USAGE)
        self.assertEqual((await self.post()).status_code, 422)

    async def test_a_quote_that_is_not_in_the_answer_is_dropped(self):
        self.model.return_value = (model_question(anchor_quote="a phrase nobody wrote"), USAGE)
        self.assertIsNone((await self.post()).json()["quote"])

    async def test_provider_failures_close_the_ledger_correctly(self):
        self.model.side_effect = provider.ProviderFailure("unreachable", code="provider_unreachable")
        self.assertEqual((await self.post()).status_code, 503)
        self.assertEqual([e.status for e in self.rows(AiCostEntry)], ["released"])
        self.assertEqual(self.counter("anon"), (0, 0))
        self.model.side_effect = provider.ProviderFailure("timeout", code="provider_timeout", billing="unknown")
        self.assertEqual((await self.post()).status_code, 503)
        self.assertEqual(sorted(e.status for e in self.rows(AiCostEntry)), ["released", "unknown"])
        committed, in_flight = self.counter("anon")
        self.assertGreater(committed, 0)  # an unknown outcome stays counted
        self.assertEqual(in_flight, 0)
        with self.Session() as db:
            self.assertTrue(ai_costs.reconcile(db, datetime.utcnow().date())["balanced"])

    async def test_ledger_stays_balanced_across_outcomes(self):
        self.model.side_effect = [(model_question(), USAGE), provider.ProviderFailure("x", billing="charged", usage=USAGE),
                                  provider.ProviderFailure("x", billing="charged", usage=USAGE)]
        for _ in range(2):
            self.assertEqual((await self.post()).status_code, 200)
        with self.Session() as db:
            report = ai_costs.reconcile(db, datetime.utcnow().date())
        self.assertTrue(report["balanced"], report)


if __name__ == "__main__":
    unittest.main()
