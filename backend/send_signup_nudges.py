#!/usr/bin/env python3
"""Run the sign-up nudge batch once (for a Railway cron service). Does nothing unless SIGNUP_NUDGE_ENABLED=true."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import get_settings  # noqa: E402
from database import SessionLocal  # noqa: E402
from services.signup_nudge import run_signup_nudges  # noqa: E402

if __name__ == "__main__":
    with SessionLocal() as db:
        print(run_signup_nudges(db, get_settings()))
