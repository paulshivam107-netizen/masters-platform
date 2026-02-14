from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import PilotFeedback, User
from schemas import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = PilotFeedback(
        user_id=current_user.id,
        category=(payload.category or "general").strip().lower(),
        message=payload.message.strip(),
        page_context=payload.page_context.strip().lower() if payload.page_context else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
