from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import Base, engine
from observability import install_observability
from routers.application_routes import router as application_router
from routers.admin_routes import router as admin_router
from routers.auth_routes import router as auth_router
from routers.essay_routes import router as essay_router
from routers.feedback_routes import router as feedback_router
from routers.reminder_routes import router as reminder_router
from routers.system_routes import router as system_router
from routers.telemetry_routes import router as telemetry_router
from services.migrations import run_schema_migrations

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


ensure_startup_safety()

# Ensure schema exists for local/pilot usage.
Base.metadata.create_all(bind=engine)
run_schema_migrations(engine)

app = FastAPI(title="MBA/MS Application Platform")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
app.include_router(feedback_router)
app.include_router(telemetry_router)
app.include_router(admin_router)
