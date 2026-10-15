"""Browser sessions: short-lived access JWTs plus rotating refresh tokens in an HttpOnly cookie.

Model
-----
* Access token: 15-minute JWT kept in browser memory, sent as ``Authorization: Bearer``.
  It carries ``sid`` (the refresh-token family id); a revoked family stops its access tokens
  immediately rather than at expiry.
* Refresh token: random secret stored only as a SHA-256 hash. Sent to the browser in an
  HttpOnly, Secure, SameSite cookie scoped to ``/auth`` on the API host, so page scripts
  (and therefore XSS) cannot read it.
* Rotation: every refresh revokes the presented token and issues a new one in the same family.
* Reuse detection: presenting an already-rotated token after the grace window means a copy
  was stolen; the whole family is revoked. Inside the grace window it is a concurrent refresh
  from another tab and gets a retryable ``refresh_superseded`` error instead.
* CSRF: cookie-authenticated endpoints (refresh, logout) require a trusted ``Origin`` in
  pilot/staging/production, on top of SameSite. Other endpoints use the bearer header, which
  browsers never attach automatically.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth import create_access_token, generate_refresh_token, hash_refresh_token
from config import Settings
from models import RefreshToken, User

logger = logging.getLogger("mba.sessions")

COOKIE_PATH = "/auth"


class SessionRejected(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_401_UNAUTHORIZED,
                 headers: Optional[dict] = None):
        super().__init__(status_code=status_code, detail={"code": code, "message": message}, headers=headers)


def clear_cookie_header(settings: Settings) -> dict:
    """Set-Cookie header that deletes the refresh cookie, for attaching to error responses
    (cookies set on an injected Response are dropped when an HTTPException is raised)."""
    scratch = Response()
    clear_refresh_cookie(scratch, settings)
    return {"set-cookie": scratch.headers["set-cookie"]}


# --- cookies -------------------------------------------------------------------------------

def set_refresh_cookie(response: Response, settings: Settings, raw_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=raw_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path=COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN or None,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


def clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path=COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN or None,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


def require_trusted_origin(request: Request, settings: Settings) -> None:
    """Reject cross-site use of the refresh cookie (defence in depth beyond SameSite)."""
    origin = request.headers.get("origin")
    if origin is None:
        referer = request.headers.get("referer") or ""
        parts = referer.split("/")
        origin = "/".join(parts[:3]) if len(parts) >= 3 and referer.startswith("http") else None
    if origin is None:
        # Non-browser clients (tests, curl) send no Origin. Browsers always send one on
        # cross-origin fetch/XHR POSTs, so requiring it costs nothing in production.
        if settings.is_production_like_env:
            raise SessionRejected("untrusted_origin", "Request origin is required.", status.HTTP_403_FORBIDDEN)
        return
    if not settings.is_trusted_origin(origin):
        raise SessionRejected("untrusted_origin", "Request origin is not allowed.", status.HTTP_403_FORBIDDEN)


# --- issuing ---------------------------------------------------------------------------------

def issue_session(db: Session, settings: Settings, user: User, response: Response,
                  family_id: Optional[str] = None) -> str:
    """Create a refresh token (new family unless given), set the cookie, return an access token."""
    family = family_id or str(uuid.uuid4())
    raw = generate_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw),
        family_id=family,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    set_refresh_cookie(response, settings, raw)
    return create_access_token(
        {"sub": str(user.id), "sid": family},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def rotate_refresh_token(db: Session, settings: Settings, raw_token: str, response: Response) -> tuple[User, str]:
    """Validate and rotate a refresh token. Returns (user, new access token)."""
    now = datetime.utcnow()
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(raw_token)).first()
    if row is None:
        raise SessionRejected("invalid_refresh", "Your session has ended. Please sign in again.")

    if row.revoked:
        recently_rotated = (
            row.revoked_reason == "rotated"
            and row.rotated_at is not None
            and now - row.rotated_at <= timedelta(seconds=settings.REFRESH_REUSE_GRACE_SECONDS)
        )
        if recently_rotated:
            raise SessionRejected("refresh_superseded",
                                  "This session was just refreshed elsewhere. Retry.",
                                  status.HTTP_409_CONFLICT)
        if row.revoked_reason == "rotated":
            revoke_family(db, row.family_id, "reuse_detected")
            logger.warning("Refresh token reuse detected; revoked session family for user_id=%s", row.user_id)
        raise SessionRejected("invalid_refresh", "Your session has ended. Please sign in again.")

    if row.expires_at <= now:
        _revoke_rows(db, [RefreshToken.id == row.id], "expired")
        db.commit()
        raise SessionRejected("invalid_refresh", "Your session has expired. Please sign in again.")

    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None or not user.is_active:
        revoke_family(db, row.family_id, "inactive_user")
        raise SessionRejected("invalid_refresh", "Your session has ended. Please sign in again.")

    # Atomic claim: only one concurrent request can rotate this row.
    claimed = db.query(RefreshToken).filter(
        and_(RefreshToken.id == row.id, RefreshToken.revoked == False)  # noqa: E712
    ).update({"revoked": True, "revoked_reason": "rotated", "rotated_at": now}, synchronize_session=False)
    if claimed != 1:
        db.rollback()
        raise SessionRejected("refresh_superseded", "This session was just refreshed elsewhere. Retry.",
                              status.HTTP_409_CONFLICT)
    access = issue_session(db, settings, user, response, family_id=row.family_id)
    return user, access


# --- revocation --------------------------------------------------------------------------------

def _revoke_rows(db: Session, conditions: list, reason: str) -> int:
    return db.query(RefreshToken).filter(
        and_(RefreshToken.revoked == False, *conditions)  # noqa: E712
    ).update({"revoked": True, "revoked_reason": reason}, synchronize_session=False)


def revoke_family(db: Session, family_id: str, reason: str) -> int:
    count = _revoke_rows(db, [RefreshToken.family_id == family_id], reason)
    db.commit()
    return count


def revoke_user_sessions(db: Session, user_id: int, reason: str) -> int:
    count = _revoke_rows(db, [RefreshToken.user_id == user_id], reason)
    db.commit()
    return count


def family_for_token(db: Session, raw_token: Optional[str]) -> Optional[RefreshToken]:
    if not raw_token:
        return None
    return db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(raw_token)).first()


def family_is_active(db: Session, family_id: str) -> bool:
    return db.query(RefreshToken.id).filter(
        and_(
            RefreshToken.family_id == family_id,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.utcnow(),
        )
    ).first() is not None
