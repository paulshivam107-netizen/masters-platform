from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import AdminEvent, User
from schemas import TelemetryEventIngest, TelemetryEventIngestResponse
from services.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("/events", response_model=TelemetryEventIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_event(
    payload: TelemetryEventIngest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enforce_rate_limit(
        request,
        action="telemetry_ingest",
        limit=180,
        window_seconds=60,
        user_id=current_user.id,
    )
    event = AdminEvent(
        user_id=current_user.id,
        event_name=payload.event_name,
        payload_json=payload.payload_json
    )
    db.add(event)
    db.commit()
    return {"success": True, "event_id": event.id}
