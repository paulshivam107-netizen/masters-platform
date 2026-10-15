from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from jose import JWTError, jwt
import bcrypt as bcrypt_module
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User
from config import get_settings

# JWT Configuration
ALGORITHM = "HS256"
settings = get_settings()
SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# passlib 1.7.x expects bcrypt.__about__.__version__ which newer bcrypt releases removed.
if not hasattr(bcrypt_module, "__about__"):
    class _BcryptAbout:
        __version__ = getattr(bcrypt_module, "__version__", "unknown")
    bcrypt_module.__about__ = _BcryptAbout()  # type: ignore[attr-defined]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


_DUMMY_HASH = None


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify a password against its hash. Spends the same bcrypt time when there is no
    stored hash, so login timing does not reveal whether an email is registered."""
    global _DUMMY_HASH
    if not hashed_password:
        if _DUMMY_HASH is None:
            _DUMMY_HASH = pwd_context.hash("timing-equaliser")
        pwd_context.verify(plain_password, _DUMMY_HASH)
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "iat": now, "typ": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ", "access") != "access":
            raise JWTError("not an access token")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Tokens issued for a browser session stop working as soon as that session is revoked
    # (logout, password reset, reuse detection), not only when they expire.
    session_id = payload.get("sid")
    if session_id is not None:
        from services.sessions import family_is_active

        if not family_is_active(db, str(session_id)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has ended",
            )

    return user


def is_admin_user(user: User) -> bool:
    if (user.role or "").strip().lower() == "admin":
        return True
    # ADMIN_EMAILS only bootstraps an admin once that mailbox is proven (verified email or
    # Google sign-in). Otherwise anyone could register the founder's address first.
    return bool(user.email_verified) and (user.email or "").strip().lower() in set(settings.admin_email_list)


async def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active or not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Optional: Make authentication optional for some routes
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
