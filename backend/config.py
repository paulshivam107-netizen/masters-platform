from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_VALUES = {"", "your-secret-key-change-in-production", "changeme", "secret", "default"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./mba_platform.db"
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

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: Optional[str] = None
    ADMIN_EMAILS: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
