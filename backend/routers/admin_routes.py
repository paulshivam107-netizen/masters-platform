from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from auth import require_admin_user
from database import get_db
from models import AdminEvent, ApplicationTracker, Essay, PilotFeedback, User
from schemas import (
    AdminEventCoverageResponse,
    AdminEventBreakdownRow,
    AdminEventRow,
    AdminFeedbackRow,
    AdminOverviewResponse,
    AdminProgramCatalogUpsertRequest,
    AdminRoleUpdateRequest,
    AdminRoleUpdateResponse,
    AdminUserRow,
    ProgramCatalogItem,
)
from services.program_catalog import build_program_id, load_program_catalog, save_program_catalog

router = APIRouter(prefix="/admin", tags=["admin"])

REQUIRED_EVENT_COVERAGE = [
    "auth_login_success",
    "auth_signup_success",
    "ui_create_application_clicked",
    "ui_create_essay_clicked",
    "ui_right_sidebar_essay_selected",
    "ui_error_boundary_triggered",
]


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0  # noqa: E712
    verified_users = db.query(func.count(User.id)).filter(User.email_verified == True).scalar() or 0  # noqa: E712
    admin_users = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0

    total_applications = db.query(func.count(ApplicationTracker.id)).scalar() or 0
    total_essays = db.query(func.count(Essay.id)).scalar() or 0
    total_feedback = db.query(func.count(PilotFeedback.id)).scalar() or 0
    total_events = db.query(func.count(AdminEvent.id)).scalar() or 0

    recent_feedback_7d = (
        db.query(func.count(PilotFeedback.id))
        .filter(PilotFeedback.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    recent_events_7d = (
        db.query(func.count(AdminEvent.id))
        .filter(AdminEvent.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    dau_users_1d = (
        db.query(func.count(func.distinct(AdminEvent.user_id)))
        .filter(and_(AdminEvent.created_at >= one_day_ago, AdminEvent.user_id.isnot(None)))
        .scalar()
        or 0
    )
    wau_users_7d = (
        db.query(func.count(func.distinct(AdminEvent.user_id)))
        .filter(and_(AdminEvent.created_at >= seven_days_ago, AdminEvent.user_id.isnot(None)))
        .scalar()
        or 0
    )
    new_users_7d = (
        db.query(func.count(User.id))
        .filter(User.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    activated_users_7d = (
        db.query(func.count(func.distinct(User.id)))
        .join(ApplicationTracker, ApplicationTracker.user_id == User.id)
        .join(Essay, Essay.user_id == User.id)
        .filter(User.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    activation_rate_7d = round((activated_users_7d / new_users_7d) * 100, 2) if new_users_7d else 0.0
    applications_created_7d = (
        db.query(func.count(ApplicationTracker.id))
        .filter(ApplicationTracker.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    essays_created_7d = (
        db.query(func.count(Essay.id))
        .filter(Essay.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    api_error_events_7d = (
        db.query(func.count(AdminEvent.id))
        .filter(
            and_(
                AdminEvent.created_at >= seven_days_ago,
                or_(
                    AdminEvent.event_name.like("%failure%"),
                    AdminEvent.event_name.like("%error%"),
                )
            )
        )
        .scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "admin_users": admin_users,
        "total_applications": total_applications,
        "total_essays": total_essays,
        "total_feedback": total_feedback,
        "total_events": total_events,
        "recent_feedback_7d": recent_feedback_7d,
        "recent_events_7d": recent_events_7d,
        "dau_users_1d": dau_users_1d,
        "wau_users_7d": wau_users_7d,
        "new_users_7d": new_users_7d,
        "activated_users_7d": activated_users_7d,
        "activation_rate_7d": activation_rate_7d,
        "applications_created_7d": applications_created_7d,
        "essays_created_7d": essays_created_7d,
        "api_error_events_7d": api_error_events_7d,
    }


@router.get("/users", response_model=list[AdminUserRow])
async def get_admin_users(
    limit: int = Query(default=30, ge=1, le=200),
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(
            User.id,
            User.email,
            User.name,
            User.role,
            User.email_verified,
            User.created_at,
            func.count(func.distinct(Essay.id)).label("essays_count"),
            func.count(func.distinct(ApplicationTracker.id)).label("applications_count"),
        )
        .outerjoin(Essay, Essay.user_id == User.id)
        .outerjoin(ApplicationTracker, ApplicationTracker.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "email": row.email,
            "name": row.name,
            "role": row.role or "user",
            "email_verified": bool(row.email_verified),
            "created_at": row.created_at,
            "essays_count": int(row.essays_count or 0),
            "applications_count": int(row.applications_count or 0),
        }
        for row in rows
    ]


@router.get("/events", response_model=list[AdminEventRow])
async def get_admin_events(
    limit: int = Query(default=60, ge=1, le=300),
    name: Optional[str] = Query(default=None, min_length=2, max_length=120),
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(AdminEvent)
    if name:
        query = query.filter(AdminEvent.event_name == name.strip().lower())

    rows = query.order_by(AdminEvent.created_at.desc()).limit(limit).all()
    return rows


@router.get("/feedback", response_model=list[AdminFeedbackRow])
async def get_admin_feedback(
    limit: int = Query(default=30, ge=1, le=200),
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(PilotFeedback, User.email)
        .join(User, User.id == PilotFeedback.user_id)
        .order_by(PilotFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": feedback.id,
            "user_id": feedback.user_id,
            "user_email": email,
            "category": feedback.category,
            "message": feedback.message,
            "page_context": feedback.page_context,
            "created_at": feedback.created_at,
        }
        for feedback, email in rows
    ]


@router.get("/events/breakdown", response_model=list[AdminEventBreakdownRow])
async def get_admin_events_breakdown(
    limit: int = Query(default=10, ge=1, le=50),
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(AdminEvent.event_name, func.count(AdminEvent.id).label("count"))
        .group_by(AdminEvent.event_name)
        .order_by(func.count(AdminEvent.id).desc())
        .limit(limit)
        .all()
    )
    return [{"event_name": row.event_name, "count": int(row.count)} for row in rows]


@router.get("/events/coverage", response_model=AdminEventCoverageResponse)
async def get_admin_events_coverage(
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    rows = (
        db.query(AdminEvent.event_name, func.count(AdminEvent.id).label("count"))
        .filter(
            and_(
                AdminEvent.created_at >= seven_days_ago,
                AdminEvent.event_name.in_(REQUIRED_EVENT_COVERAGE),
            )
        )
        .group_by(AdminEvent.event_name)
        .all()
    )
    counts = {row.event_name: int(row.count) for row in rows}
    items = [
        {"event_name": event_name, "count_7d": counts.get(event_name, 0), "covered": counts.get(event_name, 0) > 0}
        for event_name in REQUIRED_EVENT_COVERAGE
    ]
    missing_events = [item["event_name"] for item in items if not item["covered"]]
    return {
        "required_events": len(REQUIRED_EVENT_COVERAGE),
        "tracked_events_7d": len(REQUIRED_EVENT_COVERAGE) - len(missing_events),
        "missing_events": missing_events,
        "items": items,
    }


@router.patch("/users/{user_id}/role", response_model=AdminRoleUpdateResponse)
async def update_user_role(
    user_id: int,
    payload: AdminRoleUpdateRequest,
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    normalized_role = (payload.role or "").strip().lower()
    allowed_roles = {"user", "admin"}
    if normalized_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(sorted(allowed_roles))}"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_admin.id and normalized_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access."
        )

    if user.role == "admin" and normalized_role != "admin":
        current_admin_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
        if current_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one admin user is required."
            )

    user.role = normalized_role
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}


@router.post("/programs", response_model=ProgramCatalogItem, status_code=status.HTTP_201_CREATED)
async def create_program_catalog_item(
    payload: AdminProgramCatalogUpsertRequest,
    _: User = Depends(require_admin_user),
):
    catalog = load_program_catalog()
    requested_id = (payload.id or "").strip().lower()
    program_id = requested_id or build_program_id(payload.school_name, payload.program_name, payload.degree)
    if any(item.get("id") == program_id for item in catalog):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Program catalog item id already exists")

    item = ProgramCatalogItem(
        id=program_id,
        school_name=payload.school_name,
        program_name=payload.program_name,
        degree=payload.degree,
        country=payload.country,
        city=payload.city,
        application_fee=payload.application_fee,
        fee_currency=payload.fee_currency,
        deadline_round_1=payload.deadline_round_1,
        deadline_round_2=payload.deadline_round_2,
        source_url=payload.source_url,
        last_updated=payload.last_updated,
        confidence=payload.confidence,
    )
    catalog.append(item.model_dump())
    save_program_catalog(catalog)
    return item


@router.put("/programs/{program_id}", response_model=ProgramCatalogItem)
async def update_program_catalog_item(
    program_id: str,
    payload: AdminProgramCatalogUpsertRequest,
    _: User = Depends(require_admin_user),
):
    catalog = load_program_catalog()
    index = next((idx for idx, item in enumerate(catalog) if item.get("id") == program_id), None)
    if index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program catalog item not found")

    item = ProgramCatalogItem(
        id=program_id,
        school_name=payload.school_name,
        program_name=payload.program_name,
        degree=payload.degree,
        country=payload.country,
        city=payload.city,
        application_fee=payload.application_fee,
        fee_currency=payload.fee_currency,
        deadline_round_1=payload.deadline_round_1,
        deadline_round_2=payload.deadline_round_2,
        source_url=payload.source_url,
        last_updated=payload.last_updated,
        confidence=payload.confidence,
    )
    catalog[index] = item.model_dump()
    save_program_catalog(catalog)
    return item


@router.delete("/programs/{program_id}", status_code=status.HTTP_200_OK)
async def delete_program_catalog_item(
    program_id: str,
    _: User = Depends(require_admin_user),
):
    catalog = load_program_catalog()
    next_catalog = [item for item in catalog if item.get("id") != program_id]
    if len(next_catalog) == len(catalog):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program catalog item not found")
    save_program_catalog(next_catalog)
    return {"deleted": True, "id": program_id}
