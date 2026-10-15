from functools import lru_cache
from typing import Optional
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_VALUES = {"", "your-secret-key-change-in-production", "changeme", "secret", "default"}


def sqlalchemy_url(url: str) -> str:
    """Normalise provider-style URLs for SQLAlchemy 2 (which rejects the postgres:// scheme)."""
    url = (url or "").strip()
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./mba_platform.db"
    # Schema-owner connection used only by migrations (Neon: direct, non-pooled endpoint).
    # DATABASE_URL should then use a restricted runtime role. Falls back to DATABASE_URL.
    MIGRATION_DATABASE_URL: Optional[str] = None
    # Small explicit pool per API process. Neon's pooled endpoint multiplexes behind this.
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT_SECONDS: int = 10
    DB_POOL_RECYCLE_SECONDS: int = 300
    # Development convenience: upgrade the schema at startup. Never honoured in
    # pilot/staging/production, where a release step runs migrations instead.
    AUTO_MIGRATE_ON_STARTUP: bool = True
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    MOCK_MODE: bool = True
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GOOGLE_CLIENT_ID: Optional[str] = None
    APP_ENV: str = "development"
    EXPOSE_DEV_AUTH_TOKENS: Optional[bool] = None

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    # Browser-facing origin of the frontend, used to build links in auth emails.
    # Must be an origin only (scheme + host [+ port]); production-like envs require HTTPS.
    PUBLIC_APP_URL: str = "http://localhost:3000"

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: Optional[str] = None
    ADMIN_EMAILS: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.is_development_env:
            origins.extend(["http://localhost:3002", "http://127.0.0.1:3002"])

        deduped: list[str] = []
        seen: set[str] = set()
        for origin in origins:
            if origin in seen:
                continue
            seen.add(origin)
            deduped.append(origin)
        return deduped

    @field_validator("EXPOSE_DEV_AUTH_TOKENS", mode="before")
    @classmethod
    def normalize_optional_bool(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @property
    def smtp_from_address(self) -> str:
        return self.SMTP_FROM or self.SMTP_USER or "no-reply@masters-app.local"

    @property
    def admin_email_list(self) -> list[str]:
        return [email.strip().lower() for email in self.ADMIN_EMAILS.split(",") if email.strip()]

    @property
    def app_env_normalized(self) -> str:
        return (self.APP_ENV or "development").strip().lower()

    @property
    def is_production_like_env(self) -> bool:
        return self.app_env_normalized in {"pilot", "staging", "production", "prod"}

    @property
    def is_development_env(self) -> bool:
        return self.app_env_normalized in {"development", "dev", "local", "test"}

    @property
    def should_expose_dev_auth_tokens(self) -> bool:
        if self.EXPOSE_DEV_AUTH_TOKENS is not None:
            return bool(self.EXPOSE_DEV_AUTH_TOKENS)
        return self.is_development_env

    @property
    def has_secure_secret_key(self) -> bool:
        normalized = (self.SECRET_KEY or "").strip().lower()
        return len((self.SECRET_KEY or "").strip()) >= 32 and normalized not in DEFAULT_SECRET_VALUES

    @property
    def database_url_normalized(self) -> str:
        return (self.DATABASE_URL or "").strip()

    @property
    def is_postgres_database(self) -> bool:
        normalized = self.database_url_normalized.lower()
        return normalized.startswith("postgresql://") or normalized.startswith("postgres://")

    @property
    def has_database_url_placeholder(self) -> bool:
        normalized = self.database_url_normalized.lower()
        # Common placeholder tokens copied from templates/UIs.
        return "[your-password]" in normalized or "your-password" in normalized

    @property
    def public_app_url_error(self) -> Optional[str]:
        """Return a human-readable problem with PUBLIC_APP_URL, or None when it is usable."""
        raw = (self.PUBLIC_APP_URL or "").strip()
        if not raw:
            return "PUBLIC_APP_URL is empty."
        try:
            parts = urlsplit(raw)
            parts.port  # raises ValueError for a malformed port
        except ValueError:
            return "PUBLIC_APP_URL is not a valid URL."
        if parts.scheme not in {"http", "https"} or not parts.hostname:
            return "PUBLIC_APP_URL must be an absolute http(s) URL such as https://app.example.com."
        if parts.username or parts.password:
            return "PUBLIC_APP_URL must not contain credentials."
        if parts.path not in {"", "/"} or parts.query or parts.fragment:
            return "PUBLIC_APP_URL must be an origin only, without a path, query or fragment."
        if self.is_production_like_env:
            if parts.scheme != "https":
                return "PUBLIC_APP_URL must use https in pilot/staging/production environments."
            if parts.hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
                return "PUBLIC_APP_URL cannot point to localhost in pilot/staging/production environments."
        return None

    @property
    def public_app_origin(self) -> str:
        error = self.public_app_url_error
        if error:
            raise ValueError(error)
        parts = urlsplit(self.PUBLIC_APP_URL.strip())
        return f"{parts.scheme}://{parts.netloc}".lower()

    @property
    def has_smtp_config(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def cors_has_localhost_origin(self) -> bool:
        if not self.cors_origins_list:
            return False
        return any("localhost" in origin or "127.0.0.1" in origin for origin in self.cors_origins_list)


@lru_cache
def get_settings() -> Settings:
    return Settings()
