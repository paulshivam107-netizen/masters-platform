from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth import generate_refresh_token, hash_refresh_token
from config import Settings
from models import AuthToken, User
from services.reminders import send_email_notification

EMAIL_VERIFY_PURPOSE = "email_verify"
PASSWORD_RESET_PURPOSE = "password_reset"


def issue_one_time_token(db: Session, user: User, purpose: str, ttl_minutes: int) -> str:
    db.query(AuthToken).filter(
        and_(
            AuthToken.user_id == user.id,
            AuthToken.purpose == purpose,
            AuthToken.used == False  # noqa: E712
        )
    ).update({"used": True})

    raw_token = generate_refresh_token()
    token_row = AuthToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_token),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=ttl_minutes),
        used=False,
    )
    db.add(token_row)
    db.commit()
    return raw_token


def consume_one_time_token(db: Session, token: str, purpose: str) -> Optional[User]:
    token_hash = hash_refresh_token(token)
    row = db.query(AuthToken).filter(
        and_(
            AuthToken.token_hash == token_hash,
            AuthToken.purpose == purpose,
            AuthToken.used == False,  # noqa: E712
        )
    ).first()
    if not row:
        return None
    if row.expires_at <= datetime.utcnow():
        row.used = True
        db.commit()
        return None

    user = db.query(User).filter(User.id == row.user_id).first()
    row.used = True
    db.commit()
    return user


def send_verification_email(settings: Settings, recipient: str, token: str) -> tuple[bool, bool, str]:
    verification_link = f"http://localhost:3000/verify-email?token={token}"
    subject = "Verify your email - Master's Application Platform"
    body = (
        "Welcome to Master's Application Platform.\n\n"
        "Please verify your email by clicking this link:\n"
        f"{verification_link}\n\n"
        "If you did not sign up, you can ignore this email."
    )
    return send_email_notification(
        subject=subject,
        body=body,
        recipient=recipient,
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
        smtp_from=settings.smtp_from_address,
    )


def send_password_reset_email(settings: Settings, recipient: str, token: str) -> tuple[bool, bool, str]:
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    subject = "Reset your password - Master's Application Platform"
    body = (
        "We received a request to reset your password.\n\n"
        "Reset link:\n"
        f"{reset_link}\n\n"
        "If you did not request this, ignore this email."
    )
    return send_email_notification(
        subject=subject,
        body=body,
        recipient=recipient,
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
        smtp_from=settings.smtp_from_address,
    )
