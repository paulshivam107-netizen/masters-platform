"""AI monetary limits: price versions, reservations, reconciliation and the cost ledger (R05).

Every billable provider call follows one path:

    reserve  (before the call; conservative maximum; committed so every worker sees it)
      -> settle   (response received: actual usage if reported, else the reservation)
      -> release  (provider certainly did not bill: not sent / rejected)
      -> unknown  (timeout or lost connection after the request may have been accepted)

All money is integer paise; prices are integer paise per million units. No floats.

Hard caps (per-user and global per UTC day) are enforced by one conditional atomic UPDATE on
``ai_spend_counters`` inside the reserving transaction, so concurrent reservations from any
number of workers cannot overspend. ``committed_paise`` = reserved + settled + unknown.
Unknown outcomes stay counted until an admin resolves them. The *alert* threshold is reporting
only and never blocks anything; only the caps block.
"""
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError

from models import AiCostEntry, AiPriceVersion, AiRuntimeConfig, AiSpendCounter

PRICE_BASIS = "builtin-2026-10 (USD list price at Rs 90/USD)"
# Paise per million units. Replace with a database price version (admin API) when prices change.
BUILTIN_PRICES = {
    "gpt-6-luna": ("tokens", "tokens", 900, 4_500, 0),  # $0.10 / $0.50 per 1M (OpenAI pricing, Oct 2026)
    "gpt-4.1-mini": ("tokens", "tokens", 3_600, 14_400, 0),
    "gpt-4o-mini": ("tokens", "tokens", 1_350, 5_400, 0),
    "gpt-4o-mini-tts": ("text_tokens", "audio_tokens", 5_400, 108_000, 0),
    "gpt-4o-transcribe": ("audio_seconds", "tokens", 900_000, 90_000, 0),
    "gpt-4o-mini-transcribe": ("audio_seconds", "tokens", 450_000, 45_000, 0),
    "gpt-transcribe": ("audio_seconds", "tokens", 675_000, 90_000, 0),  # $0.0045 / minute
}
# Unknown model: price it like a premium model rather than refuse or under-reserve.
FALLBACK_PRICE = ("tokens", "tokens", 45_000, 180_000, 0)

STATUSES = ("reserved", "settled", "released", "unknown")


