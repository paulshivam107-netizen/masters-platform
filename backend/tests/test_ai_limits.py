"""R05: shared throttling, trusted-proxy client IP and AI monetary limits (SQLite; no network).

Cross-worker races against PostgreSQL live in test_postgres_limits.py.
"""
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from auth import create_access_token
from config import get_settings
from database import Base, get_db
from models import AiCostEntry, AiPriceVersion, AiRuntimeConfig, AiSpendCounter, InterviewSession, RateLimitBucket, User
from routers.admin_operations import router as admin_router
from routers.interview_routes import router as interview_router
from routers.resume_routes import router as resume_router
from services import ai_costs, rate_limit
from services import interview_provider as provider


def fake_request(peer="10.0.0.5", forwarded=None):
    headers = [(b"x-forwarded-for", value.encode()) for value in (forwarded or [])]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers, "client": (peer, 1234)})


class SqliteCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/r05.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(id=1, email="one@example.com", name="One", is_active=True),
                        User(id=2, email="two@example.com", name="Two", is_active=True)])
            db.commit()

    def tearDown(self):
        self.engine.dispose()
        self.tmp.cleanup()


class ClientIpTest(unittest.TestCase):
    def test_trusted_proxy_hops_take_rightmost_entries_not_client_supplied_ones(self):
        settings = get_settings()
        with patch.object(settings, "TRUSTED_PROXY_HOPS", 1):
            # The client prepended a fake address; Railway appended the real one.
            self.assertEqual(rate_limit.client_ip(fake_request(forwarded=["1.2.3.4, 198.51.100.7"])), "198.51.100.7")
            self.assertEqual(rate_limit.client_ip(fake_request(forwarded=["1.2.3.4", "198.51.100.7"])), "198.51.100.7")
            self.assertEqual(rate_limit.client_ip(fake_request(forwarded=[])), "unproxied")
            self.assertEqual(rate_limit.client_ip(fake_request(forwarded=["not-an-ip"])), "invalid")
            v6 = rate_limit.client_ip(fake_request(forwarded=["2001:db8:1:2:aaaa::1"]))
            self.assertEqual(v6, "2001:db8:1:2::/64")
        with patch.object(settings, "TRUSTED_PROXY_HOPS", 2):
            self.assertEqual(rate_limit.client_ip(fake_request(forwarded=["6.6.6.6, 203.0.113.9, 10.1.1.1"])), "203.0.113.9")
        with patch.object(settings, "TRUSTED_PROXY_HOPS", 0):
            # Without a trusted proxy, X-Forwarded-For is ignored entirely.
            self.assertEqual(rate_limit.client_ip(fake_request(peer="192.0.2.1", forwarded=["1.2.3.4"])), "192.0.2.1")


class SharedRateLimitTest(SqliteCase):
    def test_limit_is_shared_between_engines_and_survives_restart(self):
        other = create_engine("sqlite:///" + self.tmp.name + "/r05.sqlite", connect_args={"check_same_thread": False})
        try:
            results = [rate_limit.hit("k", limit=4, window_seconds=60, db=(self.engine if i % 2 else other), now=1000.0)
                       for i in range(6)]
        finally:
            other.dispose()
        self.assertEqual([allowed for allowed, _ in results], [True] * 4 + [False] * 2)
        self.assertGreater(results[-1][1], 0)

    def test_previous_window_is_weighted_and_expired_rows_are_purged(self):
        for _ in range(10):
            rate_limit.hit("w", limit=10, window_seconds=100, db=self.engine, now=1050.0)
        # 10% into the next window, 90% of the previous count still applies.
        allowed = [rate_limit.hit("w", limit=10, window_seconds=100, db=self.engine, now=1110.0)[0] for _ in range(3)]
        self.assertEqual(allowed, [True, False, False])
        later = sum(rate_limit.hit("w", limit=10, window_seconds=100, db=self.engine, now=1290.0)[0] for _ in range(12))
        self.assertEqual(later, 10)
        with self.Session() as db:
            stored = [row.id for row in db.query(RateLimitBucket).all()]
        self.assertTrue(all("@" not in key and "example" not in key for key in stored))
        with patch("services.rate_limit.datetime") as clock:
            clock.utcnow.return_value = datetime.utcfromtimestamp(10_000)
            clock.utcfromtimestamp = datetime.utcfromtimestamp
            self.assertGreaterEqual(rate_limit.purge_expired(self.engine), 2)

    def test_layers_block_ip_spraying_and_account_hammering(self):
        request = fake_request(peer="192.0.2.50")
        with self.Session() as db:
            for i in range(10):
                rate_limit.enforce_rate_limit(request, action="t", limit=2, window_seconds=600, email=f"u{i}@example.com", db=db)
            # The address has used its 5x headroom across different mailboxes.
            with self.assertRaises(HTTPException) as denied:
                rate_limit.enforce_rate_limit(request, action="t", limit=2, window_seconds=600, email="new@example.com", db=db)
            self.assertEqual(denied.exception.status_code, 429)
            self.assertIn("Retry-After", denied.exception.headers)
            other_ip = fake_request(peer="192.0.2.51")
            rate_limit.enforce_rate_limit(other_ip, action="t", limit=2, window_seconds=600, email="u0@example.com", db=db)
            with self.assertRaises(HTTPException):  # the mailbox is spent from any address
                rate_limit.enforce_rate_limit(other_ip, action="t", limit=2, window_seconds=600, email="u0@example.com", db=db)

    def test_attempt_is_counted_even_when_request_transaction_rolls_back(self):
        with self.Session() as db:
            for _ in range(2):
                rate_limit.enforce_rate_limit(fake_request(), action="login", limit=2, window_seconds=600, email="x@example.com", db=db)
                db.rollback()  # e.g. a wrong password
            with self.assertRaises(HTTPException):
                rate_limit.enforce_rate_limit(fake_request(), action="login", limit=2, window_seconds=600, email="x@example.com", db=db)


