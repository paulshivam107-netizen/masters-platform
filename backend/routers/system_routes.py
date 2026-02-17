from fastapi import APIRouter
from typing import Optional

from fastapi import HTTPException, Query
from sqlalchemy import text

from config import get_settings
from database import engine
from schemas import ProgramCatalogItem, ProgramCatalogSearchResponse
from services.program_catalog import load_program_catalog

router = APIRouter(tags=["system"])
settings = get_settings()


@router.get("/")
def read_root():
    return {"message": "MBA/MS Application Platform API", "status": "running"}


@router.get("/health")
def health_check():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "healthy" if db_status == "ok" else "unhealthy",
        "db_status": db_status,
        "mock_mode": settings.MOCK_MODE,
        "cors_origins": settings.cors_origins_list,
        "app_env": settings.app_env_normalized,
        "message": "Using mock AI reviews (free)" if settings.MOCK_MODE else "Using configured live AI provider"
    }


@router.get("/programs", response_model=ProgramCatalogSearchResponse)
def list_program_catalog(
    query: Optional[str] = Query(default=None, min_length=2, max_length=120),
    limit: int = Query(default=25, ge=1, le=200),
):
    catalog = load_program_catalog()
    if query:
        needle = query.strip().lower()
        catalog = [
            item for item in catalog
            if needle in (item.get("school_name", "").lower())
            or needle in (item.get("program_name", "").lower())
            or needle in (item.get("degree", "").lower())
            or needle in (item.get("country", "").lower())
        ]
    items = [ProgramCatalogItem(**item) for item in catalog[:limit]]
    return {"total": len(catalog), "items": items}


@router.get("/programs/{program_id}", response_model=ProgramCatalogItem)
def get_program_catalog_item(program_id: str):
    catalog = load_program_catalog()
    for item in catalog:
        if item.get("id") == program_id:
            return ProgramCatalogItem(**item)
    raise HTTPException(status_code=404, detail="Program catalog item not found")
