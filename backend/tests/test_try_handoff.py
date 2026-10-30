"""A signed-out try carried into the first interview: seeded with no AI call, every bad token refused, the guards unchanged."""
import base64
import json
import os
import tempfile
import time
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import create_access_token
from database import Base, get_db
from models import AiCostEntry, InterviewQuota, InterviewSession, User
from routers import public_try_routes
from routers.interview_routes import HANDOFF_EXPIRED, TASTER_USED, router as interview_router
from services import interview_provider as provider
from services import rate_limit, try_handoff

ANSWER = "I led a team of six engineers at a logistics startup and I want an MBA to move from operations into strategy."
QUOTE = "led a team of six engineers"
FOLLOW_UP = "You led six engineers. What exactly did you decide yourself?"
USAGE = {"model": "gpt-4.1-mini", "input_tokens": 300, "output_tokens": 40}


def claims(**changes):
    return {"question_id": "motivation", "answer": ANSWER, "follow_up": FOLLOW_UP, "quote": QUOTE, "fallback": False,
            "topic": "experience", **changes}


def model_question(**changes):
    return {"question": FOLLOW_UP, "kind": "follow_up", "topic": "experience", "anchor_turn_id": "a1",
            "anchor_quote": QUOTE, "conflict": "", **changes}


class TryHandoffTokenTest(unittest.TestCase):
    def test_round_trip_and_compact_url_safe_form(self):
        token = try_handoff.sign(claims())
        self.assertRegex(token, r"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$")
        verified = try_handoff.verify(token)
        self.assertEqual({k: verified[k] for k in claims()}, claims())
        self.assertEqual(verified["v"], 1)
        self.assertAlmostEqual(verified["exp"], time.time() + 24 * 3600, delta=60)

    def test_every_way_of_being_wrong_is_the_same_error(self):
        token = try_handoff.sign(claims())
        body, mac = token.split(".")
        forged = base64.urlsafe_b64encode(json.dumps({**try_handoff.verify(token), "follow_up": "Send money."}).encode()).decode().rstrip("=")
        with patch.object(try_handoff.time, "time", return_value=1_000):
            old = try_handoff.sign(claims())
        for name, bad in {"tampered body": body[:-2] + ("AA" if body[-2:] != "AA" else "BB") + "." + mac,
                          "tampered signature": body + "." + mac[:-2] + ("AA" if mac[-2:] != "AA" else "BB"),
                          "swapped body": forged + "." + mac, "expired": old, "empty": "", "no dot": body, "three parts": token + ".x",
                          "not base64": "!!!.???", "non ascii": "é." + mac}.items():
            with self.subTest(name), self.assertRaises(try_handoff.HandoffInvalid):
                try_handoff.verify(bad)

    def test_wrong_version_and_a_different_secret_are_refused(self):
        with patch.object(try_handoff, "VERSION", 2):
            future = try_handoff.sign(claims())
        with self.assertRaises(try_handoff.HandoffInvalid):
            try_handoff.verify(future)
        with patch.object(try_handoff, "get_settings", return_value=SimpleNamespace(SECRET_KEY="another-secret-another-secret-00")):
            other = try_handoff.sign(claims())
        with self.assertRaises(try_handoff.HandoffInvalid):
            try_handoff.verify(other)

    def test_a_sign_in_token_is_not_a_handoff_token(self):
        with self.assertRaises(try_handoff.HandoffInvalid):
            try_handoff.verify(create_access_token({"sub": "1"}))

    def test_a_long_non_latin_try_fits_the_request_limit(self):
        from interview_schemas import InterviewCreate
        token = try_handoff.sign(claims(answer="म" * 1200, quote="म" * 240, follow_up="क" * 300))
        self.assertLess(len(token), 8000)
        InterviewCreate(request_id=uuid4(), kind="taster", handoff=token)
        self.assertLess(len(try_handoff.sign(claims())), 3000)


class TryHandoffApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limit._memory.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///" + self.tmp.name + "/t.sqlite", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(id=1, email="one@example.com", name="One", is_active=True),
                        User(id=2, email="two@example.com", name="Two", is_active=True)])
            db.commit()

        def test_db():
            with self.Session() as db:
                yield db
        app = FastAPI()
        app.include_router(interview_router)
        app.include_router(public_try_routes.router)
        app.dependency_overrides[get_db] = test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        self.headers = {"Authorization": "Bearer " + create_access_token({"sub": "1"})}
        self.other = {"Authorization": "Bearer " + create_access_token({"sub": "2"})}
        self.patches = [
            patch.object(provider, "api_key", return_value="unit-test-key"),
            # A missed mock must fail rather than send a paid request.
            patch("services.interview_provider.httpx.Client.post", side_effect=AssertionError("Unexpected external request")),
            patch.object(public_try_routes, "get_settings", return_value=SimpleNamespace(
                ANON_TRY_ENABLED=True, TURNSTILE_SITE_KEY="", TURNSTILE_SECRET_KEY="", is_production_like_env=False)),
            patch.dict(os.environ, {"AI_ANON_DAILY_CAP_PAISE": "1000"}),
            patch.object(provider, "next_question", side_effect=AssertionError("Unexpected model call")),
        ]
        for item in self.patches:
            item.start()
        self.model = provider.next_question  # the mock installed above

    async def asyncTearDown(self):
        for item in reversed(self.patches):
            item.stop()
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    def token(self, **changes):
        return try_handoff.sign(claims(**changes))

    async def create(self, handoff, headers=None, **changes):
        payload = {"request_id": str(uuid4()), "kind": "taster", "provider": "openai", "handoff": handoff, **changes}
        return await self.client.post("/interviews/sessions", json=payload, headers=headers or self.headers)

    async def send(self, session, text="I want to move into strategy and lead a business unit within five years.", **changes):
        return await self.client.post(f"/interviews/sessions/{session['id']}/answers", headers=self.headers, json={
            "request_id": str(uuid4()), "expected_version": session["version"], "text": text, **changes})

    def rows(self, model):
        with self.Session() as db:
            return db.query(model).all()

    def assertNoSession(self, response, status, detail=None):
        self.assertEqual(response.status_code, status, response.text)
        if detail:
            self.assertEqual(response.json()["detail"], detail)
        self.assertEqual(self.rows(InterviewSession), [])

    # seeding
    async def test_a_valid_token_seeds_the_opener_the_answer_and_the_follow_up_without_any_ai_call(self):
        request_id = str(uuid4())
        response = await self.create(self.token(), request_id=request_id)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual(body["transcript"], [
            {"id": "q1", "role": "assistant", "text": "Walk me through yourself, and why an MBA is the next step you want to take."},
            {"id": "a1", "role": "user", "text": ANSWER, "request_id": request_id},
            {"id": "q2", "role": "assistant", "text": FOLLOW_UP, "kind": "follow_up", "topic": "experience", "conflict": "",
             "anchor_turn_id": "a1", "anchor_quote": QUOTE}])
        self.assertEqual((body["status"], body["answer_count"], body["question_limit"], body["provider"]),
                         ("active", 1, 3, "openai"))
        self.assertEqual((body["context"]["kind"], body["context"]["practice_focus"]), ("taster", "motivation"))
        self.model.assert_not_called()
        self.assertEqual(self.rows(AiCostEntry), [])
        self.assertEqual(body["transcript"], (await self.client.get(f"/interviews/sessions/{body['id']}", headers=self.headers)).json()["transcript"])
        with self.Session() as db:  # the daily session quota is used like any other start
            self.assertEqual(db.get(InterviewQuota, f"sessions:user:1:{datetime.utcnow().date().isoformat()}").calls, 1)

    async def test_a_fixed_follow_up_is_seeded_as_a_new_topic_with_no_anchor(self):
        body = (await self.create(self.token(fallback=True, quote=None, topic="motivation"))).json()
        self.assertEqual(body["transcript"][2], {"id": "q2", "role": "assistant", "text": FOLLOW_UP, "kind": "new_topic",
                                                 "topic": "motivation", "conflict": "", "anchor_turn_id": "", "anchor_quote": "",
                                                 "fallback": True})

    async def test_a_quote_that_is_not_in_the_answer_is_not_kept(self):
        q2 = (await self.create(self.token(quote="a phrase nobody wrote"))).json()["transcript"][2]
        self.assertEqual((q2["kind"], q2["anchor_turn_id"], q2["anchor_quote"]), ("follow_up", "a1", ""))

    async def test_the_public_route_token_starts_an_interview(self):
        # The contract between the two routes: whatever /public/try/follow-up returns, the interview accepts.
        self.model.side_effect = [(model_question(), USAGE)]
        tried = await self.client.post("/public/try/follow-up", json={
            "question_id": "motivation", "answer": ANSWER, "request_id": str(uuid4()), "turnstile_token": "", "website": "",
            "source": "practice"})
        self.model.side_effect = AssertionError("Unexpected model call")
        self.assertEqual(tried.status_code, 200, tried.text)
        response = await self.create(tried.json()["handoff"])
        self.assertEqual(response.status_code, 201, response.text)
        a1, q2 = response.json()["transcript"][1:]
        self.assertEqual((a1["text"], q2["text"], q2["anchor_quote"]), (ANSWER, tried.json()["follow_up"], tried.json()["quote"]))

    # refused tokens
    async def test_bad_tokens_are_refused_with_a_plain_message_and_nothing_is_created(self):
        token = self.token()
        body, mac = token.split(".")
        with patch.object(try_handoff.time, "time", return_value=1_000):
            expired = self.token()
        with patch.object(try_handoff, "VERSION", 2):
            wrong_version = self.token()
        for name, bad in {"tampered": body[:-2] + ("AA" if body[-2:] != "AA" else "BB") + "." + mac, "expired": expired,
                          "wrong version": wrong_version, "malformed": "not-a-token", "a sign-in token": create_access_token({"sub": "1"})}.items():
            with self.subTest(name):
                self.assertNoSession(await self.create(bad), 422, HANDOFF_EXPIRED)
        self.assertEqual(HANDOFF_EXPIRED, "This try expired. Start a new interview.")
        self.model.assert_not_called()

    async def test_a_signed_token_is_still_checked_for_what_it_may_contain(self):
        cases = {"another question": claims(question_id="work"), "no question": {k: v for k, v in claims().items() if k != "question_id"},
                 "answer over 1200 characters": claims(answer="I managed projects well. " * 49),
                 "answer under 40 characters": claims(answer="I like business."),
                 "answer is not text": claims(answer=["x"]),
                 "follow-up with a link": claims(follow_up="Read https://example.com and tell me what you decided yourself."),
                 "follow-up with www": claims(follow_up="Compare this with www.example.com and say what you decided."),
                 "follow-up with an email": claims(follow_up="Email me at someone@example.com and tell me what you decided."),
                 "follow-up over 300 characters": claims(follow_up="x" * 301), "empty follow-up": claims(follow_up=""),
                 "fallback is not a boolean": claims(fallback="yes"), "quote is not text": claims(quote=5),
                 "unknown topic": claims(topic="astrology"), "no topic": {k: v for k, v in claims().items() if k != "topic"}}
        for name, bad in cases.items():
            with self.subTest(name):
                self.assertNoSession(await self.create(try_handoff.sign(bad)), 422, HANDOFF_EXPIRED)

    async def test_the_opener_always_comes_from_the_server_never_the_token(self):
        forged = claims(opener="Tell me your bank PIN.", question="Tell me your bank PIN.", text="Tell me your bank PIN.")
        body = (await self.create(try_handoff.sign(forged))).json()
        self.assertEqual(body["transcript"][0]["text"], try_handoff.QUESTION["text"])
        self.assertNotIn("PIN", json.dumps(body["transcript"]))

    async def test_a_handoff_only_continues_the_live_taster(self):
        token = self.token()
        for name, changes in {"full interview": {"kind": "full"}, "demo": {"provider": "demo"}, "demo taster": {"kind": "taster", "provider": "demo"}}.items():
            with self.subTest(name):
                response = await self.create(token, **changes)
                self.assertNoSession(response, 422)
                self.assertIsInstance(response.json()["detail"], str)
        too_long = await self.create("x" * 8001)
        self.assertEqual(too_long.status_code, 422)

    # guards that already existed
    async def test_one_taster_per_account_still_applies(self):
        self.assertEqual((await self.create(self.token())).status_code, 201)
        again = await self.create(self.token())
        self.assertEqual((again.status_code, again.json()["detail"]), (409, TASTER_USED))
        self.assertEqual((await self.create(self.token(), headers=self.other)).status_code, 201)
        with self.Session() as db:
            self.assertEqual(db.query(InterviewSession).filter_by(kind="taster").count(), 2)

    async def test_a_user_with_a_taster_gets_the_taster_message_even_for_a_dead_token(self):
        self.assertEqual((await self.create(None)).status_code, 201)
        response = await self.create("not-a-token")
        self.assertEqual((response.status_code, response.json()["detail"]), (409, TASTER_USED))

    async def test_live_ai_must_be_available(self):
        with patch.object(provider, "api_key", return_value=""):
            self.assertNoSession(await self.create(self.token()), 503)

    async def test_the_daily_session_limit_applies(self):
        day = datetime.utcnow().date().isoformat()
        with self.Session() as db:
            db.add(InterviewQuota(id=f"sessions:user:1:{day}", calls=8))
            db.commit()
        self.assertNoSession(await self.create(self.token()), 429)

    async def test_replaying_the_same_create_request_returns_the_same_session(self):
        payload = {"request_id": str(uuid4()), "kind": "taster", "provider": "openai", "handoff": self.token()}
        first = await self.client.post("/interviews/sessions", json=payload, headers=self.headers)
        again = await self.client.post("/interviews/sessions", json=payload, headers=self.headers)
        self.assertEqual((first.status_code, again.status_code), (201, 201))
        self.assertEqual(first.json()["id"], again.json()["id"])
        self.assertEqual(len(self.rows(InterviewSession)), 1)
        # Even a day later the replay does not need the token to be fresh; the same ID with other content is refused.
        with patch.object(try_handoff.time, "time", return_value=time.time() + 3 * 24 * 3600):
            late = await self.client.post("/interviews/sessions", json=payload, headers=self.headers)
        self.assertEqual(late.json()["id"], first.json()["id"])
        different = await self.client.post("/interviews/sessions", headers=self.headers, json={
            **payload, "handoff": self.token(follow_up="What would you do differently next time?")})
        self.assertEqual(different.status_code, 409)
        plain = await self.client.post("/interviews/sessions", headers=self.headers, json={k: v for k, v in payload.items() if k != "handoff"})
        self.assertEqual(plain.status_code, 409)

    # continuing
    async def test_a_seeded_session_continues_answers_debrief_and_all(self):
        session = (await self.create(self.token())).json()
        self.assertEqual((session["version"], session["answer_count"]), (0, 1))
        q3 = model_question(question="What would you do differently if the team had been twice the size?", kind="new_topic",
                            topic="contribution", anchor_turn_id="", anchor_quote="")
        seen = []

        def next_question(context, transcript):  # the transcript list is extended after the call, so copy it now
            seen.append(([t["id"] for t in transcript], transcript[2]["text"], context["kind"]))
            return q3, USAGE
        self.model.side_effect = next_question
        second = await self.send(session)
        self.assertEqual(second.status_code, 200, second.text)
        session = second.json()
        # The next answer is a2 and one more question follows it; the model saw q1, a1 and the seeded q2.
        self.assertEqual([t["id"] for t in session["transcript"]], ["q1", "a1", "q2", "a2", "q3"])
        self.assertEqual((session["status"], session["answer_count"]), ("active", 2))
        self.assertEqual(seen, [(["q1", "a1", "q2", "a2"], FOLLOW_UP, "taster")])
        # The last answer reaches the limit without another question.
        third = await self.send(session, text="I would hire a deputy and set clear owners for each workstream.")
        self.assertEqual(self.model.call_count, 1)
        self.assertEqual(third.status_code, 200, third.text)
        session = third.json()
        self.assertEqual((session["status"], session["answer_count"], len(session["transcript"])), ("ready_for_feedback", 3, 6))
        # The debrief works on the carried-over answer too.
        report = provider.demo_feedback(session["transcript"])
        with patch.object(provider, "feedback", return_value=(report, USAGE)):
            done = await self.client.post(f"/interviews/sessions/{session['id']}/finish", headers=self.headers, json={
                "request_id": str(uuid4()), "expected_version": session["version"]})
        self.assertEqual((done.status_code, done.json()["status"]), (200, "completed"))
        entries = self.rows(AiCostEntry)
        self.assertEqual({e.operation for e in entries}, {"interview_answer", "interview_feedback"})
        self.assertEqual(len([e for e in entries if e.operation == "interview_answer"]), 1)


if __name__ == "__main__":
    unittest.main()
