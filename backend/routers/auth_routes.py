import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from auth import (
    decode_token,
    get_current_user,
    get_password_hash,
    is_admin_user,
    verify_password,
)
from config import get_settings
from database import get_db
from models import User
from schemas import (
    EmailActionRequest,
    EmailVerificationConfirmRequest,
    GenericActionResponse,
    GoogleAuthConfigResponse,
    GoogleLoginRequest,
    LogoutRequest,
    PasswordResetConfirmRequest,
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
)
from services.auth_flows import (
    EMAIL_VERIFY_PURPOSE,
    PASSWORD_RESET_PURPOSE,
    consume_one_time_token,
    issue_one_time_token,
    send_password_reset_email,
    send_verification_email,
)
from services.rate_limit import enforce_rate_limit
from services.sessions import (
    SessionRejected,
    clear_cookie_header,
    clear_refresh_cookie,
    family_for_token,
    issue_session,
    require_trusted_origin,
    revoke_family,
    revoke_user_sessions,
    rotate_refresh_token,
)

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except Exception:  # pragma: no cover - optional dependency fallback
    google_id_token = None
    google_requests = None
    GOOGLE_AUTH_IMPORT_ERROR = "google-auth runtime import failed (install google-auth and requests)"
else:
    GOOGLE_AUTH_IMPORT_ERROR = None

