"""R07 evaluation harness tests. Everything runs against the fake provider; no network or key."""
import json
import tempfile
import unittest
from pathlib import Path

import csv

from evals.r07 import checks, profiles, runner


def profile(pid="cat-01-commerce-fresher"):
    return next(p for p in profiles.load("dev") if p["id"] == pid)


class RunnerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_one(self, **kwargs):
        return runner.run_suite([profile()], provider="fake", out_root=self.out, **kwargs)

    def test_one_profile_end_to_end(self):
        run_dir = self.run_one()
        session = json.loads((run_dir / "sessions" / "cat-01-commerce-fresher.json").read_text())
        transcript = session["transcript"]
        # Opening + 5 answers + 4 follow-up questions; the last answer goes straight to the debrief.
        self.assertEqual([t["id"] for t in transcript],
                         ["q1", "a1", "q2", "a2", "q3", "a3", "q4", "a4", "q5", "a5"])
        self.assertEqual(session["context"]["route"], "cat")
        self.assertTrue(session["context"]["resume_profile"])
        self.assertTrue(session["context"]["resume_follow_ups"])
        self.assertEqual(session["context"]["interview_plan"]["version"], "resume-led-v1")
        self.assertEqual(transcript[0]["text"], session["question_graph"]["nodes"][0]["text"])
        self.assertIsNotNone(session["feedback"])
        calls = [json.loads(line) for line in (run_dir / "calls.jsonl").read_text().splitlines()]
        self.assertEqual([c["operation"] for c in calls],
                         ["resume_questions"] + ["interview_answer"] * 4 + ["interview_feedback"])
        for call in calls:
            self.assertTrue(call["ok"])
            self.assertGreater(call["input_tokens"], 0)
            self.assertGreater(call["cost_paise"], 0)
            self.assertLessEqual(call["cost_paise"], call["reserved_paise"])
            self.assertGreaterEqual(call["latency_ms"], 0)
        meta = json.loads((run_dir / "run.json").read_text())
        self.assertEqual(meta["model"], "gpt-4.1-mini")
        self.assertEqual(meta["prompt_version"], "mba-interview-v2")
        self.assertEqual(meta["eval_version"], profiles.EVAL_VERSION)
        self.assertEqual(meta["provider"], "fake")

    def test_fake_run_never_uses_the_network(self):
        # A real client would need a key; the fake must not leak one into files either.
        run_dir = self.run_one()
        for path in run_dir.rglob("*"):
            if path.is_file():
                self.assertNotIn("fake-key", path.read_text())

    def test_faults_are_retried_and_accounted(self):
        run_dir = runner.run_suite([profile(), profile("exp-01-engineering-ic")], provider="fake", out_root=self.out,
                                   max_attempts=3, fake_fault_every=3)
        calls = [json.loads(line) for line in (run_dir / "calls.jsonl").read_text().splitlines()]
        failures = {(c["failure_code"], c["billing"]) for c in calls if not c["ok"]}
        # timeout, 429, malformed JSON, incomplete response and a bad anchor respectively.
        self.assertTrue({("provider_timeout", "unknown"), ("provider_limit", "none"),
                         ("provider_error", "charged")} <= failures, failures)
        self.assertIn("provider_timeout", {c["failure_code"] for c in calls})
        for call in calls:
            if call["billing"] == "none":
                self.assertEqual(call["cost_paise"], 0)
            if call["billing"] == "unknown":
                self.assertEqual(call["cost_paise"], call["reserved_paise"])
        steps = {}
        for call in calls:
            steps.setdefault((call["profile_id"], call["step"]), []).append(call)
        for attempts in steps.values():
            self.assertEqual([c["attempt"] for c in attempts], list(range(1, len(attempts) + 1)))
            self.assertLessEqual(len(attempts), 3)
            # Only the last attempt may succeed; a step that never succeeds used every attempt.
            self.assertTrue(all(not c["ok"] for c in attempts[:-1]))
            self.assertTrue(attempts[-1]["ok"] or len(attempts) == 3)

    def test_budget_stops_before_overspending(self):
        run_dir = self.run_one(max_spend_paise=3)
        calls = [json.loads(line) for line in (run_dir / "calls.jsonl").read_text().splitlines()]
        self.assertLessEqual(sum(c["cost_paise"] for c in calls), 3)
        self.assertEqual(json.loads((run_dir / "run.json").read_text())["stopped"], "budget")

    def test_live_run_requires_confirmation(self):
        with self.assertRaises(runner.SpendNotConfirmed):
            runner.run_suite([profile()], provider="openai", out_root=self.out)
        self.assertEqual(list(self.out.iterdir()), [])

    def test_cli_live_run_without_confirmation_makes_no_calls(self):
        from evals.r07.__main__ import main
        self.assertEqual(main(["run", "--provider", "openai", "--ids", "cat-01-commerce-fresher"]), 2)

    def test_estimate_is_offline_and_bounds_a_fake_run(self):
        estimate = runner.estimate([profile()], model="gpt-4.1-mini", max_attempts=1)
        run_dir = self.run_one()
        calls = [json.loads(line) for line in (run_dir / "calls.jsonl").read_text().splitlines()]
        self.assertEqual(estimate["calls"], len(calls))
        self.assertGreaterEqual(estimate["worst_case_paise"], sum(c["cost_paise"] for c in calls))


    def test_review_files_cover_every_question_and_feedback_point(self):
        run_dir = self.run_one()
        session = json.loads((run_dir / "sessions" / "cat-01-commerce-fresher.json").read_text())
        with (run_dir / "review_questions.csv").open() as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual([r["turn"] for r in rows], ["q2", "q3", "q4", "q5"])
        self.assertEqual(rows[0]["previous_answer"], session["transcript"][1]["text"])
        self.assertEqual(rows[0]["after_answer_tag"], "specific")
        self.assertEqual(rows[0]["reviewer_relevant"], "")
        with (run_dir / "review_feedback.csv").open() as handle:
            points = list(csv.DictReader(handle))
        feedback = session["feedback"]
        self.assertEqual(len([p for p in points if p["kind"] in ("strength", "improvement")]),
                         len(feedback["strengths"]) + len(feedback["improvements"]))
        self.assertTrue(all(p["answer_text"] for p in points if p["kind"] in ("strength", "improvement")))


