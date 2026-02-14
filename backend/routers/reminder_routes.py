from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from config import get_settings
from database import get_db
from models import User
from schemas import ReminderPreviewResponse, ReminderSendResponse
from services.reminders import get_reminder_matches, send_email_notification

router = APIRouter(prefix="/reminders", tags=["reminders"])
settings = get_settings()


@router.get("/preview", response_model=ReminderPreviewResponse)
async def preview_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = get_reminder_matches(current_user, db)
    return ReminderPreviewResponse(
        notification_email=current_user.notification_email or current_user.email,
        reminders_enabled=bool(current_user.email_reminders_enabled),
        total_matches=len(items),
        items=items
    )


@router.post("/send-test", response_model=ReminderSendResponse)
async def send_test_reminder(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    destination = current_user.notification_email or current_user.email
    items = get_reminder_matches(current_user, db)
    summary_lines = [
        f"- {item.school_name} ({item.program_name}): {item.reason} [{item.deadline}]"
        for item in items[:20]
    ]
    if not summary_lines:
        summary_lines = ["No deadline reminders are due based on your current preferences."]

    body = "\n".join(
        [
            f"Hi {current_user.name},",
            "",
            "Here is your Master's application reminder summary:",
            *summary_lines,
            "",
            "You can adjust reminder windows in Settings > Profile & Preferences."
        ]
    )
    sent, dry_run, message = send_email_notification(
        subject="Your Master's Application Deadline Reminder",
        body=body,
        recipient=destination,
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
        smtp_from=settings.smtp_from_address
    )
    return ReminderSendResponse(
        sent=sent,
        dry_run=dry_run,
        message=message,
        matches=len(items)
    )
