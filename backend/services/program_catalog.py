"""DB-backed programme catalogue (R09).

Model: programme -> admissions cycle -> revisions (+ rounds). Admins create a draft revision,
submit it for review, and a reviewer publishes it as verified or unverified. Publishing a
correction supersedes the previous published revision; nothing is deleted, so history stays.

The public API only sees published, non-archived cycles. Freshness is applied on read:
a verified record whose source check is older than CATALOG_STALE_AFTER_DAYS, or whose cycle
is not the current admissions cycle, is reported as stale and must not autofill.

backend/data/program_catalog_seed.json is import-only (manage_catalog.py import-seed): records
arrive as unverified drafts and are never written back to the file.
"""
from __future__ import annotations

import json
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import CatalogCycle, CatalogProgram, CatalogRevision, CatalogRound

SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "program_catalog_seed.json"
OPEN_STATES = ("draft", "in_review")


class CatalogError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def stale_after_days() -> int:
    try:
        return max(1, int(os.environ.get("CATALOG_STALE_AFTER_DAYS", "120")))
    except ValueError:
        return 120


def cycle_for_date(day: date) -> str:
    """Indian MBA admissions cycles run roughly July -> June: Oct 2026 is the 2026-27 cycle."""
    start = day.year if day.month >= 7 else day.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def current_cycle(today: Optional[date] = None) -> str:
    override = (os.environ.get("CATALOG_CURRENT_CYCLE") or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}", override):
        return override
    return cycle_for_date(today or date.today())


def build_program_id(school_name: str, program_name: str, degree: str) -> str:
    raw = f"{school_name}-{program_name}-{degree}".strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return slug[:180] or "program"


def freshness(cycle: CatalogCycle, revision: CatalogRevision, today: Optional[date] = None):
    """(effective_status, reason, autofill_allowed) for a published revision."""
    today = today or date.today()
    current = current_cycle(today)
    if cycle.archived_at is not None or revision.verification_status == "archived":
        return "archived", f"The {cycle.cycle} cycle is archived.", False
    if cycle.cycle < current:
        return "stale", f"These details are for the {cycle.cycle} cycle; the current cycle is {current}.", False
    if revision.verification_status == "verified":
        limit = stale_after_days()
        if revision.checked_at is None or (today - revision.checked_at).days > limit:
            return "stale", f"Source last checked more than {limit} days ago.", False
        if cycle.cycle != current:
            return "verified", f"These details are for the upcoming {cycle.cycle} cycle.", False
        return "verified", None, True
    if revision.verification_status == "stale":
        return "stale", "A reviewer marked these details as out of date.", False
    return "unverified", "Not yet checked against the official source.", False


