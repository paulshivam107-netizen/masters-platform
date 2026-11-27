"""Sign-up nudge: one email per eligible user, ever; failures release the claim; flag off sends nothing."""
import tempfile
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import InterviewSession, User
from services import signup_nudge

NOW = datetime(2026, 11, 16, 12, 0)


def cfg(**changes):
    base = dict(SIGNUP_NUDGE_ENABLED=True, SMTP_HOST="h", SMTP_PORT=587, SMTP_USER="u", SMTP_PASSWORD="p",
                smtp_from_address="no-reply@x.test", public_app_origin="https://www.mockmba.com")
    return SimpleNamespace(**{**base, **changes})


class SignupNudgeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        engine = create_engine("sqlite:///" + self.tmp.name + "/t.sqlite")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.add(1, "ok@example.com")
        self.add(2, "unverified@example.com", email_verified=False)
        self.add(3, "admin@example.com", role="admin")
        self.add(4, "busy@example.com")
        self.add(5, "new@example.com", age=timedelta(hours=2))
        self.add(6, "old@example.com", age=timedelta(days=9))
        self.db.add(InterviewSession(id="s" * 36, user_id=4, create_request_id="r", create_fingerprint="f",
                                     context_json="{}", provider="mock", mode="text", question_limit=3))
        self.db.commit()
        p = patch.object(signup_nudge, "send_email_notification", return_value=(True, False, "ok"))
        self.send = p.start()
        self.addCleanup(p.stop)

    def add(self, uid, email, age=timedelta(hours=30), **kw):
        self.db.add(User(id=uid, email=email, name="Asha Rao", email_verified=kw.pop("email_verified", True),
                         is_active=True, created_at=NOW - age, **kw))

    def run_it(self, **c):
        return signup_nudge.run_signup_nudges(self.db, cfg(**c), now=NOW)

    def test_sends_once_to_eligible_user_only(self):
        self.assertEqual(self.run_it()["sent"], 1)
        kwargs = self.send.call_args.kwargs
        self.assertEqual(kwargs["recipient"], "ok@example.com")
        self.assertIn("https://www.mockmba.com/app/interviews", kwargs["body"])
        self.assertNotIn("pilot", kwargs["body"].lower())
        self.assertEqual(self.run_it()["sent"], 0)
        self.assertEqual(self.send.call_count, 1)

    def test_flag_off_sends_nothing(self):
        self.assertEqual(self.run_it(SIGNUP_NUDGE_ENABLED=False)["sent"], 0)
        self.send.assert_not_called()

    def test_mailer_failure_leaves_user_unsent_and_batch_continues(self):
        self.add(7, "second@example.com")
        self.db.commit()
        self.send.side_effect = [(False, False, "fail"), RuntimeError("boom")]
        self.assertEqual(self.run_it(), {"enabled": True, "sent": 0, "failed": 2})
        self.assertIsNone(self.db.get(User, 1).signup_nudge_sent_at)
        self.send.side_effect = None
        self.send.return_value = (True, False, "ok")
        self.assertEqual(self.run_it()["sent"], 2)


if __name__ == "__main__":
    unittest.main()
