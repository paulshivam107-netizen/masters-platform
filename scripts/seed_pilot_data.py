#!/usr/bin/env python3
from datetime import date, timedelta
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from auth import get_password_hash  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import ApplicationTracker, Essay, User  # noqa: E402


def seed():
    db = SessionLocal()
    try:
        email = "pilot.demo@masters-app.local"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                name="Pilot Demo User",
                hashed_password=get_password_hash("pilot-demo-password"),
                timezone="UTC",
                preferred_currency="USD",
                notification_email=email,
                email_provider="manual",
                email_reminders_enabled=True,
                reminder_days="30,14,7,1",
                target_intake="Fall 2027",
                target_countries="USA,UK,Canada",
                bio="Pilot seed user for demo/testing."
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        app_specs = [
            {
                "school_name": "Harvard University",
                "program_name": "MBA",
                "application_round": "Round 1",
                "deadline": date.today() + timedelta(days=45),
                "application_fee": 250,
                "program_total_fee": 115000,
                "fee_currency": "USD",
                "essays_required": 2,
                "lors_required": 2,
                "lors_submitted": 1,
                "interview_required": True,
                "interview_completed": False,
                "decision_status": "Pending",
                "requirements_notes": "Leadership essay + career goals essay",
                "status": "Planning",
            },
            {
                "school_name": "INSEAD",
                "program_name": "MBA",
                "application_round": "Round 2",
                "deadline": date.today() + timedelta(days=70),
                "application_fee": 260,
                "program_total_fee": 99000,
                "fee_currency": "EUR",
                "essays_required": 3,
                "lors_required": 2,
                "lors_submitted": 2,
                "interview_required": True,
                "interview_completed": False,
                "decision_status": "Pending",
                "requirements_notes": "Essays + video interview",
                "status": "In Progress",
            },
        ]

        for spec in app_specs:
            existing = db.query(ApplicationTracker).filter(
                ApplicationTracker.user_id == user.id,
                ApplicationTracker.school_name == spec["school_name"],
                ApplicationTracker.program_name == spec["program_name"],
                ApplicationTracker.application_round == spec["application_round"]
            ).first()
            if not existing:
                db.add(ApplicationTracker(user_id=user.id, **spec))

        db.commit()

        apps = db.query(ApplicationTracker).filter(ApplicationTracker.user_id == user.id).all()
        app_map = {(a.school_name, a.program_name): a.id for a in apps}

        essay_specs = [
            {
                "school_name": "Harvard University",
                "program_type": "MBA",
                "essay_prompt": "What more would you like us to know?",
                "essay_content": "My leadership growth came from building products across cultures...",
            },
            {
                "school_name": "INSEAD",
                "program_type": "MBA",
                "essay_prompt": "Describe your career motivation.",
                "essay_content": "I want to bridge technology and global strategy in emerging markets...",
            },
        ]

        for spec in essay_specs:
            existing = db.query(Essay).filter(
                Essay.user_id == user.id,
                Essay.school_name == spec["school_name"],
                Essay.essay_prompt == spec["essay_prompt"],
                Essay.is_latest == True  # noqa: E712
            ).first()
            if not existing:
                db.add(Essay(
                    user_id=user.id,
                    school_name=spec["school_name"],
                    program_type=spec["program_type"],
                    essay_prompt=spec["essay_prompt"],
                    essay_content=spec["essay_content"],
                    application_id=app_map.get((spec["school_name"], spec["program_type"])),
                    version=1,
                    is_latest=True
                ))

        db.commit()
        print("Seed complete")
        print(f"Demo user: {email}")
        print("Demo password: pilot-demo-password")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
