"""Account data export and account deletion (R06).

Both operations work from one inventory, ``DELETION_MANIFEST``: every table in the schema is
listed with what export includes and what deletion does to it. ``tests/test_account_data.py``
fails when a new table is added without a manifest entry, so a new kind of applicant data
cannot silently escape export or deletion. The human-readable version is docs/DATA_RETENTION.md.

Export returns only rows owned by the requesting user and never includes password hashes,
refresh/one-time token hashes, idempotency fingerprints or row leases.

Deletion runs in one transaction: applicant content is deleted (not soft-deleted), rows other
people need (aggregate telemetry, the AI cost ledger, admin audit trail) are kept without the
user id or free-text payload, sessions are revoked by deleting their refresh tokens, and the
user row is removed. Backups taken before the deletion still contain the data until they
expire; see docs/DATA_RETENTION.md.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Iterable

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from models import (
    AdminEconomicsScenario,
    AdminEvent,
    AiCostEntry,
    AiPriceVersion,
    AiRuntimeConfig,
    AiSpendCounter,
    ApplicationTracker,
    AuthToken,
    Essay,
    InterviewOperation,
    InterviewQuota,
    InterviewSession,
    CatalogRevision,
    PilotFeedback,
    RefreshToken,
    ResumeQuestionSet,
    User,
)

EXPORT_FORMAT = "masters-platform-account-export"
EXPORT_VERSION = 1
DELETION_EVENT = "account_deleted"

# table -> (export behaviour, deletion behaviour, reason). Keep docs/DATA_RETENTION.md in step.
DELETION_MANIFEST: dict[str, tuple[str, str, str]] = {
    "users": ("profile (no password hash)", "delete",
              "Account row removed; the email can register again."),
    "applications": ("all rows", "delete", "Applicant content."),
    "essays": ("all rows and versions", "delete", "Applicant content, including AI reviews."),
    "interview_sessions": ("all rows (context, transcript, feedback)", "delete",
                           "Applicant content, including the snapshot copy of profile facts."),
    "interview_operations": ("all rows (result, usage; no fingerprints)", "delete",
                             "Generated questions/feedback per step. Token/audio usage is first "
                             "summed into the anonymous account_deleted cost-ledger event."),
    "resume_question_sets": ("all rows (context, questions, usage)", "delete",
                             "Résumé-derived profile facts and questions. Usage summed into the "
                             "account_deleted event first."),
    "pilot_feedback": ("rows the user wrote", "delete; handled_by cleared on others' rows",
                       "Free-text the user wrote. If the user was an admin who handled other "
                       "people's feedback, only the reference to them is cleared."),
    "admin_events": ("telemetry the user emitted", "anonymise (user_id and payload cleared)",
                     "Event name and time stay so funnel/coverage counts remain correct; the "
                     "free-text payload and link to the person are removed."),
    "interview_quotas": ("the user's counters", "delete per-user counters; keep global counters",
                         "Global counters hold no personal data and protect the spending cap."),
    "refresh_tokens": ("session metadata only (no hashes)", "delete", "Revokes every signed-in session."),
    "auth_tokens": ("not exported (secrets)", "delete", "Pending verification/reset links stop working."),
    "admin_economics_scenarios": ("the user's scenario (admins only)", "delete", "Admin's own planning inputs."),
    "ai_runtime_config": ("not exported (site setting)", "updated_by_user_id cleared",
                          "Site-wide setting; only the reference to the admin who changed it is removed."),
    "alembic_version": ("not exported", "untouched", "Schema version, no personal data."),
    # R05 rate limiting and AI cost control
    "rate_limit_buckets": ("not exported", "untouched (expire on their own)",
                           "Keys are one-way hashes of IP/email/account; they cannot be linked back to "
                           "a person and disappear when their short window ends."),
    "ai_cost_entries": ("the user's AI cost entries (amounts, model, status)",
                        "anonymise (user_id, reference_id and note cleared; amounts kept)",
                        "Money already committed or spent with the AI provider must still reconcile; "
                        "the link to the person and to deleted content is removed."),
    "ai_spend_counters": ("the user's daily spend counters", "delete per-user counters; keep global counters",
                          "Global counters hold no personal data and enforce the site budget."),
    "ai_price_versions": ("not exported (site setting)", "created_by_user_id cleared",
                          "Price table; only the reference to the admin who entered it is removed."),
    # R09 programme catalogue (public reference data)
    "catalog_programs": ("not exported (public data)", "untouched", "Programme facts, no personal data."),
    "catalog_cycles": ("not exported (public data)", "untouched", "Programme facts, no personal data."),
    "catalog_rounds": ("not exported (public data)", "untouched", "Programme facts, no personal data."),
    "catalog_revisions": ("not exported (public data)", "created_by_user_id and reviewer_user_id cleared",
                          "Revision history stays; only the reference to the admin is removed."),
}

_EXCLUDED_FIELDS = {
    "hashed_password", "token_hash", "family_id", "fingerprint", "create_fingerprint",
    "pending_token", "pending_until", "handled_by",
}
_JSON_FIELDS = {
    "context_json", "transcript_json", "feedback_json", "result_json", "usage_json",
    "questions_json", "payload_json", "assumptions_json",
}
_USAGE_FIELDS = ("input_tokens", "output_tokens", "audio_bytes", "characters")


def _value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _parse_json(raw: Any) -> Any:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return raw  # keep unparseable text rather than dropping the user's data


def _row(obj: Any, exclude: Iterable[str] = ()) -> dict:
    skip = _EXCLUDED_FIELDS | set(exclude)
    out = {}
    for column in obj.__table__.columns:
        name = column.key
        if name in skip:
            continue
        value = getattr(obj, name)
        if name in _JSON_FIELDS:
            out[name.removesuffix("_json")] = _parse_json(value)
        else:
            out[name] = _value(value)
    return out


def _quota_filter(user_id: int):
    # Keys look like "<family>:user:<id>:<day>"; the trailing colon stops 1 matching 12.
    return InterviewQuota.id.like(f"%:user:{int(user_id)}:%")


def build_export(db: Session, user: User) -> dict:
    """Everything stored server-side for ``user`` and nothing belonging to anyone else."""
    uid = user.id
    sessions = (db.query(InterviewSession).filter(InterviewSession.user_id == uid)
                .order_by(InterviewSession.created_at, InterviewSession.id).all())
    session_ids = [s.id for s in sessions]
    operations: dict[str, list] = {sid: [] for sid in session_ids}
    if session_ids:
        for op in (db.query(InterviewOperation).filter(InterviewOperation.session_id.in_(session_ids))
                   .order_by(InterviewOperation.created_at, InterviewOperation.id)):
            operations[op.session_id].append(_row(op, exclude={"session_id"}))

    profile = _row(user)
    profile["has_password"] = bool(user.hashed_password)
    economics = db.get(AdminEconomicsScenario, uid)

    return {
        "format": EXPORT_FORMAT,
        "version": EXPORT_VERSION,
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "notes": [
            "This file contains the data this service stores about your account on its servers.",
            "Not included: your password hash and sign-in token secrets (never exported); "
            "notes, drafts and preferences kept only in your browser (the app adds those "
            "under 'browser_storage' when you download from Settings); interview audio "
            "(never stored on the server); the original résumé file (never stored).",
        ],
        "profile": profile,
        "applications": [_row(r) for r in db.query(ApplicationTracker).filter(ApplicationTracker.user_id == uid)
                         .order_by(ApplicationTracker.id)],
        "essays": [_row(r) for r in db.query(Essay).filter(Essay.user_id == uid).order_by(Essay.id)],
        "interview_sessions": [dict(_row(s), operations=operations[s.id]) for s in sessions],
        "resume_question_sets": [_row(r) for r in db.query(ResumeQuestionSet)
                                 .filter(ResumeQuestionSet.user_id == uid).order_by(ResumeQuestionSet.created_at,
                                                                                     ResumeQuestionSet.id)],
        "feedback": [_row(r) for r in db.query(PilotFeedback).filter(PilotFeedback.user_id == uid)
                     .order_by(PilotFeedback.id)],
        "telemetry_events": [_row(r, exclude={"user_id"}) for r in db.query(AdminEvent)
                             .filter(AdminEvent.user_id == uid).order_by(AdminEvent.id)],
        "usage_counters": [_row(r) for r in db.query(InterviewQuota).filter(_quota_filter(uid))
                           .order_by(InterviewQuota.id)],
        "ai_cost_entries": [_row(r, exclude={"user_id", "resolved_by_user_id"}) for r in db.query(AiCostEntry)
                            .filter(AiCostEntry.user_id == uid).order_by(AiCostEntry.created_at, AiCostEntry.id)],
        "ai_spend_counters": [_row(r) for r in db.query(AiSpendCounter)
                              .filter(AiSpendCounter.id.like(f"user:{int(uid)}:%")).order_by(AiSpendCounter.id)],
        "sign_in_sessions": [_row(r, exclude={"user_id"}) for r in db.query(RefreshToken)
                             .filter(RefreshToken.user_id == uid).order_by(RefreshToken.id)],
        "admin_economics_scenario": _row(economics) if economics else None,
    }


def _sum_usage(totals: dict, raw: Any) -> None:
    usage = _parse_json(raw)
    if not isinstance(usage, dict):
        totals["operations_without_usage"] += 1
        return
    model = str(usage.get("model") or "unreported")[:120]
    bucket = totals["by_model"].setdefault(model, {f: 0 for f in _USAGE_FIELDS} | {"operations": 0})
    bucket["operations"] += 1
    if not any(f in usage for f in _USAGE_FIELDS):
        totals["operations_without_usage"] += 1
    for field in _USAGE_FIELDS:
        value = usage.get(field)
        if type(value) is int and value >= 0:
            bucket[field] += value


class DeletionBlocked(Exception):
    """An AI step is in flight; deleting under it could leave a half-written row."""


def delete_account(db: Session, user: User) -> dict:
    """Delete or anonymise everything tied to ``user`` in one transaction. Returns counts."""
    uid = user.id
    now = datetime.utcnow()
    in_flight = (
        db.query(InterviewSession.id).filter(InterviewSession.user_id == uid,
                                             InterviewSession.pending_until > now).first()
        or db.query(ResumeQuestionSet.id).filter(ResumeQuestionSet.user_id == uid,
                                                 ResumeQuestionSet.pending_until > now).first()
    )
    if in_flight:
        raise DeletionBlocked()

    counts: dict[str, int] = {}
    ledger = {"by_model": {}, "operations_without_usage": 0}

    session_ids = [sid for (sid,) in db.query(InterviewSession.id).filter(InterviewSession.user_id == uid)]
    if session_ids:
        ops = db.query(InterviewOperation).filter(InterviewOperation.session_id.in_(session_ids))
        for op in ops.filter(InterviewOperation.status == "succeeded"):
            _sum_usage(ledger, op.usage_json)
        counts["interview_operations"] = ops.delete(synchronize_session=False)
    counts["interview_sessions"] = db.query(InterviewSession).filter(
        InterviewSession.user_id == uid).delete(synchronize_session=False)

    resume_sets = db.query(ResumeQuestionSet).filter(ResumeQuestionSet.user_id == uid)
    for row in resume_sets.filter(ResumeQuestionSet.status == "completed"):
        _sum_usage(ledger, row.usage_json)
    counts["resume_question_sets"] = resume_sets.delete(synchronize_session=False)

    essay_ids = select(Essay.id).where(Essay.user_id == uid)
    app_ids = select(ApplicationTracker.id).where(ApplicationTracker.user_id == uid)
    # Break self/cross references before deleting so FK order never matters.
    db.query(Essay).filter(or_(Essay.parent_essay_id.in_(essay_ids), Essay.application_id.in_(app_ids))).update(
        {Essay.parent_essay_id: None, Essay.application_id: None}, synchronize_session=False)
    counts["essays"] = db.query(Essay).filter(Essay.user_id == uid).delete(synchronize_session=False)
    counts["applications"] = db.query(ApplicationTracker).filter(
        ApplicationTracker.user_id == uid).delete(synchronize_session=False)

    counts["pilot_feedback"] = db.query(PilotFeedback).filter(
        PilotFeedback.user_id == uid).delete(synchronize_session=False)
    db.query(PilotFeedback).filter(PilotFeedback.handled_by == uid).update(
        {PilotFeedback.handled_by: None}, synchronize_session=False)

    counts["admin_events_anonymised"] = db.query(AdminEvent).filter(AdminEvent.user_id == uid).update(
        {AdminEvent.user_id: None, AdminEvent.payload_json: None}, synchronize_session=False)
    db.query(AiRuntimeConfig).filter(AiRuntimeConfig.updated_by_user_id == uid).update(
        {AiRuntimeConfig.updated_by_user_id: None}, synchronize_session=False)
    counts["ai_cost_entries_anonymised"] = db.query(AiCostEntry).filter(AiCostEntry.user_id == uid).update(
        {AiCostEntry.user_id: None, AiCostEntry.reference_id: None, AiCostEntry.note: None},
        synchronize_session=False)
    db.query(AiCostEntry).filter(AiCostEntry.resolved_by_user_id == uid).update(
        {AiCostEntry.resolved_by_user_id: None}, synchronize_session=False)
    counts["ai_spend_counters"] = db.query(AiSpendCounter).filter(
        AiSpendCounter.id.like(f"user:{int(uid)}:%")).delete(synchronize_session=False)
    db.query(AiPriceVersion).filter(AiPriceVersion.created_by_user_id == uid).update(
        {AiPriceVersion.created_by_user_id: None}, synchronize_session=False)
    db.query(CatalogRevision).filter(CatalogRevision.created_by_user_id == uid).update(
        {CatalogRevision.created_by_user_id: None}, synchronize_session=False)
    db.query(CatalogRevision).filter(CatalogRevision.reviewer_user_id == uid).update(
        {CatalogRevision.reviewer_user_id: None}, synchronize_session=False)
    counts["admin_economics_scenarios"] = db.query(AdminEconomicsScenario).filter(
        AdminEconomicsScenario.user_id == uid).delete(synchronize_session=False)
    counts["interview_quotas"] = db.query(InterviewQuota).filter(_quota_filter(uid)).delete(
        synchronize_session=False)

    counts["refresh_tokens"] = db.query(RefreshToken).filter(RefreshToken.user_id == uid).delete(
        synchronize_session=False)
    counts["auth_tokens"] = db.query(AuthToken).filter(AuthToken.user_id == uid).delete(
        synchronize_session=False)

    # Anonymous record: keeps AI cost reconciliation and a deletion audit count without
    # any identifier of the person.
    db.add(AdminEvent(user_id=None, event_name=DELETION_EVENT, payload_json=json.dumps({
        "deleted_rows": {k: v for k, v in counts.items() if not k.endswith("_anonymised")},
        "anonymised_events": counts["admin_events_anonymised"],
        "usage_ledger": ledger,
    }, sort_keys=True)))
    db.query(User).filter(User.id == uid).delete(synchronize_session=False)
    counts["users"] = 1
    db.commit()
    return counts
