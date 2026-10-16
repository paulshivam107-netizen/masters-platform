from fastapi import APIRouter
from sqlalchemy import text

from config import get_settings
from database import engine
from routers.catalog_routes import public_router as catalog_public_router
from services.schema import schema_status

router = APIRouter(tags=["system"])
settings = get_settings()


@router.get("/")
def read_root():
    return {"message": "MBA/MS Application Platform API", "status": "running"}


@router.get("/health")
def health_check():
    # Liveness probe: keep this fast and DB-independent so container health
    # does not flap when managed Postgres is slow/unavailable.
    return {
        "status": "healthy",
        "db_status": "unknown",
        "mock_mode": settings.MOCK_MODE,
        "cors_origins": settings.cors_origins_list,
        "app_env": settings.app_env_normalized,
        "message": "Using mock AI reviews (free)" if settings.MOCK_MODE else "Using configured live AI provider"
    }


@router.get("/health/db")
def db_health_check():
    db_status = "ok"
    schema = {"schema_revision": None, "schema_head": None, "schema_current": False}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        status = schema_status(engine)
        schema = {"schema_revision": status.current, "schema_head": status.head,
                  "schema_current": status.is_current}
    except Exception:
        db_status = "error"

    healthy = db_status == "ok" and schema["schema_current"]
    return {
        "status": "healthy" if healthy else "unhealthy",
        "db_status": db_status,
        **schema,
        "mock_mode": settings.MOCK_MODE,
        "cors_origins": settings.cors_origins_list,
        "app_env": settings.app_env_normalized,
        "message": "Using mock AI reviews (free)" if settings.MOCK_MODE else "Using configured live AI provider"
    }


# Public programme catalogue (R09): published, DB-backed records only.
router.include_router(catalog_public_router)