def _date_str(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None


def revision_out(revision: CatalogRevision) -> dict:
    return {
        "id": revision.id,
        "cycle_id": revision.cycle_id,
        "cycle": revision.cycle_row.cycle,
        "revision_number": revision.revision_number,
        "state": revision.state,
        "verification_status": revision.verification_status,
        "rights_status": revision.rights_status,
        "application_fee": revision.application_fee,
        "fee_currency": revision.fee_currency,
        "source_url": revision.source_url,
        "checked_at": revision.checked_at,
        "rounds": [{"label": r.label, "deadline": r.deadline} for r in revision.rounds],
        "change_note": revision.change_note or "",
        "created_by_user_id": revision.created_by_user_id,
        "reviewer_user_id": revision.reviewer_user_id,
        "reviewed_at": revision.reviewed_at,
        "published_at": revision.published_at,
        "created_at": revision.created_at,
    }


def public_item(program: CatalogProgram, cycle: CatalogCycle, revision: CatalogRevision,
                today: Optional[date] = None) -> dict:
    status, reason, autofill = freshness(cycle, revision, today)
    current = current_cycle(today)
    rounds = [{"label": r.label, "deadline": r.deadline} for r in revision.rounds]
    return {
        "id": program.id,
        "school_name": program.school_name,
        "program_name": program.program_name,
        "degree": program.degree,
        "country": program.country,
        "city": program.city,
        "cycle": cycle.cycle,
        "current_cycle": current,
        "is_current_cycle": cycle.cycle == current,
        "application_fee": revision.application_fee,
        "fee_currency": revision.fee_currency,
        "rounds": rounds,
        "deadline_round_1": _date_str(rounds[0]["deadline"]) if len(rounds) > 0 else None,
        "deadline_round_2": _date_str(rounds[1]["deadline"]) if len(rounds) > 1 else None,
        "source_url": revision.source_url,
        "checked_at": revision.checked_at,
        "last_updated": _date_str(revision.checked_at),
        "verification_status": status,
        "status_reason": reason,
        "autofill_allowed": autofill,
        "revision_number": revision.revision_number,
        "published_at": revision.published_at,
        "confidence": "high" if autofill else "low",
    }


def _public_cycle(program: CatalogProgram, today: Optional[date] = None):
    """The published, non-archived cycle to show: the current cycle if published, else the latest."""
    candidates = [c for c in program.cycles if c.published_revision_id and c.archived_at is None]
    if not candidates:
        return None
    current = current_cycle(today)
    preferred = [c for c in candidates if c.cycle == current]
    return preferred[0] if preferred else max(candidates, key=lambda c: c.cycle)


def _published_revision(db: Session, cycle: CatalogCycle) -> Optional[CatalogRevision]:
    if not cycle.published_revision_id:
        return None
    return db.get(CatalogRevision, cycle.published_revision_id)


def list_public(db: Session, query: Optional[str] = None, limit: int = 25, today: Optional[date] = None):
    programs = db.query(CatalogProgram).order_by(CatalogProgram.school_name, CatalogProgram.program_name).all()
    needle = (query or "").strip().lower()
    items = []
    for program in programs:
        if needle and not any(needle in (value or "").lower() for value in (
                program.school_name, program.program_name, program.degree, program.country, program.city)):
            continue
        cycle = _public_cycle(program, today)
        revision = _published_revision(db, cycle) if cycle else None
        if revision is not None:
            items.append(public_item(program, cycle, revision, today))
    return len(items), items[:limit]


def get_public(db: Session, program_id: str, today: Optional[date] = None) -> Optional[dict]:
    program = db.get(CatalogProgram, program_id)
    if program is None:
        return None
    cycle = _public_cycle(program, today)
    revision = _published_revision(db, cycle) if cycle else None
    return public_item(program, cycle, revision, today) if revision is not None else None


# --- admin workflow ---------------------------------------------------------------------


def admin_listing(db: Session, today: Optional[date] = None) -> dict:
    items = []
    for program in db.query(CatalogProgram).order_by(CatalogProgram.school_name, CatalogProgram.program_name):
        cycles = []
        for cycle in sorted(program.cycles, key=lambda c: c.cycle, reverse=True):
            published = _published_revision(db, cycle)
            open_revision = next((r for r in reversed(cycle.revisions) if r.state in OPEN_STATES), None)
            status = reason = None
            if published is not None:
                status, reason, _ = freshness(cycle, published, today)
            cycles.append({
                "id": cycle.id,
                "cycle": cycle.cycle,
                "archived": cycle.archived_at is not None,
                "effective_status": status,
                "status_reason": reason,
                "published": revision_out(published) if published else None,
                "open_revision": revision_out(open_revision) if open_revision else None,
            })
        items.append({
            "id": program.id,
            "school_name": program.school_name,
            "program_name": program.program_name,
            "degree": program.degree,
            "country": program.country,
            "city": program.city,
            "cycles": cycles,
        })
    return {"current_cycle": current_cycle(today), "stale_after_days": stale_after_days(), "items": items}


def history(db: Session, program_id: str) -> list[dict]:
    program = db.get(CatalogProgram, program_id)
    if program is None:
        raise CatalogError(404, "Programme not found")
    rows = (
        db.query(CatalogRevision)
        .join(CatalogCycle, CatalogCycle.id == CatalogRevision.cycle_id)
        .filter(CatalogCycle.program_id == program_id)
        .order_by(CatalogCycle.cycle.desc(), CatalogRevision.revision_number.desc())
        .all()
    )
    return [revision_out(row) for row in rows]


def _set_rounds(revision: CatalogRevision, rounds) -> None:
    revision.rounds = [
        CatalogRound(label=r["label"].strip(), deadline=r.get("deadline"), sort_order=index)
        for index, r in enumerate(rounds)
    ]


def _apply_facts(revision: CatalogRevision, data: dict) -> None:
    revision.application_fee = data.get("application_fee")
    revision.fee_currency = data.get("fee_currency") or "INR"
    revision.source_url = data.get("source_url")
    revision.checked_at = data.get("checked_at")
    revision.rights_status = data.get("rights_status") or "unknown"
    revision.change_note = data.get("change_note") or ""
    _set_rounds(revision, data.get("rounds") or [])


def create_draft(db: Session, data: dict, user_id: Optional[int]) -> CatalogRevision:
    """New draft revision. For an existing programme this is a correction; identity fields
    (school/programme names) are taken only when the programme is first created."""
    if data.get("checked_at") and data["checked_at"] > date.today():
        raise CatalogError(400, "checked_at cannot be in the future")
    program_id = (data.get("program_id") or "").lower() or build_program_id(
        data["school_name"], data["program_name"], data["degree"])
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,179}", program_id):
        raise CatalogError(400, "program_id may contain only lowercase letters, digits and hyphens")
    program = db.get(CatalogProgram, program_id)
    if program is None:
        program = CatalogProgram(id=program_id, school_name=data["school_name"], program_name=data["program_name"],
                                 degree=data["degree"], country=data["country"], city=data.get("city"))
        db.add(program)
        db.flush()
    cycle = (db.query(CatalogCycle)
             .filter(CatalogCycle.program_id == program_id, CatalogCycle.cycle == data["cycle"])
             .with_for_update().first())
    if cycle is None:
        cycle = CatalogCycle(program_id=program_id, cycle=data["cycle"])
        db.add(cycle)
        db.flush()
    open_revision = (db.query(CatalogRevision)
                     .filter(CatalogRevision.cycle_id == cycle.id, CatalogRevision.state.in_(OPEN_STATES)).first())
    if open_revision is not None:
        raise CatalogError(409, f"Revision {open_revision.revision_number} for {program_id} {cycle.cycle} "
                                f"is already {open_revision.state}; edit or publish it first")
    number = (db.query(func.max(CatalogRevision.revision_number))
              .filter(CatalogRevision.cycle_id == cycle.id).scalar() or 0) + 1
    revision = CatalogRevision(cycle_id=cycle.id, revision_number=number, state="draft",
                               verification_status="unverified", created_by_user_id=user_id)
    revision.cycle_row = cycle
    _apply_facts(revision, data)
    db.add(revision)
    program.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(revision)
    return revision