logger = logging.getLogger("mba.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def verify_google_identity_token(token_value: str) -> tuple[str, str]:
    """Returns (email, display_name)."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_ID is not configured")
    if not google_id_token or not google_requests:
        raise HTTPException(status_code=503, detail=GOOGLE_AUTH_IMPORT_ERROR or "google-auth dependency is not installed")

    try:
        id_info = google_id_token.verify_oauth2_token(
            token_value,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except Exception as exc:
        logger.info("Google token verification failed: %s", type(exc).__name__)
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified. Please try again.") from exc

    email = id_info.get("email")
    display_name = id_info.get("name") or (email.split("@")[0] if email else "Google User")
    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")
    if id_info.get("email_verified") is False:
        raise HTTPException(status_code=400, detail="Verify this email with Google before signing in")
    return email, display_name


def promote_bootstrap_admin(user: User, db: Session) -> None:
    if is_admin_user(user) and user.role != "admin":
        user.role = "admin"
        db.commit()
        db.refresh(user)


def token_response(user: User, access_token: str) -> dict:
    # The refresh token is never returned to page scripts; it travels only in the HttpOnly cookie.
    return {"access_token": access_token, "refresh_token": None, "token_type": "bearer", "user": user}


def start_session(user: User, db: Session, response: Response) -> dict:
    promote_bootstrap_admin(user, db)
    return token_response(user, issue_session(db, settings, user, response))


@router.get("/google/config", response_model=GoogleAuthConfigResponse)
def google_auth_config():
    client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
    if not client_id:
        return {"enabled": False, "client_id": None}
    return {"enabled": True, "client_id": client_id}


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_signup",
        limit=10,
        window_seconds=10 * 60,
        email=user_data.email,
    )
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password),
        email_verified=False,
        # ADMIN_EMAILS grants admin only after the mailbox is verified (see is_admin_user).
        role="user",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    # The account exists at this point; an email problem must not turn signup into an error.
    # The user can request a fresh verification link later.
    try:
        verification_token = issue_one_time_token(db, new_user, EMAIL_VERIFY_PURPOSE, ttl_minutes=60 * 24)
        sent, dry_run, _ = send_verification_email(settings, new_user.email, verification_token)
        if not sent and not dry_run:
            logger.warning("Signup verification email delivery failed for user_id=%s", new_user.id)
    except Exception:
        logger.exception("Signup verification email could not be prepared for user_id=%s", new_user.id)
    return start_session(new_user, db, response)


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_login",
        limit=30,
        window_seconds=10 * 60,
        email=user_data.email,
    )
    user = db.query(User).filter(User.email == user_data.email).first()
    password_ok = verify_password(user_data.password, user.hashed_password if user else None)
    if not user or not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive")
    return start_session(user, db, response)


@router.post("/google", response_model=Token)
def login_with_google(payload: GoogleLoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_google",
        limit=25,
        window_seconds=10 * 60,
    )
    email, display_name = verify_google_identity_token(payload.id_token)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=display_name,
            hashed_password=None,
            notification_email=email,
            email_provider="gmail",
            email_verified=True,
            role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.email_verified:
        # Someone registered this address with a password but never proved they own it.
        # Google has now proved ownership: drop that unverified password and its sessions
        # so a pre-registered account cannot be used to watch the real owner's data.
        user.hashed_password = None
        user.email_verified = True
        db.commit()
        revoke_user_sessions(db, user.id, "ownership_proven")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive")
    return start_session(user, db, response)


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    db: Session = Depends(get_db),
):
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    # Legacy clients stored the refresh token themselves and send it in the body. That path is
    # kept so existing sessions migrate to the cookie on their next refresh.
    raw_token = cookie_token or (payload.refresh_token if payload else None)
    # Every page load asks this; with no token there is nothing to check or brute-force, so
    # answer before the database-backed rate limiter (it cost new visitors about a second).
    if not raw_token:
        raise SessionRejected("no_session", "You are not signed in.")
    enforce_rate_limit(
        request,
        db=db,
        action="auth_refresh",
        limit=120,
        window_seconds=10 * 60,
    )
    if cookie_token:
        require_trusted_origin(request, settings)
    try:
        user, access_token = rotate_refresh_token(db, settings, raw_token, response)
    except SessionRejected as exc:
        if exc.detail.get("code") == "refresh_superseded":
            raise
        # A dead refresh cookie is removed so the browser stops presenting it.
        raise SessionRejected(exc.detail["code"], exc.detail["message"], exc.status_code,
                              headers=clear_cookie_header(settings)) from None
    promote_bootstrap_admin(user, db)
    return token_response(user, access_token)


@router.post("/logout")
def logout_session(
    request: Request,
    response: Response,
    payload: LogoutRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_logout",
        limit=120,
        window_seconds=10 * 60,
    )
    payload = payload or LogoutRequest()
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token:
        require_trusted_origin(request, settings)
    clear_refresh_cookie(response, settings)

    # Identify the session from the cookie, a legacy body token, or the access token's sid.
    claims = None
    if credentials is not None:
        try:
            claims = decode_token(credentials.credentials)
        except HTTPException:
            claims = None
    row = family_for_token(db, cookie_token or payload.refresh_token)
    family_id = row.family_id if row else (claims or {}).get("sid")
    user_id = row.user_id if row else (int(claims["sub"]) if claims and claims.get("sub") else None)

    if payload.all_sessions:
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to end all sessions")
        revoke_user_sessions(db, user_id, "logout_all")
        return {"success": True, "revoked": "all"}
    if family_id:
        revoke_family(db, str(family_id), "logout")
    return {"success": True, "revoked": "current"}


@router.post("/request-email-verification", response_model=GenericActionResponse)
def request_email_verification(payload: EmailActionRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_request_email_verification",
        limit=20,
        window_seconds=10 * 60,
        email=payload.email,
    )
    # Same response whether or not the account exists or is already verified,
    # so this endpoint cannot be used to discover registered emails.
    response = {
        "success": True,
        "message": "If an unverified account exists for this email, a verification link has been sent.",
    }
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or user.email_verified:
        return response

    token = issue_one_time_token(db, user, EMAIL_VERIFY_PURPOSE, ttl_minutes=60 * 24)
    sent, dry_run, _ = send_verification_email(settings, user.email, token)
    if not sent and not dry_run:
        logger.warning("Verification email delivery failed for user_id=%s", user.id)
    if dry_run and settings.should_expose_dev_auth_tokens:
        response["dev_token"] = token
    return response


@router.post("/verify-email", response_model=GenericActionResponse)
def verify_email(payload: EmailVerificationConfirmRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_verify_email",
        limit=20,
        window_seconds=10 * 60,
    )
    user = consume_one_time_token(db, payload.token, EMAIL_VERIFY_PURPOSE)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    user.email_verified = True
    db.commit()
    return {"success": True, "message": "Email verified successfully."}


@router.post("/forgot-password", response_model=GenericActionResponse)
def forgot_password(payload: EmailActionRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_forgot_password",
        limit=20,
        window_seconds=10 * 60,
        email=payload.email,
    )
    # Same response for known and unknown emails (no account enumeration).
    response = {"success": True, "message": "If an account exists for this email, a reset link has been sent."}
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return response

    token = issue_one_time_token(db, user, PASSWORD_RESET_PURPOSE, ttl_minutes=60)
    sent, dry_run, _ = send_password_reset_email(settings, user.email, token)
    if not sent and not dry_run:
        logger.warning("Password reset email delivery failed for user_id=%s", user.id)
    if dry_run and settings.should_expose_dev_auth_tokens:
        response["dev_token"] = token
    return response


@router.post("/reset-password", response_model=GenericActionResponse)
def reset_password(payload: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        db=db,
        action="auth_reset_password",
        limit=20,
        window_seconds=10 * 60,
    )
    user = consume_one_time_token(db, payload.token, PASSWORD_RESET_PURPOSE)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user.hashed_password = get_password_hash(payload.new_password)
    # Receiving the reset link proves control of the mailbox.
    user.email_verified = True
    db.commit()
    revoke_user_sessions(db, user.id, "password_reset")
    return {"success": True, "message": "Password updated successfully. Please log in again."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payload = profile_update.model_dump(exclude_unset=True)
    if "preferred_currency" in payload and payload["preferred_currency"]:
        payload["preferred_currency"] = payload["preferred_currency"].upper()
    if "notification_email" in payload and not payload["notification_email"]:
        payload["notification_email"] = current_user.email

    for field, value in payload.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
