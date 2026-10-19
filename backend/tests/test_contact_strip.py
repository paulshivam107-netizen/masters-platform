"""Contact-detail stripping and the no-résumé full interview. No real provider traffic."""
import unittest
from unittest.mock import patch
from uuid import uuid4

from models import InterviewSession
from routers.resume_routes import router
from services import interview_provider as provider
from services.resume_questions import strip_contact_details
from tests import test_interviews as interview_tests

KEEP = ["Jun 2021 – Aug 2022", "2017-2021", "CGPA 8.84/10.00", "grew revenue 20%", "raised $2M", "served 5,000 users",
        "scored 98.5 percentile", "Class of 2019, 12th: 91.4%"]
BODY = "Built API monitoring. Studied computer science."


def clean(text):
    return strip_contact_details(text)


class StripContactTest(unittest.TestCase):
    def test_removes_each_contact_format(self):
        cases = ["me@example.com", "first.last+mba@mail.co.in", "+91 97760 76385", "097760-76385", "9776076385",
                 "+1 (415) 555-0100", "+44 20 7946 0958", "linkedin.com/in/jane-doe", "https://www.linkedin.com/in/jane-doe/",
                 "github.com/jane", "http://jane.dev/me", "www.jane.dev"]
        for item in cases:
            with self.subTest(item=item):
                text, count = clean(f"Jane {item} Analyst")
                self.assertEqual((text, count), ("Jane Analyst", 1))

    def test_keeps_dates_scores_and_figures(self):
        for item in KEEP:
            with self.subTest(item=item):
                self.assertEqual(clean(f"Note: {item}."), (f"Note: {item}.", 0))

    def test_counts_multiple_and_leaves_plain_text(self):
        text, count = clean("a@b.com | +91 97760 76385 | github.com/x\n" + BODY)
        self.assertEqual(count, 3)
        for gone in ("@", "97760", "github"):
            self.assertNotIn(gone, text)
        self.assertIn(BODY, text)


class ContactStripApiTest(interview_tests.InterviewApiTest):
    async def asyncSetUp(self):
        await interview_tests.InterviewApiTest.asyncSetUp(self)
        self.app.include_router(router)

    async def post_set(self, text):
        payload = {"request_id": str(uuid4()), "route": "experienced", "resume_text": text, "consent": True}
        return await self.client.post("/interviews/resume/question-sets", json=payload, headers=self.headers)

    async def test_ai_never_sees_contact_details_and_quotes_ground_on_clean_text(self):
        raw = "Jane Doe jane@example.com +91 97760 76385 linkedin.com/in/jane\n" + BODY + " Jun 2021 – Aug 2022"
        draft = {"profile": [{"category": "experience", "evidence_quote": "Built API monitoring"}],
                 "branches": [{key: {"question": f"For project {i}, what did you learn at stage {d}?", "evidence_quote": "Built API monitoring"}
                               for d, key in enumerate(("opening", "follow_up", "deeper_follow_up"), 1)} for i in range(1, 4)]}
        with patch.object(provider, "api_key", return_value="synthetic-key"), \
                patch.object(provider, "_structured", return_value=(draft, {})) as generate:
            response = await self.post_set(raw)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["contact_details_removed"], 3)
        seen = generate.call_args.args[1]["reviewed_resume"]
        for gone in ("jane@example.com", "97760", "linkedin"):
            self.assertNotIn(gone, seen)
        self.assertIn("Jun 2021 – Aug 2022", seen)
        self.assertEqual(response.json()["graph"]["profile"][0]["evidence_quote"], "Built API monitoring")


class NoResumeInterviewTest(interview_tests.InterviewApiTest):
    async def start(self, **changes):
        payload = {"request_id": str(uuid4()), "provider": "openai", "kind": "full", "consent": True, **changes}
        return await self.client.post("/interviews/sessions", json=payload, headers=self.headers)

    async def test_full_openai_without_resume_is_repeatable_and_motivation_led(self):
        with patch.object(provider, "api_key", return_value="synthetic-key"):
            first, second = await self.start(question_limit=5), await self.start(question_limit=5)
            taster = await self.start(kind="taster")
            taster_again = await self.start(kind="taster")
        self.assertEqual((first.status_code, second.status_code), (201, 201), first.text + second.text)
        body = first.json()
        self.assertEqual(body["kind"] if "kind" in body else body["context"]["kind"], "full")
        self.assertEqual(body["context"]["practice_focus"], "motivation")
        self.assertEqual(body["context"]["question_limit"], 5)
        self.assertEqual(body["transcript"][0]["text"], "Walk me through yourself, and why an MBA is the next step you want to take.")
        self.assertEqual(taster.status_code, 201)
        self.assertEqual(taster_again.status_code, 409)  # legacy taster unchanged
        with self.Session() as db:
            self.assertEqual(db.query(InterviewSession).filter_by(kind="taster").count(), 1)
            self.assertEqual(db.query(InterviewSession).filter_by(kind="full").count(), 2)

    async def test_no_resume_interview_still_needs_live_ai(self):
        response = await self.start()  # base class has no API key
        self.assertNotEqual(response.status_code, 201)


if __name__ == "__main__":
    unittest.main()
