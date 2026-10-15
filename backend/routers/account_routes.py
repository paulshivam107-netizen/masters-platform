"""Account data export and account deletion (R06). See services/account_data.py and
docs/DATA_RETENTION.md."""
import logging
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import decode_token, get_current_user, verify_password
from config import get_settings
from database import get_db
from models import AdminEvent, RefreshToken, User
from services.account_data import DeletionBlocked, build_export, delete_account
from services.rate_limit import enforce_rate_limit
from services.sessions import clear_refresh_cookie

logger = logging.getLogger("mba.account")
router = APIRouter(prefix="/account", tags=["account"])
settings = get_settings()

# A Google-only account has no password to re-enter. It may delete itself when the current
# browser session began (a fresh sign-in, not a token refresh) within this window, or by
# presenting a fresh Google ID token.
RECENT_LOGIN_SECONDS = 10 * 60


class AccountDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirm: Literal["DELETE"]
    password: Optional[str] = Field(default=None, max_length=256)
    google_id_token: Optional[str] = Field(default=None, max_length=4096)


def _reauth_error(code: str, message: str) -> HTTPException:
    # 403 rather than 401: the session is valid, so the client must not try to refresh it.
    return HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": code, "message": message})


def _session_started_recently(db: Session, claims: dict) -> bool:
    family = claims.get("sid")
    if not family:
        return False
    started = db.query(func.min(RefreshToken.created_at)).filter(
        RefreshToken.family_id == str(family), RefreshToken.user_id == int(claims["sub"])).scalar()
    return started is not None and datetime.utcnow() - started <= timedelta(seconds=RECENT_LOGIN_SECONDS)


def require_reauthentication(db: Session, user: User, payload: AccountDeleteRequest, claims: dict) -> None:
    if user.hashed_password:
        if not payload.password or not verify_password(payload.password, user.hashed_password):
            raise _reauth_error("reauth_failed", "Your password was not correct.")
        return
    if payload.google_id_token:
        from routers.auth_routes import verify_google_identity_token

        email, _ = verify_google_identity_token(payload.google_id_token)
        if email.strip().lower() != (user.email or "").strip().lower():
            raise _reauth_error("reauth_failed", "That Google account does not match this account.")
        return
    if not _session_started_recently(db, claims):
        raise _reauth_error(
            "reauth_required",
            "For your security, sign out and sign in with Google again, then delete within 10 minutes.",
        )


@router.get("/export")
def export_account(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_rate_limit(request, action="account_export", limit=10, window_seconds=60 * 60, user_id=user.id)
    archive = build_export(db, user)
    db.add(AdminEvent(user_id=user.id, event_name="account_exported", payload_json=None))
    db.commit()
    filename = f"masters-account-export-{datetime.utcnow().date().isoformat()}.json"
    return JSONResponse(archive, headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    })


@router.post("/delete")
def delete_my_account(
    payload: AccountDeleteRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, action="account_delete", limit=5, window_seconds=10 * 60, user_id=user.id)
    require_reauthentication(db, user, payload, decode_token(credentials.credentials))
    try:
        counts = delete_account(db, user)
    except DeletionBlocked:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail={
            "code": "operation_in_progress",
            "message": "An interview or résumé step is still running. Wait a minute and try again.",
        }) from None
    logger.info("Account deleted (rows: %s)", sum(counts.values()))
    clear_refresh_cookie(response, settings)
    response.headers["Cache-Control"] = "no-store"
    return {"deleted": True, "counts": counts}
