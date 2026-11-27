"""One plain email ~24h after sign-up to verified users who have not started an interview. No AI calls."""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import update
from sqlalchemy.orm import Session

from auth import is_admin_user
from config import Settings
from models import InterviewSession, User
from services.reminders import send_email_notification

logger = logging.getLogger("mba.email")

MIN_AGE = timedelta(hours=24)
MAX_AGE = timedelta(days=7)  # so switching the flag on never emails old accounts

SUBJECT = "Have you tried a MockMBA question yet?"
BODY = (
    "Hi {name},\n\n"
    "You signed up for MockMBA recently and have not tried a question yet. "
    "The first one takes about two minutes and needs no résumé. MockMBA is free to use right now.\n\n"
    "{link}\n\n"
    "This is the only reminder you will get from us about this.\n\n— Shivam, MockMBA"
)


def run_signup_nudges(db: Session, settings: Settings, now: Optional[datetime] = None) -> dict:
    """Idempotent: each user is claimed with a conditional UPDATE before sending, so repeats and
    concurrent runs cannot double-send. A failed send releases the claim."""
    if not settings.SIGNUP_NUDGE_ENABLED:
        return {"enabled": False, "sent": 0, "failed": 0}
    now = now or datetime.utcnow()
    has_session = db.query(InterviewSession.id).filter(InterviewSession.user_id == User.id).exists()
    candidates = (
        db.query(User)
        .filter(User.email_verified.is_(True), User.is_active.is_(True), User.signup_nudge_sent_at.is_(None),
                User.created_at <= now - MIN_AGE, User.created_at > now - MAX_AGE, ~has_session)
        .all()
    )
    sent = failed = 0
    for user in candidates:
        if is_admin_user(user) or not user.email:
            continue
        uid, email = user.id, user.email
        name = ((user.name or "").strip().split() or ["there"])[0]
        claimed = db.execute(update(User).where(User.id == uid, User.signup_nudge_sent_at.is_(None))
                             .values(signup_nudge_sent_at=now)).rowcount
        db.commit()
        if claimed != 1:
            continue
        try:
            ok, _dry, _msg = send_email_notification(
                subject=SUBJECT,
                body=BODY.format(name=name, link=f"{settings.public_app_origin}/app/interviews"),
                recipient=email, smtp_host=settings.SMTP_HOST, smtp_port=settings.SMTP_PORT,
                smtp_user=settings.SMTP_USER, smtp_password=settings.SMTP_PASSWORD,
                smtp_from=settings.smtp_from_address)
        except Exception as exc:
            ok = False
            logger.warning("Signup nudge failed (%s)", type(exc).__name__)
        if ok:
            sent += 1
        else:
            failed += 1
            db.execute(update(User).where(User.id == uid).values(signup_nudge_sent_at=None))
            db.commit()
    return {"enabled": True, "sent": sent, "failed": failed}
