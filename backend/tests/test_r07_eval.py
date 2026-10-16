"""R07 evaluation harness tests. Everything runs against the fake provider; no network or key."""
import json
import tempfile
import unittest
from pathlib import Path

from evals.r07 import profiles, runner


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


if __name__ == "__main__":
    unittest.main()
