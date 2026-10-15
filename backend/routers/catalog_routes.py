"""Programme catalogue routes (R09).

Public: GET /programs and /programs/{id} return published records only, each carrying its
verification status, freshness reason and whether it may autofill an application.
Admin (/admin/catalog): draft -> review -> publish workflow with retained revision history.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import require_admin_user
from catalog_schemas import (
    CatalogAdminListResponse,
    CatalogCycleOut,
    CatalogDraftRequest,
    CatalogPublishRequest,
    CatalogReturnRequest,
    CatalogRevisionOut,
    ProgramCatalogItem,
    ProgramCatalogSearchResponse,
)
from database import get_db
from models import User
from services import program_catalog as catalog

public_router = APIRouter(tags=["programs"])
admin_router = APIRouter(prefix="/catalog", tags=["admin-catalog"])


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


def _run(db: Session, action):
    try:
        return action()
    except catalog.CatalogError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="The catalogue changed concurrently; reload and try again")


@public_router.get("/programs", response_model=ProgramCatalogSearchResponse)
def list_program_catalog(
    query: Optional[str] = Query(default=None, min_length=2, max_length=120),
    limit: int = Query(default=25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    total, items = catalog.list_public(db, query, limit)
    return {"total": total, "items": items}


@public_router.get("/programs/{program_id}", response_model=ProgramCatalogItem)
def get_program_catalog_item(program_id: str, db: Session = Depends(get_db)):
    item = catalog.get_public(db, program_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Program catalog item not found")
    return item


@admin_router.get("", response_model=CatalogAdminListResponse)
def admin_list(response: Response, _: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    _no_store(response)
    return catalog.admin_listing(db)


@admin_router.get("/programs/{program_id}/revisions", response_model=list[CatalogRevisionOut])
def admin_history(program_id: str, response: Response, _: User = Depends(require_admin_user),
                  db: Session = Depends(get_db)):
    _no_store(response)
    return _run(db, lambda: catalog.history(db, program_id))


@admin_router.post("/drafts", response_model=CatalogRevisionOut, status_code=status.HTTP_201_CREATED)
def admin_create_draft(payload: CatalogDraftRequest, admin: User = Depends(require_admin_user),
                       db: Session = Depends(get_db)):
    revision = _run(db, lambda: catalog.create_draft(db, payload.model_dump(), admin.id))
    return catalog.revision_out(revision)


@admin_router.put("/revisions/{revision_id}", response_model=CatalogRevisionOut)
def admin_update_draft(revision_id: int, payload: CatalogDraftRequest, _: User = Depends(require_admin_user),
                       db: Session = Depends(get_db)):
    revision = _run(db, lambda: catalog.update_draft(db, revision_id, payload.model_dump()))
    return catalog.revision_out(revision)


@admin_router.post("/revisions/{revision_id}/submit", response_model=CatalogRevisionOut)
def admin_submit(revision_id: int, _: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    return catalog.revision_out(_run(db, lambda: catalog.submit_for_review(db, revision_id)))


@admin_router.post("/revisions/{revision_id}/return", response_model=CatalogRevisionOut)
def admin_return(revision_id: int, payload: CatalogReturnRequest, _: User = Depends(require_admin_user),
                 db: Session = Depends(get_db)):
    return catalog.revision_out(_run(db, lambda: catalog.return_to_draft(db, revision_id, payload.note)))


@admin_router.post("/revisions/{revision_id}/publish", response_model=CatalogRevisionOut)
def admin_publish(revision_id: int, payload: CatalogPublishRequest, admin: User = Depends(require_admin_user),
                  db: Session = Depends(get_db)):
    revision = _run(db, lambda: catalog.publish(db, revision_id, payload.verification_status, admin.id,
                                                payload.note))
    return catalog.revision_out(revision)


@admin_router.post("/cycles/{cycle_id}/archive", response_model=CatalogCycleOut)
def admin_archive(cycle_id: int, _: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    cycle = _run(db, lambda: catalog.archive_cycle(db, cycle_id))
    return {"id": cycle.id, "cycle": cycle.cycle, "archived": True, "effective_status": "archived"}