@dataclass(frozen=True)
class Price:
    model: str
    input_unit: str
    output_unit: str
    input_paise_per_million: int
    output_paise_per_million: int
    request_paise: int
    source: str  # database | builtin | fallback
    version_id: Optional[int] = None

    def cost(self, input_units: int, output_units: int) -> int:
        numerator = max(0, int(input_units)) * self.input_paise_per_million + \
            max(0, int(output_units)) * self.output_paise_per_million
        return -(-numerator // 1_000_000) + self.request_paise  # ceil, integer only


def env_int(name: str, default: int, low: int = 0, high: int = 10**9) -> int:
    try:
        return max(low, min(int(os.getenv(name, str(default))), high))
    except ValueError:
        return default


def caps() -> dict:
    # Pilot defaults: ₹50/day across everyone, ₹5/day per person. Raise via env once revenue exists.
    global_cap = env_int("AI_GLOBAL_DAILY_CAP_PAISE", 5_000)
    return {
        "global_daily_cap_paise": global_cap,
        "user_daily_cap_paise": env_int("AI_USER_DAILY_CAP_PAISE", 500),
        # Signed-out "try one question" visitors share one pool inside the global cap.
        "anon_daily_cap_paise": env_int("AI_ANON_DAILY_CAP_PAISE", 1_000),
        "anon_max_in_flight": env_int("AI_ANON_MAX_IN_FLIGHT", 3, 1, 100),
        "global_max_in_flight": env_int("AI_GLOBAL_MAX_IN_FLIGHT", 20, 1, 10_000),
        "user_max_in_flight": env_int("AI_USER_MAX_IN_FLIGHT", 2, 1, 100),
        # Alert only: reported to the admin view, never enforced.
        "alert_paise": env_int("AI_DAILY_ALERT_PAISE", global_cap * 8 // 10),
        "stale_minutes": env_int("AI_RESERVATION_STALE_MINUTES", 10, 1, 24 * 60),
        "max_attempts": env_int("AI_MAX_ATTEMPTS_PER_REQUEST", 4, 1, 50),
    }


def current_price(db, model: str, at: Optional[datetime] = None) -> Price:
    at = at or datetime.utcnow()
    row = (db.query(AiPriceVersion).filter(AiPriceVersion.model == model, AiPriceVersion.effective_from <= at)
           .order_by(AiPriceVersion.effective_from.desc(), AiPriceVersion.version.desc()).first())
    if row is not None:
        return Price(model, row.input_unit, row.output_unit, row.input_paise_per_million,
                     row.output_paise_per_million, row.request_paise, "database", row.id)
    if model in BUILTIN_PRICES:
        return Price(model, *BUILTIN_PRICES[model], "builtin")
    return Price(model, *FALLBACK_PRICE, "fallback")


def text_tokens_upper_bound(chars: int) -> int:
    # ~4 chars/token for English; 2 keeps Indic scripts and JSON from being under-reserved.
    return -(-max(0, chars) // 2)


class Denied(HTTPException):
    """A billable operation refused before any provider call. Nothing the user sent is discarded."""

    def __init__(self, status_code: int, message: str, reason: str):
        if reason.endswith("daily_cap"):
            now = datetime.utcnow()
            retry_after = int((datetime.combine(now.date() + timedelta(days=1), datetime.min.time()) - now).total_seconds())
        else:
            retry_after = {"user_concurrency": 30, "global_concurrency": 60}.get(reason, 600)
        super().__init__(status_code, message, headers={"X-AI-Limit": reason, "Retry-After": str(max(1, retry_after))})
        self.reason = reason


def _counter_ids(user_id, day: date):
    # No user means a signed-out visitor: they spend from the shared anon pool, then the global cap.
    ids = [f"anon:{day.isoformat()}" if user_id is None else f"user:{user_id}:{day.isoformat()}"]
    ids.append(f"global:{day.isoformat()}")
    return ids


def _ensure_counter(db, counter_id: str, day: date):
    if db.get(AiSpendCounter, counter_id) is not None:
        return
    try:
        with db.begin_nested():
            db.add(AiSpendCounter(id=counter_id, day=day, committed_paise=0, in_flight=0))
            db.flush()
    except IntegrityError:
        pass  # another worker created it first


def _deny(db, counter_id, amount, cap, max_in_flight, is_user):
    row = db.query(AiSpendCounter.committed_paise, AiSpendCounter.in_flight).filter_by(id=counter_id).first()
    db.rollback()
    if counter_id.startswith("anon:"):
        if row and row.in_flight >= max_in_flight:
            raise Denied(429, "Several people are trying this right now. Please retry in a few seconds.",
                         "anon_concurrency")
        raise Denied(429, "Today's free tries are used up. Sign up to keep going, or try again tomorrow.",
                     "anon_daily_cap")
    if is_user and row and row.in_flight >= max_in_flight:
        raise Denied(429, "Another AI step for your account is still running. Your input is kept here; "
                          "wait for it to finish, then retry.", "user_concurrency")
    if is_user:
        raise Denied(429, "You have reached today's AI usage allowance. Your input is kept here and nothing "
                          "was sent; limits reset at midnight UTC.", "user_daily_cap")
    if row and row.in_flight >= max_in_flight:
        raise Denied(503, "AI practice is busy right now. Your input is kept here; please retry in a minute.",
                     "global_concurrency")
    raise Denied(503, "AI practice has reached today's site-wide budget. Your input is kept here and nothing "
                      "was sent; please try again tomorrow or use the demo.", "global_daily_cap")


def reserve(db, *, user_id: Optional[int], operation: str, model: str, input_units: int, output_units: int,
            reference_id: Optional[str] = None) -> AiCostEntry:
    """Reserve the maximum cost of one provider call in the caller's transaction (caller commits).

    Raises ``Denied`` (after rolling the caller's transaction back) when AI is switched off or a
    cap would be exceeded. No provider call may be made unless this returned and was committed.
    """
    runtime = db.query(AiRuntimeConfig).first()
    if runtime is not None and not runtime.ai_enabled:
        db.rollback()
        raise Denied(503, "AI practice is temporarily paused by the site owner. Your input is kept here.", "ai_disabled")
    expire_stale(db)
    limits = caps()
    price = current_price(db, model)
    amount = price.cost(input_units, output_units)
    day = datetime.utcnow().date()
    for counter_id in _counter_ids(user_id, day):
        scope = counter_id.split(":", 1)[0]  # user | anon | global
        is_user = scope == "user"
        cap = limits[f"{scope}_daily_cap_paise"]
        max_in_flight = limits[f"{scope}_max_in_flight"]
        _ensure_counter(db, counter_id, day)
        changed = db.query(AiSpendCounter).filter(
            AiSpendCounter.id == counter_id,
            AiSpendCounter.committed_paise + amount <= cap,
            AiSpendCounter.in_flight < max_in_flight,
        ).update({AiSpendCounter.committed_paise: AiSpendCounter.committed_paise + amount,
                  AiSpendCounter.in_flight: AiSpendCounter.in_flight + 1,
                  AiSpendCounter.updated_at: datetime.utcnow()}, synchronize_session=False)
        if changed != 1:
            _deny(db, counter_id, amount, cap, max_in_flight, is_user)
    entry = AiCostEntry(id=str(uuid4()), user_id=user_id, day=day, operation=operation[:32],
                        reference_id=reference_id, model=model[:80], price_version_id=price.version_id,
                        price_source=price.source, status="reserved", reserved_paise=amount,
                        input_units=int(input_units), output_units=int(output_units), usage_reported=False)
    db.add(entry)
    db.flush()
    return entry


def _adjust(db, entry: AiCostEntry, committed_delta: int, in_flight_delta: int):
    for counter_id in _counter_ids(entry.user_id, entry.day):
        db.query(AiSpendCounter).filter_by(id=counter_id).update({
            AiSpendCounter.committed_paise: AiSpendCounter.committed_paise + committed_delta,
            AiSpendCounter.in_flight: AiSpendCounter.in_flight + in_flight_delta,
            AiSpendCounter.updated_at: datetime.utcnow(),
        }, synchronize_session=False)


def _transition(db, entry_id: str, from_status: str, values: dict) -> bool:
    values = {**values, "resolved_at": datetime.utcnow()}
    return db.query(AiCostEntry).filter_by(id=entry_id, status=from_status).update(
        values, synchronize_session=False) == 1


def actual_from_usage(entry: AiCostEntry, price: Price, usage: Optional[dict]):
    usage = usage if isinstance(usage, dict) else {}
    tokens_in, tokens_out = usage.get("input_tokens"), usage.get("output_tokens")
    if type(tokens_in) is int and type(tokens_out) is int and tokens_in >= 0 and tokens_out >= 0:
        return price.cost(tokens_in, tokens_out), tokens_in, tokens_out, True
    # Usage not reported (audio endpoints, stubs): keep the conservative reservation as the charge.
    return entry.reserved_paise, entry.input_units, entry.output_units, False


def _entry_price(db, entry: AiCostEntry) -> Price:
    if entry.price_version_id:
        row = db.get(AiPriceVersion, entry.price_version_id)
        if row is not None:
            return Price(entry.model, row.input_unit, row.output_unit, row.input_paise_per_million,
                         row.output_paise_per_million, row.request_paise, "database", row.id)
    if entry.price_source == "builtin" and entry.model in BUILTIN_PRICES:
        return Price(entry.model, *BUILTIN_PRICES[entry.model], "builtin")
    return Price(entry.model, *FALLBACK_PRICE, "fallback")


def finish(db, entry_id: Optional[str], outcome: str, usage: Optional[dict] = None,
           failure_code: Optional[str] = None) -> Optional[AiCostEntry]:
    """Close a reservation (caller commits). outcome: charged | none | unknown. Idempotent."""
    if not entry_id:
        return None
    entry = db.get(AiCostEntry, entry_id)
    if entry is None or entry.status != "reserved":
        return entry
    code = (failure_code or None) and failure_code[:40]
    if outcome == "charged":
        actual, units_in, units_out, reported = actual_from_usage(entry, _entry_price(db, entry), usage)
        if _transition(db, entry.id, "reserved", {"status": "settled", "actual_paise": actual, "input_units": units_in,
                                                  "output_units": units_out, "usage_reported": reported,
                                                  "failure_code": code}):
            _adjust(db, entry, actual - entry.reserved_paise, -1)
    elif outcome == "none":
        if _transition(db, entry.id, "reserved", {"status": "released", "actual_paise": 0, "failure_code": code}):
            _adjust(db, entry, -entry.reserved_paise, -1)
    else:
        # Possibly billed: the reservation stays counted against the caps until an admin resolves it.
        if _transition(db, entry.id, "reserved", {"status": "unknown", "failure_code": code or "unknown_outcome"}):
            _adjust(db, entry, 0, -1)
    db.flush()
    db.refresh(entry)
    return entry


def reserved_entry_for(db, reference_id: str) -> Optional[str]:
    row = db.query(AiCostEntry.id).filter_by(reference_id=reference_id, status="reserved") \
        .order_by(AiCostEntry.created_at.desc()).first()
    return row[0] if row else None


def expire_stale(db, now: Optional[datetime] = None, batch: int = 50) -> int:
    """Reservations older than the provider timeout + lease (a crashed worker) become 'unknown'."""
    now = now or datetime.utcnow()
    cutoff = now - timedelta(minutes=caps()["stale_minutes"])
    ids = [row[0] for row in db.query(AiCostEntry.id).filter(
        AiCostEntry.status == "reserved", AiCostEntry.created_at < cutoff).limit(batch).all()]
    for entry_id in ids:
        finish(db, entry_id, "unknown", failure_code="stale_reservation")
    return len(ids)


def resolve_unknown(db, entry_id: str, *, charged: bool, actual_paise: Optional[int], admin_id: int,
                    note: str = "") -> AiCostEntry:
    """Admin decision for an unknown outcome after checking the provider dashboard (caller commits)."""
    entry = db.get(AiCostEntry, entry_id)
    if entry is None:
        raise HTTPException(404, "Ledger entry not found")
    if entry.status != "unknown":
        raise HTTPException(409, "Only entries with an unknown outcome can be resolved.")
    actual = (entry.reserved_paise if actual_paise is None else int(actual_paise)) if charged else 0
    values = {"status": "settled" if charged else "released", "actual_paise": actual,
              "resolved_by_user_id": admin_id, "note": (note or "")[:200] or None}
    if not _transition(db, entry.id, "unknown", values):
        raise HTTPException(409, "This entry changed. Reload the ledger.")
    _adjust(db, entry, actual - entry.reserved_paise, 0)
    db.flush()
    db.refresh(entry)
    return entry


def exposure_expression():
    return case(
        (AiCostEntry.status.in_(("reserved", "unknown")), AiCostEntry.reserved_paise),
        (AiCostEntry.status == "settled", func.coalesce(AiCostEntry.actual_paise, AiCostEntry.reserved_paise)),
        else_=0,
    )


def reconcile(db, day: date) -> dict:
    """Compare the cap counters with the ledger for one day. Any difference is a defect."""
    ledger_global = int(db.query(func.coalesce(func.sum(exposure_expression()), 0)).filter(AiCostEntry.day == day).scalar())
    in_flight = db.query(func.count(AiCostEntry.id)).filter(AiCostEntry.day == day, AiCostEntry.status == "reserved").scalar()
    counter = db.get(AiSpendCounter, f"global:{day.isoformat()}")
    per_user = db.query(AiCostEntry.user_id, func.sum(exposure_expression()),
                        func.sum(case((AiCostEntry.status == "reserved", 1), else_=0))) \
        .filter(AiCostEntry.day == day, AiCostEntry.user_id.isnot(None)).group_by(AiCostEntry.user_id).all()
    anon_exposure, anon_reserved = db.query(
        func.coalesce(func.sum(exposure_expression()), 0), func.coalesce(func.sum(case((AiCostEntry.status == "reserved", 1), else_=0)), 0)
    ).filter(AiCostEntry.day == day, AiCostEntry.user_id.is_(None)).one()
    anon_counter = db.get(AiSpendCounter, f"anon:{day.isoformat()}")
    mismatches = []
    if (anon_counter.committed_paise if anon_counter else 0) != int(anon_exposure) or \
            (anon_counter.in_flight if anon_counter else 0) != int(anon_reserved):
        mismatches.append({"counter": f"anon:{day.isoformat()}", "counter_paise": anon_counter.committed_paise if anon_counter else 0,
                           "ledger_paise": int(anon_exposure)})
    if (counter.committed_paise if counter else 0) != ledger_global or (counter.in_flight if counter else 0) != in_flight:
        mismatches.append({"counter": f"global:{day.isoformat()}", "counter_paise": counter.committed_paise if counter else 0,
                           "ledger_paise": ledger_global, "counter_in_flight": counter.in_flight if counter else 0,
                           "ledger_in_flight": in_flight})
    for user_id, exposure, reserved in per_user:
        row = db.get(AiSpendCounter, f"user:{user_id}:{day.isoformat()}")
        if (row.committed_paise if row else 0) != int(exposure or 0) or (row.in_flight if row else 0) != int(reserved or 0):
            mismatches.append({"counter": f"user:{user_id}:{day.isoformat()}", "counter_paise": row.committed_paise if row else 0,
                               "ledger_paise": int(exposure or 0)})
    totals = dict(db.query(AiCostEntry.status, func.count(AiCostEntry.id)).filter(AiCostEntry.day == day)
                  .group_by(AiCostEntry.status).all())
    settled = int(db.query(func.coalesce(func.sum(AiCostEntry.actual_paise), 0))
                  .filter(AiCostEntry.day == day, AiCostEntry.status == "settled").scalar())
    return {"day": day.isoformat(), "committed_paise": ledger_global, "settled_paise": settled,
            "counts": {status: int(totals.get(status, 0)) for status in STATUSES},
            "in_flight": int(in_flight), "balanced": not mismatches, "mismatches": mismatches}
