from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import engine
from observability import install_observability
from routers.application_routes import router as application_router
from routers.admin_routes import router as admin_router
from routers.auth_routes import router as auth_router
from routers.essay_routes import router as essay_router
from routers.interview_routes import router as interview_router
from routers.resume_routes import router as resume_router
from routers.feedback_routes import router as feedback_router
from routers.reminder_routes import router as reminder_router
from routers.system_routes import router as system_router
from routers.telemetry_routes import router as telemetry_router
from services.schema import SchemaNotReady, ensure_schema_ready

settings = get_settings()


def ensure_startup_safety():
    if not settings.has_secure_secret_key:
        if settings.is_development_env:
            print(
                "WARNING: Using insecure SECRET_KEY in development. "
                "Set a 32+ character SECRET_KEY for production or pilot."
            )
        else:
            raise RuntimeError(
                "SECRET_KEY must be non-default and at least 32 characters. "
                "Update your environment before starting the API."
            )

    if settings.is_production_like_env and settings.should_expose_dev_auth_tokens:
        raise RuntimeError(
            "EXPOSE_DEV_AUTH_TOKENS cannot be enabled in pilot/staging/production environments."
        )

    if settings.is_production_like_env and settings.has_database_url_placeholder:
        raise RuntimeError(
            "DATABASE_URL contains a placeholder password/token. "
            "Set a real managed database connection string before startup."
        )

    if settings.public_app_url_error:
        raise RuntimeError(settings.public_app_url_error)

    if settings.is_production_like_env and not settings.has_smtp_config:
        raise RuntimeError(
            "SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required in pilot/staging/production "
            "so verification and password-reset emails can be delivered."
        )

    if settings.is_production_like_env and not settings.auth_cookie_secure:
        raise RuntimeError("AUTH_COOKIE_SECURE cannot be disabled in pilot/staging/production environments.")

    if settings.auth_cookie_samesite == "none" and not settings.auth_cookie_secure:
        raise RuntimeError("AUTH_COOKIE_SAMESITE=none requires a secure cookie.")

    if settings.is_production_like_env and settings.cors_has_localhost_origin:
        raise RuntimeError(
            "CORS_ORIGINS cannot contain localhost/127.0.0.1 in pilot/staging/production environments."
        )


ensure_startup_safety()

# The API does not change the schema in pilot/staging/production: it only verifies the
# database is at this release's migration head (see services/schema.py). In development it
# upgrades the local database automatically unless AUTO_MIGRATE_ON_STARTUP=false.
try:
    ensure_schema_ready(engine, settings)
except SchemaNotReady:
    raise
except Exception as exc:
    if settings.is_production_like_env:
        raise RuntimeError(f"Database schema check failed: {exc}") from exc
    print(f"WARNING: database schema check skipped due to error: {exc}")

app = FastAPI(title="MBA/MS Application Platform")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
install_observability(app)

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(application_router)
app.include_router(reminder_router)
app.include_router(essay_router)
app.include_router(interview_router)
app.include_router(resume_router)
app.include_router(feedback_router)
app.include_router(telemetry_router)
app.include_router(admin_router)
