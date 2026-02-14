from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ApplicationTracker, User
from schemas import ApplicationCreate, ApplicationResponse, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    application: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_application = ApplicationTracker(
        user_id=current_user.id,
        school_name=application.school_name,
        program_name=application.program_name,
        application_round=application.application_round,
        deadline=application.deadline,
        application_fee=application.application_fee,
        program_total_fee=application.program_total_fee,
        fee_currency=application.fee_currency,
        essays_required=application.essays_required,
        lors_required=application.lors_required,
        lors_submitted=application.lors_submitted,
        interview_required=application.interview_required,
        interview_completed=application.interview_completed,
        decision_status=application.decision_status,
        requirements_notes=application.requirements_notes,
        status=application.status
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.get("/", response_model=List[ApplicationResponse])
async def get_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    applications = (
        db.query(ApplicationTracker)
        .filter(ApplicationTracker.user_id == current_user.id)
        .order_by(ApplicationTracker.deadline.asc(), ApplicationTracker.school_name.asc())
        .all()
    )
    return applications


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(ApplicationTracker).filter(
        and_(
            ApplicationTracker.id == application_id,
            ApplicationTracker.user_id == current_user.id
        )
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    application_update: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(ApplicationTracker).filter(
        and_(
            ApplicationTracker.id == application_id,
            ApplicationTracker.user_id == current_user.id
        )
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    payload = application_update.model_dump(exclude_unset=True)
    target_lors_required = payload.get("lors_required", application.lors_required or 0)
    target_lors_submitted = payload.get("lors_submitted", application.lors_submitted or 0)
    if target_lors_submitted > target_lors_required:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="lors_submitted cannot exceed lors_required"
        )
    if payload.get("interview_required") is False and payload.get("interview_completed", application.interview_completed):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="interview_completed cannot be true when interview_required is false"
        )
    if payload.get("interview_required") is False:
        payload["interview_completed"] = False

    for field, value in payload.items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)
    return application


@router.delete("/{application_id}")
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(ApplicationTracker).filter(
        and_(
            ApplicationTracker.id == application_id,
            ApplicationTracker.user_id == current_user.id
        )
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(application)
    db.commit()
    return {"message": "Application deleted successfully"}
