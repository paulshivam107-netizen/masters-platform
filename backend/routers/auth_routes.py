from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    generate_refresh_token,
    get_current_user,
    get_password_hash,
    hash_refresh_token,
    is_admin_user,
    verify_password,
)
from config import get_settings
from database import get_db
from models import RefreshToken, User
from schemas import (
    EmailActionRequest,
    EmailVerificationConfirmRequest,
    GenericActionResponse,
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

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except Exception:  # pragma: no cover - optional dependency fallback
    google_id_token = None
    google_requests = None

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def verify_google_identity_token(token_value: str) -> tuple[str, str]:
    """Returns (email, display_name)."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_ID is not configured")
    if not google_id_token or not google_requests:
        raise HTTPException(status_code=503, detail="google-auth dependency is not installed")

    try:
        id_info = google_id_token.verify_oauth2_token(
            token_value,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Google token verification failed: {exc}") from exc

    email = id_info.get("email")
    display_name = id_info.get("name") or (email.split("@")[0] if email else "Google User")
    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")
    return email, display_name


def issue_auth_tokens(user: User, db: Session) -> dict:
    if is_admin_user(user) and user.role != "admin":
        user.role = "admin"
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    raw_refresh_token = generate_refresh_token()
    refresh_token_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh_token),
        expires_at=refresh_token_expires_at
    )
    db.add(refresh_token_row)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        action="auth_signup",
        limit=10,
        window_seconds=10 * 60,
        email=user_data.email,
    )
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        email_verified=False,
        role="admin" if user_data.email.strip().lower() in set(settings.admin_email_list) else "user"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    verification_token = issue_one_time_token(db, new_user, EMAIL_VERIFY_PURPOSE, ttl_minutes=60 * 24)
    send_verification_email(settings, new_user.email, verification_token)
    return issue_auth_tokens(new_user, db)


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        action="auth_login",
        limit=30,
        window_seconds=10 * 60,
        email=user_data.email,
    )
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return issue_auth_tokens(user, db)


@router.post("/google", response_model=Token)
def login_with_google(payload: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
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
            hashed_password=get_password_hash(f"google::{email}::{datetime.utcnow().timestamp()}"),
            notification_email=email,
            email_provider="gmail",
            email_verified=True,
            role="admin" if email.strip().lower() in set(settings.admin_email_list) else "user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return issue_auth_tokens(user, db)


@router.post("/refresh", response_model=Token)
def refresh_access_token(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        action="auth_refresh",
        limit=120,
        window_seconds=10 * 60,
    )
    token_hash = hash_refresh_token(payload.refresh_token)
    refresh_token_row = db.query(RefreshToken).filter(
        and_(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False  # noqa: E712
        )
    ).first()
    if not refresh_token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if refresh_token_row.expires_at <= datetime.utcnow():
        refresh_token_row.revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.query(User).filter(User.id == refresh_token_row.user_id).first()
    if not user:
        refresh_token_row.revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    refresh_token_row.revoked = True
    db.commit()
    return issue_auth_tokens(user, db)


@router.post("/logout")
def logout_session(
    payload: LogoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enforce_rate_limit(
        request,
        action="auth_logout",
        limit=120,
        window_seconds=10 * 60,
        user_id=current_user.id,
    )
    if payload.all_sessions:
        db.query(RefreshToken).filter(
            and_(
                RefreshToken.user_id == current_user.id,
                RefreshToken.revoked == False  # noqa: E712
            )
        ).update({"revoked": True})
        db.commit()
        return {"success": True, "revoked": "all"}

    if payload.refresh_token:
        token_hash = hash_refresh_token(payload.refresh_token)
        token_row = db.query(RefreshToken).filter(
            and_(
                RefreshToken.user_id == current_user.id,
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False  # noqa: E712
            )
        ).first()
        if token_row:
            token_row.revoked = True
            db.commit()
    return {"success": True, "revoked": "current"}


@router.post("/request-email-verification", response_model=GenericActionResponse)
def request_email_verification(payload: EmailActionRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        action="auth_request_email_verification",
        limit=20,
        window_seconds=10 * 60,
        email=payload.email,
    )
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"success": True, "message": "If the email exists, a verification link has been sent."}
    if user.email_verified:
        return {"success": True, "message": "Email is already verified."}

    token = issue_one_time_token(db, user, EMAIL_VERIFY_PURPOSE, ttl_minutes=60 * 24)
    sent, dry_run, message = send_verification_email(settings, user.email, token)
    response = {
        "success": True,
        "message": message if sent else ("Verification generated in dry-run mode." if dry_run else message),
    }
    if dry_run and settings.should_expose_dev_auth_tokens:
        response["dev_token"] = token
    return response


@router.post("/verify-email", response_model=GenericActionResponse)
def verify_email(payload: EmailVerificationConfirmRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
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
        action="auth_forgot_password",
        limit=20,
        window_seconds=10 * 60,
        email=payload.email,
    )
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"success": True, "message": "If the email exists, a reset link has been sent."}

    token = issue_one_time_token(db, user, PASSWORD_RESET_PURPOSE, ttl_minutes=60)
    sent, dry_run, message = send_password_reset_email(settings, user.email, token)
    response = {
        "success": True,
        "message": message if sent else ("Reset generated in dry-run mode." if dry_run else message),
    }
    if dry_run and settings.should_expose_dev_auth_tokens:
        response["dev_token"] = token
    return response


@router.post("/reset-password", response_model=GenericActionResponse)
def reset_password(payload: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(
        request,
        action="auth_reset_password",
        limit=20,
        window_seconds=10 * 60,
    )
    user = consume_one_time_token(db, payload.token, PASSWORD_RESET_PURPOSE)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user.hashed_password = get_password_hash(payload.new_password)
    db.query(RefreshToken).filter(
        and_(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked == False  # noqa: E712
        )
    ).update({"revoked": True})
    db.commit()
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
