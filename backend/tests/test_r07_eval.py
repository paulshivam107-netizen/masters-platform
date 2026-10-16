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


if __name__ == "__main__":
    unittest.main()