class CostLedgerTest(SqliteCase):
    def reserve(self, db, user_id=1, model="gpt-4.1-mini", units=(10_000, 1_000)):
        return ai_costs.reserve(db, user_id=user_id, operation="test", model=model,
                                input_units=units[0], output_units=units[1])

    def test_integer_price_math_and_price_versions(self):
        price = ai_costs.Price("m", "tokens", "tokens", 3_600, 14_400, 0, "builtin")
        self.assertEqual(price.cost(10_000, 1_000), 51)  # 36 + 14.4 -> ceil 51 paise
        self.assertEqual(price.cost(1, 0), 1)
        with self.Session() as db:
            self.assertEqual(ai_costs.current_price(db, "gpt-4.1-mini").source, "builtin")
            self.assertEqual(ai_costs.current_price(db, "mystery-model").source, "fallback")
            db.add(AiPriceVersion(model="gpt-4.1-mini", version=1, input_unit="tokens", output_unit="tokens",
                                  input_paise_per_million=7_200, output_paise_per_million=28_800, request_paise=0,
                                  effective_from=datetime.utcnow() - timedelta(seconds=1)))
            db.add(AiPriceVersion(model="gpt-4.1-mini", version=2, input_unit="tokens", output_unit="tokens",
                                  input_paise_per_million=1, output_paise_per_million=1, request_paise=0,
                                  effective_from=datetime.utcnow() + timedelta(days=1)))
            db.commit()
            current = ai_costs.current_price(db, "gpt-4.1-mini")
            self.assertEqual((current.source, current.input_paise_per_million), ("database", 7_200))
            entry = self.reserve(db)
            self.assertEqual((entry.reserved_paise, entry.price_version_id), (101, current.version_id))

    def test_synthetic_ledger_reconciles_every_outcome(self):
        with patch.dict(os.environ, {"AI_USER_MAX_IN_FLIGHT": "10"}), self.Session() as db:
            entries = [self.reserve(db).id for _ in range(5)]
            db.commit()
            ai_costs.finish(db, entries[0], "charged", {"input_tokens": 2_000, "output_tokens": 300})  # 7.2 + 4.32 -> 12
            ai_costs.finish(db, entries[1], "charged", {})  # usage unreported: keep the reservation
            ai_costs.finish(db, entries[2], "none")
            ai_costs.finish(db, entries[3], "unknown", failure_code="provider_timeout")
            ai_costs.finish(db, entries[3], "charged", {"input_tokens": 1, "output_tokens": 1})  # no double close
            db.commit()
            report = ai_costs.reconcile(db, datetime.utcnow().date())
            self.assertTrue(report["balanced"], report)
            self.assertEqual(report["counts"], {"reserved": 1, "settled": 2, "released": 1, "unknown": 1})
            self.assertEqual(report["committed_paise"], 12 + 51 + 51 + 51)
            self.assertEqual(report["settled_paise"], 63)
            self.assertEqual(report["in_flight"], 1)
            resolved = ai_costs.resolve_unknown(db, entries[3], charged=False, actual_paise=None, admin_id=1)
            db.commit()
            self.assertEqual(resolved.status, "released")
            self.assertTrue(ai_costs.reconcile(db, datetime.utcnow().date())["balanced"])
            self.assertEqual(db.get(AiSpendCounter, f"user:1:{datetime.utcnow().date()}").committed_paise, 12 + 51 + 51)

    def test_caps_concurrency_and_kill_switch(self):
        with patch.dict(os.environ, {"AI_USER_DAILY_CAP_PAISE": "120", "AI_GLOBAL_DAILY_CAP_PAISE": "150",
                                     "AI_USER_MAX_IN_FLIGHT": "5"}), self.Session() as db:
            first, second = self.reserve(db), self.reserve(db)
            db.commit()
            with self.assertRaises(ai_costs.Denied) as denied:
                self.reserve(db)
            self.assertEqual((denied.exception.status_code, denied.exception.reason), (429, "user_daily_cap"))
            with self.assertRaises(ai_costs.Denied) as denied:
                self.reserve(db, user_id=2)
            self.assertEqual((denied.exception.status_code, denied.exception.reason), (503, "global_daily_cap"))
            ai_costs.finish(db, first.id, "none")
            db.commit()
            self.reserve(db, user_id=2)
            db.commit()
            db.add(AiRuntimeConfig(provider="mock", ai_enabled=False, openai_model="x", gemini_model="y"))
            db.commit()
            with self.assertRaises(ai_costs.Denied) as denied:
                self.reserve(db, user_id=2, units=(1, 1))
            self.assertEqual(denied.exception.reason, "ai_disabled")
        with patch.dict(os.environ, {"AI_USER_MAX_IN_FLIGHT": "1"}), self.Session() as db:
            db.query(AiRuntimeConfig).delete()
            db.commit()
            # User 2 already has one reservation in flight.
            with self.assertRaises(ai_costs.Denied) as denied:
                self.reserve(db, user_id=2, units=(1, 1))
            self.assertEqual(denied.exception.reason, "user_concurrency")

    def test_stale_reservation_becomes_unknown(self):
        with self.Session() as db:
            entry = self.reserve(db)
            db.commit()
            self.assertEqual(ai_costs.expire_stale(db, now=datetime.utcnow() + timedelta(minutes=11)), 1)
            db.commit()
            self.assertEqual(db.get(AiCostEntry, entry.id).status, "unknown")
            self.assertTrue(ai_costs.reconcile(db, entry.day)["balanced"])


class BillableApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/api.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(id=1, email="one@example.com", name="One", is_active=True),
                        User(id=9, email="admin@example.com", name="Admin", role="admin", is_active=True)])
            db.commit()

        def test_db():
            with self.Session() as db:
                yield db
        app = FastAPI()
        app.include_router(interview_router)
        app.include_router(resume_router)
        app.include_router(admin_router, prefix="/admin")
        app.dependency_overrides[get_db] = test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        self.headers = {"Authorization": "Bearer " + create_access_token({"sub": "1"})}
        self.admin = {"Authorization": "Bearer " + create_access_token({"sub": "9"})}
        self.patches = [patch.object(provider, "api_key", return_value="unit-test-key"),
                        patch("services.interview_provider.httpx.Client.post", side_effect=AssertionError("Unexpected external request"))]
        for item in self.patches:
            item.start()

    async def asyncTearDown(self):
        for item in reversed(self.patches):
            item.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    async def session(self):
        response = await self.client.post("/interviews/sessions", headers=self.headers, json={
            "request_id": str(uuid4()), "route": "cat", "provider": "openai", "consent": True, "question_limit": 5})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    async def answer(self, session, request_id, text="I led the college fest budget and changed vendors."):
        return await self.client.post(f"/interviews/sessions/{session['id']}/answers", headers=self.headers,
                                      json={"request_id": request_id, "expected_version": session["version"], "text": text})

    def entries(self):
        with self.Session() as db:
            return [(e.status, e.failure_code, e.reserved_paise, e.actual_paise) for e in db.query(AiCostEntry).order_by(AiCostEntry.created_at)]

    async def assert_preserved(self, session):
        saved = (await self.client.get(f"/interviews/sessions/{session['id']}", headers=self.headers)).json()
        self.assertEqual(saved["transcript"], session["transcript"])
        self.assertEqual(saved["version"], session["version"])
        self.assertFalse(saved["busy"])

    async def test_disabled_ai_blocks_billable_steps_and_preserves_input(self):
        session = await self.session()
        with self.Session() as db:
            db.add(AiRuntimeConfig(provider="openai", ai_enabled=False, openai_model="x", gemini_model="y"))
            db.commit()
        request_id = str(uuid4())
        with patch.object(provider, "next_question") as called:
            denied = await self.answer(session, request_id)
            self.assertEqual(denied.status_code, 503)
            self.assertIn("paused", denied.json()["detail"])
            called.assert_not_called()
        resume = await self.client.post("/interviews/resume/question-sets", headers=self.headers, json={
            "request_id": str(uuid4()), "route": "cat", "consent": True, "resume_text": "B.Tech, VIT. Led a robotics team of six students and shipped an inventory tool used by the campus store."})
        self.assertEqual(resume.status_code, 503)
        await self.assert_preserved(session)
        self.assertEqual(self.entries(), [])
        with self.Session() as db:
            db.query(AiRuntimeConfig).update({"ai_enabled": True})
            db.commit()
        with patch.object(provider, "next_question", return_value=({"question": "Why vendors?"}, {"input_tokens": 900, "output_tokens": 40})):
            retried = await self.answer(session, request_id)  # same request id works once allowed
        self.assertEqual(retried.status_code, 200, retried.text)
        self.assertEqual(self.entries(), [("settled", None, self.entries()[0][2], 4)])

    async def test_user_money_cap_denies_with_429_and_keeps_answer(self):
        session = await self.session()
        with patch.dict(os.environ, {"AI_USER_DAILY_CAP_PAISE": "1"}), patch.object(provider, "next_question") as called:
            denied = await self.answer(session, str(uuid4()))
        self.assertEqual(denied.status_code, 429)
        self.assertEqual(denied.headers["x-ai-limit"], "user_daily_cap")
        self.assertIn("kept", denied.json()["detail"])
        called.assert_not_called()
        await self.assert_preserved(session)
        with self.Session() as db:
            self.assertEqual(db.query(AiSpendCounter).filter(AiSpendCounter.committed_paise != 0).count(), 0)

    async def test_timeout_is_unknown_connect_error_is_released_bad_output_is_charged(self):
        session = await self.session()
        cases = [
            (httpx.ReadTimeout("slow"), "unknown", "provider_timeout"),
            (httpx.ConnectError("refused"), "released", "provider_unreachable"),
        ]
        for error, status, code in cases:
            with patch("services.interview_provider.httpx.Client.post", side_effect=error):
                response = await self.answer(session, str(uuid4()))
            self.assertEqual(response.status_code, 503)
            self.assertEqual(self.entries()[-1][:2], (status, code))
        body = {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": "{not json"}]}],
                "usage": {"input_tokens": 1_000, "output_tokens": 100}}
        with patch("services.interview_provider.httpx.Client.post", return_value=Mock(status_code=200, json=Mock(return_value=body))):
            response = await self.answer(session, str(uuid4()))
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.entries()[-1][0], "settled")
        self.assertEqual(self.entries()[-1][3], 6)  # 3.6 + 1.44 paise -> ceil 6
        await self.assert_preserved(session)

        ledger = await self.client.get("/admin/pilot/ai-ledger", headers=self.admin)
        self.assertEqual(ledger.status_code, 200, ledger.text)
        data = ledger.json()
        self.assertEqual(data["unknown_total"], 1)
        unknown = [item for item in data["items"] if item["status"] == "unknown"]
        self.assertEqual(unknown[0]["failure_code"], "provider_timeout")
        self.assertTrue(data["reconciliation"]["balanced"], data["reconciliation"])
        self.assertFalse(data["today"]["alert_triggered"])
        self.assertIn("alert_paise", data["today"])
        denied = await self.client.get("/admin/pilot/ai-ledger", headers=self.headers)
        self.assertEqual(denied.status_code, 403)
        resolved = await self.client.post(f"/admin/pilot/ai-ledger/{unknown[0]['id']}/resolve", headers=self.admin,
                                          json={"outcome": "charged", "actual_paise": 3, "note": "checked dashboard"})
        self.assertEqual(resolved.status_code, 200, resolved.text)
        self.assertEqual((resolved.json()["status"], resolved.json()["actual_paise"]), ("settled", 3))
        again = await self.client.post(f"/admin/pilot/ai-ledger/{unknown[0]['id']}/resolve", headers=self.admin,
                                       json={"outcome": "not_charged"})
        self.assertEqual(again.status_code, 409)
        after = (await self.client.get("/admin/pilot/ai-ledger?state=all", headers=self.admin)).json()
        self.assertTrue(after["reconciliation"]["balanced"])
        self.assertEqual(after["unknown_total"], 0)

    async def test_alert_is_reported_but_does_not_block(self):
        session = await self.session()
        with patch.dict(os.environ, {"AI_DAILY_ALERT_PAISE": "1"}), \
                patch.object(provider, "next_question", return_value=({"question": "And then?"}, {"input_tokens": 500, "output_tokens": 50})):
            first = await self.answer(session, str(uuid4()))
            self.assertEqual(first.status_code, 200, first.text)
            today = (await self.client.get("/admin/pilot/ai-ledger", headers=self.admin)).json()["today"]
            self.assertTrue(today["alert_triggered"])
            self.assertFalse(today["cap_reached"])
            second = await self.answer(first.json(), str(uuid4()))
            self.assertEqual(second.status_code, 200, second.text)

    async def test_retries_of_one_request_are_bounded(self):
        session = await self.session()
        request_id = str(uuid4())
        with patch.dict(os.environ, {"AI_MAX_ATTEMPTS_PER_REQUEST": "2"}), \
                patch.object(provider, "next_question", side_effect=provider.ProviderFailure("Please retry")) as called:
            codes = [(await self.answer(session, request_id)).status_code for _ in range(3)]
        self.assertEqual(codes, [503, 503, 429])
        self.assertEqual(called.call_count, 2)
        await self.assert_preserved(session)

    async def test_third_try_of_one_answer_uses_a_no_ai_fallback_question(self):
        session = await self.session()
        request_id = str(uuid4())
        failure = provider.ProviderFailure("The follow-up could not be matched to your answer.", billing="charged",
                                           usage={"input_tokens": 900, "output_tokens": 40})
        with patch.object(provider, "next_question", side_effect=failure) as called:
            codes = [(await self.answer(session, request_id)).status_code for _ in range(2)]
            third = await self.answer(session, request_id)
        self.assertEqual(codes, [503, 503])
        self.assertEqual(third.status_code, 200, third.text)
        self.assertEqual(called.call_count, 2)  # the third try never reached the provider
        question = third.json()["transcript"][-1]
        self.assertEqual((question["id"], question["kind"], question["anchor_turn_id"], question["fallback"]),
                         ("q2", "new_topic", "", True))
        self.assertNotIn(question["text"].casefold(), [t["text"].casefold() for t in session["transcript"]])
        self.assertEqual([e[0] for e in self.entries()], ["settled", "settled", "released"])

    async def test_explicit_stop_request_closes_without_a_model_call(self):
        session = await self.session()
        with patch.object(provider, "next_question") as called:
            response = await self.answer(session, str(uuid4()), text="Can we stop here? I'd like to see my feedback now.")
        self.assertEqual(response.status_code, 200, response.text)
        ended = response.json()
        self.assertEqual(called.call_count, 0)
        self.assertEqual(ended["status"], "ready_for_feedback")
        self.assertEqual((ended["transcript"][-1]["kind"], ended["transcript"][-1]["detected"]), ("end_requested", True))
        self.assertEqual([e[0] for e in self.entries()], ["released"])

    async def test_price_versions_admin_api(self):
        created = await self.client.post("/admin/pilot/ai-prices", headers=self.admin, json={
            "model": "gpt-4.1-mini", "input_paise_per_million": 4_000, "output_paise_per_million": 16_000})
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()["version"], 1)
        listed = (await self.client.get("/admin/pilot/ai-prices", headers=self.admin)).json()
        self.assertEqual(len(listed["versions"]), 1)
        self.assertTrue(any(item["model"] == "gpt-4.1-mini" for item in listed["builtin"]))
        bad = await self.client.post("/admin/pilot/ai-prices", headers=self.admin, json={
            "model": "x", "input_paise_per_million": 1.5, "output_paise_per_million": 1})
        self.assertEqual(bad.status_code, 422)


if __name__ == "__main__":
    unittest.main()
