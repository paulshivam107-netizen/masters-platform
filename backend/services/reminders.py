import smtplib
from datetime import date, datetime
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

from models import ApplicationTracker, User
from schemas import ReminderPreviewItem


def parse_reminder_days(reminder_days_value: Optional[str]) -> set[int]:
    if not reminder_days_value:
        return {30, 14, 7, 1}
    parsed = set()
    for item in reminder_days_value.split(","):
        value = item.strip()
        if not value:
            continue
        try:
            parsed.add(max(0, int(value)))
        except ValueError:
            continue
    return parsed or {30, 14, 7, 1}


def days_until(deadline_value: Optional[date]) -> Optional[int]:
    if not deadline_value:
        return None
    today = datetime.utcnow().date()
    return (deadline_value - today).days


def get_reminder_matches(current_user: User, db: Session) -> list[ReminderPreviewItem]:
    reminder_days = parse_reminder_days(current_user.reminder_days)
    applications = (
        db.query(ApplicationTracker)
        .filter(ApplicationTracker.user_id == current_user.id)
        .order_by(ApplicationTracker.deadline.asc())
        .all()
    )

    items: list[ReminderPreviewItem] = []
    for application in applications:
        remaining = days_until(application.deadline)
        if remaining is None:
            continue
        if remaining in reminder_days or remaining < 0:
            reason = "Deadline passed" if remaining < 0 else f"Due in {remaining} day(s)"
            items.append(
                ReminderPreviewItem(
                    application_id=application.id,
                    school_name=application.school_name,
                    program_name=application.program_name,
                    deadline=application.deadline,
                    days_left=remaining,
                    reason=reason,
                )
            )
    return items


def send_email_notification(
    subject: str,
    body: str,
    recipient: str,
    smtp_host: Optional[str],
    smtp_port: int,
    smtp_user: Optional[str],
    smtp_password: Optional[str],
    smtp_from: str
) -> tuple[bool, bool, str]:
    """Returns (sent, dry_run, message)."""
    if not smtp_host or not smtp_user or not smtp_password:
        return False, True, "SMTP not configured. Ran in dry-run mode."

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = recipient

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, [recipient], msg.as_string())
        return True, False, "Email sent successfully."
    except Exception as exc:
        return False, True, f"SMTP send failed, dry-run only: {exc}"