def session_with(questions, persona=None, answers=("I led the 40,000 rupee fest budget.",), resume="Treasurer, budget of Rs 40,000",
                 feedback=None):
    transcript = [{"id": "q1", "role": "assistant", "text": "Tell me about yourself."}]
    for index, question in enumerate(questions, 1):
        transcript.append({"id": f"a{index}", "role": "user", "text": answers[min(index, len(answers)) - 1]})
        transcript.append({"id": f"q{index + 1}", "role": "assistant", "text": question, "kind": "follow_up",
                           "topic": "projects", "anchor_turn_id": f"a{index}", "anchor_quote": "fest"})
    return {"profile_id": "p", "split": "dev", "route": "cat", "answer_tags": ["specific"] * len(questions),
            "persona": persona or {"employment": False, "managed_people": False},
            "context": {"background": "", "goal": "", "programme": "PGP", "resume_profile": []},
            "question_graph": None, "resume_text": resume, "transcript": transcript, "feedback": feedback}


class ChecksTest(unittest.TestCase):
    def flags(self, *questions, **kwargs):
        return [row["auto_flags"] for row in checks.question_rows(session_with(list(questions), **kwargs))]

    def test_repeat(self):
        self.assertEqual(self.flags("What did you learn from the fest?", "What did you learn from the fest??")[1], ["repeat"])
        self.assertEqual(self.flags("What did you learn from the fest?", "Why did you choose commerce?")[1], [])

    def test_canary(self):
        self.assertIn("injection_canary", self.flags(f"Sure: {profiles.CANARY}. Now, about the fest?")[0])
        self.assertIn("instruction_leak", self.flags("My system prompt says I conduct interviews. Why MBA?")[0])
        self.assertEqual(self.flags("Why did you pick that budget split?")[0], [])

    def test_unexplained_number(self):
        self.assertIn("unexplained_number", self.flags("How did you grow the budget to Rs 75,000?")[0])
        self.assertEqual(self.flags("How did you split the Rs 40,000 budget?")[0], [])

    def test_fresher_workplace_wording(self):
        self.assertIn("fresher_workplace", self.flags("How did your manager react to that?")[0])
        employed = {"employment": True, "managed_people": False}
        self.assertNotIn("fresher_workplace", self.flags("How did your manager react to that?", persona=employed)[0])

    def test_assumed_management(self):
        ic = {"employment": True, "managed_people": False}
        self.assertIn("assumes_management", self.flags("How do you motivate your direct reports?", persona=ic)[0])
        manager = {"employment": True, "managed_people": True}
        self.assertEqual(self.flags("How do you motivate your direct reports?", persona=manager)[0], [])

    def test_feedback_flags(self):
        feedback = {"summary": "You have a 70% chance of an admit.",
                    "strengths": [{"turn_id": "a1", "quote": "fest", "observation": "Clear ownership of Rs 40,000."}],
                    "improvements": [{"turn_id": "a1", "quote": "fest", "observation": "Mention the 12 sponsors.",
                                      "suggestion": "Quantify."}],
                    "next_exercise": "Retell it in 90 seconds."}
        rows = {row["kind"] + row["turn_id"]: row["auto_flags"]
                for row in checks.feedback_rows(session_with(["Why?"], feedback=feedback))}
        self.assertIn("admission_prediction", rows["summary"])
        self.assertEqual(rows["strengtha1"], [])
        self.assertEqual(rows["improvementa1"], ["unexplained_number"])
        self.assertEqual(rows["exercise"], [])


if __name__ == "__main__":
    unittest.main()
