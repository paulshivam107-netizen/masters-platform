#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import SessionLocal  # noqa: E402
from models import User  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Set a user's role for local development.")
    parser.add_argument("email", help="User email")
    parser.add_argument("role", choices=["user", "admin"], help="Role to set")
    args = parser.parse_args()

    email = args.email.strip().lower()
    role = args.role.strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User not found: {email}")
            return 1
        user.role = role
        db.commit()
        print(f"Updated {email} -> role={role}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