def _revision(db: Session, revision_id: int) -> CatalogRevision:
    revision = db.query(CatalogRevision).filter(CatalogRevision.id == revision_id).with_for_update().first()
    if revision is None:
        raise CatalogError(404, "Revision not found")
    return revision


def update_draft(db: Session, revision_id: int, data: dict) -> CatalogRevision:
    revision = _revision(db, revision_id)
    if revision.state != "draft":
        raise CatalogError(409, f"Only drafts can be edited (this revision is {revision.state}); "
                                "create a correction instead")
    if data.get("cycle") and data["cycle"] != revision.cycle_row.cycle:
        raise CatalogError(400, "A draft cannot move to another cycle; create a draft for that cycle")
    if data.get("checked_at") and data["checked_at"] > date.today():
        raise CatalogError(400, "checked_at cannot be in the future")
    _apply_facts(revision, data)
    db.commit()
    db.refresh(revision)
    return revision


def submit_for_review(db: Session, revision_id: int) -> CatalogRevision:
    revision = _revision(db, revision_id)
    if revision.state != "draft":
        raise CatalogError(409, f"Only drafts can be submitted (this revision is {revision.state})")
    revision.state = "in_review"
    db.commit()
    db.refresh(revision)
    return revision


def return_to_draft(db: Session, revision_id: int, note: str = "") -> CatalogRevision:
    revision = _revision(db, revision_id)
    if revision.state != "in_review":
        raise CatalogError(409, f"Only revisions in review can be returned (this one is {revision.state})")
    revision.state = "draft"
    if note:
        revision.change_note = f"{revision.change_note}\n[returned] {note}".strip()
    db.commit()
    db.refresh(revision)
    return revision


