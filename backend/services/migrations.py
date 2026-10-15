"""Data helpers that used to live beside the startup schema code.

Schema changes are Alembic revisions in backend/migrations/versions; pre-Alembic helpers
live in services/legacy_schema.py and run only when adopting an old database.
"""
from sqlalchemy import and_
from sqlalchemy.orm import Session

from models import ApplicationTracker, Essay


def backfill_essay_application_links(user_id: int, db: Session):
    """Backfill essay.application_id using school + program match for legacy data."""
    applications = db.query(ApplicationTracker).filter(
        ApplicationTracker.user_id == user_id
    ).all()
    if not applications:
        return

    application_lookup = {
        (
            (application.school_name or "").strip().lower(),
            (application.program_name or "").strip().lower()
        ): application.id
        for application in applications
    }

    essays = db.query(Essay).filter(
        and_(
            Essay.user_id == user_id,
            Essay.application_id == None  # noqa: E711
        )
    ).all()

    changed = False
    for essay in essays:
        key = (
            (essay.school_name or "").strip().lower(),
            (essay.program_type or "").strip().lower()
        )
        match = application_lookup.get(key)
        if match:
            essay.application_id = match
            changed = True

    if changed:
        db.commit()