def publish(db: Session, revision_id: int, verification_status: str, reviewer_id: int,
            note: str = "") -> CatalogRevision:
    revision = _revision(db, revision_id)
    if revision.state != "in_review":
        raise CatalogError(409, f"Only revisions in review can be published (this one is {revision.state})")
    if verification_status == "verified":
        if not revision.source_url or not revision.checked_at:
            raise CatalogError(400, "A verified record needs an official source URL and the date it was checked")
    cycle = db.query(CatalogCycle).filter(CatalogCycle.id == revision.cycle_id).with_for_update().one()
    now = datetime.utcnow()
    previous = _published_revision(db, cycle)
    if previous is not None and previous.id != revision.id:
        previous.state = "superseded"
    revision.state = "published"
    revision.verification_status = verification_status
    revision.reviewer_user_id = reviewer_id
    revision.reviewed_at = now
    revision.published_at = now
    if note:
        revision.change_note = f"{revision.change_note}\n[review] {note}".strip()
    cycle.published_revision_id = revision.id
    cycle.archived_at = None
    cycle.program.updated_at = now
    db.commit()
    db.refresh(revision)
    return revision


def archive_cycle(db: Session, cycle_id: int) -> CatalogCycle:
    cycle = db.query(CatalogCycle).filter(CatalogCycle.id == cycle_id).with_for_update().first()
    if cycle is None:
        raise CatalogError(404, "Cycle not found")
    cycle.archived_at = cycle.archived_at or datetime.utcnow()
    db.commit()
    db.refresh(cycle)
    return cycle


# --- seed import ------------------------------------------------------------------------


def _parse_date(value) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def import_seed(db: Session, path: Path = SEED_PATH) -> dict:
    """Idempotently load the seed file as UNVERIFIED drafts. Existing programmes are skipped,
    so a re-run never overwrites reviewed data. The file itself is only read."""
    with Path(path).open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    created, skipped, invalid = [], [], []
    for item in data if isinstance(data, list) else []:
        if not isinstance(item, dict) or not all(item.get(k) for k in ("school_name", "program_name", "degree")):
            invalid.append(item.get("id") if isinstance(item, dict) else None)
            continue
        program_id = (item.get("id") or build_program_id(item["school_name"], item["program_name"],
                                                         item["degree"])).strip().lower()
        if db.get(CatalogProgram, program_id) is not None:
            skipped.append(program_id)
            continue
        deadlines = [("Round 1", _parse_date(item.get("deadline_round_1"))),
                     ("Round 2", _parse_date(item.get("deadline_round_2")))]
        first_deadline = next((d for _, d in deadlines if d), None)
        program = CatalogProgram(id=program_id, school_name=item["school_name"], program_name=item["program_name"],
                                 degree=item["degree"], country=item.get("country") or "Unknown",
                                 city=item.get("city"))
        cycle = CatalogCycle(cycle=cycle_for_date(first_deadline) if first_deadline else current_cycle())
        program.cycles.append(cycle)
        revision = CatalogRevision(revision_number=1, state="draft", verification_status="unverified",
                                   rights_status="unknown")
        cycle.revisions.append(revision)
        _apply_facts(revision, {
            "application_fee": item.get("application_fee"),
            "fee_currency": (item.get("fee_currency") or "INR")[:3].upper(),
            "source_url": item.get("source_url"),
            "checked_at": None,  # the seed's last_updated was never a human source check
            "change_note": f"Imported from {Path(path).name} (seed last_updated "
                           f"{item.get('last_updated') or 'unknown'}); not yet checked against the official source.",
            "rounds": [{"label": label, "deadline": d} for label, d in deadlines if d],
        })
        db.add(program)
        db.flush()
        created.append(program_id)
    db.commit()
    return {"created": created, "skipped": skipped, "invalid": invalid}
