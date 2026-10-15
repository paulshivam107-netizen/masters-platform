"""Pilot operations: metadata only, private responses, audited support updates."""
import json
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import require_admin_user
from database import get_db
from models import (AdminEconomicsScenario, AdminEvent, AiCostEntry, AiPriceVersion, AiRuntimeConfig,
                    AiSpendCounter, InterviewOperation, InterviewQuota, InterviewSession, PilotFeedback,
                    ResumeQuestionSet, User)
from services import ai_costs
from services.interviews import limit


def private_response(response: Response):
    response.headers['Cache-Control'] = 'no-store'


router = APIRouter(prefix='/pilot', dependencies=[Depends(require_admin_user), Depends(private_response)])


class FeedbackUpdate(BaseModel):
    status: Literal['open', 'in_progress', 'resolved']
    note: str = Field(default='', max_length=2000)
    revision: int = Field(ge=0)


def feedback_row(item, email):
    return {'id': item.id, 'user_email': email, 'category': item.category,
            'message': item.message, 'page_context': item.page_context,
            'created_at': item.created_at, 'status': item.status,
            'note': item.resolution_note, 'revision': item.revision,
            'handled_by': item.handled_by, 'handled_at': item.handled_at}


@router.get('/feedback')
def feedback_queue(state: Literal['unresolved', 'open', 'in_progress', 'resolved', 'all'] = 'unresolved',
                   q: str = Query(default='', max_length=120),
                   offset: int = Query(default=0, ge=0),
                   db: Session = Depends(get_db)):
    query = db.query(PilotFeedback, User.email).join(User, User.id == PilotFeedback.user_id)
    if state == 'unresolved':
        query = query.filter(PilotFeedback.status.in_(['open', 'in_progress']))
    elif state != 'all':
        query = query.filter(PilotFeedback.status == state)
    if q.strip():
        query = query.filter(or_(User.email.contains(q.strip(), autoescape=True),
                                 PilotFeedback.message.contains(q.strip(), autoescape=True)))
    total = query.count()
    rows = query.order_by(PilotFeedback.created_at.desc(), PilotFeedback.id.desc()).offset(offset).limit(20).all()
    counts = dict(db.query(PilotFeedback.status, func.count(PilotFeedback.id)).group_by(PilotFeedback.status).all())
    return {'items': [feedback_row(row, email) for row, email in rows], 'total': total, 'counts': counts}


@router.patch('/feedback/{feedback_id}')
def update_feedback(feedback_id: int, payload: FeedbackUpdate,
                    actor: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    row = db.get(PilotFeedback, feedback_id)
    if not row:
        raise HTTPException(404, 'Feedback not found')
    note = payload.note.strip()
    if payload.status == 'resolved' and not note:
        raise HTTPException(422, 'Add a resolution note before resolving this feedback.')
    previous = row.status
    changed = db.query(PilotFeedback).filter_by(id=feedback_id, revision=payload.revision).update({
        'status': payload.status, 'resolution_note': note, 'revision': PilotFeedback.revision + 1,
        'handled_by': actor.id, 'handled_at': datetime.utcnow(),
    }, synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, 'Another admin updated this feedback. Refresh before saving again.')
    db.add(AdminEvent(user_id=actor.id, event_name='admin_feedback_updated', payload_json=json.dumps({
        'feedback_id': feedback_id, 'from': previous, 'to': payload.status,
    })))
    db.commit()
    db.refresh(row)
    return feedback_row(row, db.get(User, row.user_id).email)


@router.get('/interviews')
def interview_operations(state: Literal['attention', 'all'] = 'attention',
                         offset: int = Query(default=0, ge=0), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    stale = and_(InterviewOperation.status == 'pending',
                 or_(InterviewSession.pending_until.is_(None), InterviewSession.pending_until < now))
    query = db.query(InterviewOperation, InterviewSession.user_id, InterviewSession.provider,
                     InterviewSession.mode, InterviewSession.pending_until).join(InterviewSession)
    if state == 'attention':
        query = query.filter(or_(InterviewOperation.status == 'failed', stale))
    total = query.count()
    rows = query.order_by(func.coalesce(InterviewOperation.failed_at, InterviewOperation.created_at).desc(),
                          InterviewOperation.id).offset(offset).limit(20).all()
    items = []
    for op, user_id, provider, mode, pending_until in rows:
        stalled = op.status == 'pending' and (pending_until is None or pending_until < now)
        items.append({'id': op.id, 'session_id': op.session_id, 'user_id': user_id,
                      'provider': provider, 'mode': mode, 'kind': op.kind,
                      'status': 'stalled' if stalled else op.status, 'attempts': op.attempts,
                      'failure_code': op.failure_code, 'created_at': op.created_at, 'failed_at': op.failed_at})
    return {'items': items, 'total': total}


@router.get('/usage')
def recorded_usage(days: int = Query(default=30, ge=1, le=90), db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    groups = {}
    missing = 0
    def add(source, raw):
        nonlocal missing
        try:
            usage = json.loads(raw or '{}')
        except (ValueError, TypeError):
            usage = {}
        if not isinstance(usage, dict):
            usage = {}
        model = str(usage.get('model') or 'unreported')[:120]
        key = (source, model)
        item = groups.setdefault(key, {'source': source, 'model': model, 'operations': 0,
                                      'input_tokens': 0, 'output_tokens': 0, 'audio_bytes': 0, 'characters': 0})
        item['operations'] += 1
        if not any(k in usage for k in ('input_tokens', 'output_tokens', 'audio_bytes', 'characters')):
            missing += 1
        for field in ('input_tokens', 'output_tokens', 'audio_bytes', 'characters'):
            value = usage.get(field)
            if type(value) is int and value >= 0:
                item[field] += value
    operations = (db.query(InterviewOperation.usage_json).join(InterviewSession)
                  .filter(InterviewSession.provider == 'openai', InterviewOperation.status == 'succeeded',
                          InterviewOperation.created_at >= since))
    for (usage,) in operations.yield_per(500):
        add('Interview', usage)
    resumes = db.query(ResumeQuestionSet.usage_json).filter(
        ResumeQuestionSet.status == 'completed', ResumeQuestionSet.created_at >= since)
    for (usage,) in resumes.yield_per(500):
        add('Resume profile', usage)
    quota = db.get(InterviewQuota, 'ai:global:' + datetime.utcnow().date().isoformat())
    return {'days': days, 'since': since, 'models': sorted(groups.values(), key=lambda x: (x['source'], x['model'])),
            'missing_usage': missing, 'calls_reserved_today': quota.calls if quota else 0,
            'daily_call_limit': limit('INTERVIEW_GLOBAL_DAILY_CALLS', 200)}


class EconomicsInputs(BaseModel):
    price: float = Field(default=599, ge=0, le=1e7, allow_inf_nan=False)
    buyers: int = Field(default=100, ge=0, le=1000000)
    sessions: int = Field(default=5, ge=0, le=1000)
    sessionCost: float = Field(default=25, ge=0, le=1e7, allow_inf_nan=False)
    cac: float = Field(default=100, ge=0, le=1e7, allow_inf_nan=False)
    target: float = Field(default=25000, ge=0, le=1e9, allow_inf_nan=False)
    fixed: float = Field(default=4000, ge=0, le=1e9, allow_inf_nan=False)
    free: float = Field(default=1000, ge=0, le=1e9, allow_inf_nan=False)
    tax: float = Field(default=18, ge=0, le=100, allow_inf_nan=False)
    refund: float = Field(default=3, ge=0, le=100, allow_inf_nan=False)
    gateway: float = Field(default=2.36, ge=0, le=100, allow_inf_nan=False)
    support: float = Field(default=20, ge=0, le=1e7, allow_inf_nan=False)
    hours: float = Field(default=20, ge=0, le=744, allow_inf_nan=False)
    hourValue: float = Field(default=750, ge=0, le=1e7, allow_inf_nan=False)


class EconomicsUpdate(BaseModel):
    assumptions: EconomicsInputs
    revision: int = Field(ge=0)


@router.get('/economics')
def economics(actor: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    row = db.get(AdminEconomicsScenario, actor.id)
    return {'assumptions': json.loads(row.assumptions_json) if row else EconomicsInputs().model_dump(),
            'revision': row.revision if row else 0, 'updated_at': row.updated_at if row else None}


@router.put('/economics')
def save_economics(payload: EconomicsUpdate, actor: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    values = {'assumptions_json': json.dumps(payload.assumptions.model_dump()), 'updated_at': datetime.utcnow()}
    if payload.revision == 0:
        db.add(AdminEconomicsScenario(user_id=actor.id, revision=1, **values))
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'Your saved scenario changed. Reload it before saving.') from None
    else:
        changed = db.query(AdminEconomicsScenario).filter_by(user_id=actor.id, revision=payload.revision).update(
            {**values, 'revision': payload.revision + 1}, synchronize_session=False)
        if changed != 1:
            db.rollback()
            raise HTTPException(409, 'Your saved scenario changed. Reload it before saving.')
    db.commit()
    return economics(actor, db)


# --- R05: AI cost ledger, caps and price versions ------------------------------------------

def ledger_row(entry, email):
    return {'id': entry.id, 'user_id': entry.user_id, 'user_email': email, 'day': entry.day.isoformat(),
            'operation': entry.operation, 'reference_id': entry.reference_id, 'model': entry.model,
            'price_source': entry.price_source, 'price_version_id': entry.price_version_id,
            'status': entry.status, 'reserved_paise': entry.reserved_paise, 'actual_paise': entry.actual_paise,
            'input_units': entry.input_units, 'output_units': entry.output_units,
            'usage_reported': entry.usage_reported, 'failure_code': entry.failure_code, 'note': entry.note,
            'created_at': entry.created_at, 'resolved_at': entry.resolved_at}


@router.get('/ai-ledger')
def ai_ledger(state: Literal['attention', 'reserved', 'settled', 'released', 'unknown', 'all'] = 'attention',
              offset: int = Query(default=0, ge=0), db: Session = Depends(get_db)):
    if ai_costs.expire_stale(db):
        db.commit()
    today = datetime.utcnow().date()
    limits = ai_costs.caps()
    query = db.query(AiCostEntry, User.email).outerjoin(User, User.id == AiCostEntry.user_id)
    if state == 'attention':
        query = query.filter(AiCostEntry.status.in_(['unknown', 'reserved']))
    elif state != 'all':
        query = query.filter(AiCostEntry.status == state)
    total = query.count()
    rows = query.order_by(AiCostEntry.created_at.desc(), AiCostEntry.id).offset(offset).limit(50).all()
    counter = db.get(AiSpendCounter, 'global:' + today.isoformat())
    committed = counter.committed_paise if counter else 0
    runtime = db.query(AiRuntimeConfig).first()
    return {
        'items': [ledger_row(entry, email) for entry, email in rows], 'total': total,
        'today': {
            'day': today.isoformat(), 'committed_paise': committed,
            'in_flight': counter.in_flight if counter else 0,
            'global_daily_cap_paise': limits['global_daily_cap_paise'],
            'user_daily_cap_paise': limits['user_daily_cap_paise'],
            'remaining_paise': max(0, limits['global_daily_cap_paise'] - committed),
            # Alerts are informational. Only the caps above block new AI operations.
            'alert_paise': limits['alert_paise'], 'alert_triggered': committed >= limits['alert_paise'],
            'cap_reached': committed >= limits['global_daily_cap_paise'],
        },
        'unknown_total': db.query(func.count(AiCostEntry.id)).filter(AiCostEntry.status == 'unknown').scalar(),
        'ai_enabled': runtime.ai_enabled if runtime else True,
        'reconciliation': ai_costs.reconcile(db, today),
    }


class LedgerResolution(BaseModel):
    outcome: Literal['charged', 'not_charged']
    actual_paise: int | None = Field(default=None, ge=0, le=10**8)
    note: str = Field(default='', max_length=200)


@router.post('/ai-ledger/{entry_id}/resolve')
def resolve_ledger_entry(entry_id: str, payload: LedgerResolution,
                         actor: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    entry = ai_costs.resolve_unknown(db, entry_id[:36], charged=payload.outcome == 'charged',
                                     actual_paise=payload.actual_paise, admin_id=actor.id, note=payload.note)
    db.add(AdminEvent(user_id=actor.id, event_name='admin_ai_ledger_resolved', payload_json=json.dumps({
        'entry_id': entry.id, 'outcome': payload.outcome, 'actual_paise': entry.actual_paise})))
    db.commit()
    return ledger_row(entry, None)


class PriceVersionCreate(BaseModel):
    model: str = Field(min_length=1, max_length=80, pattern=r'^[A-Za-z0-9._:-]+$')
    input_unit: Literal['tokens', 'text_tokens', 'audio_tokens', 'audio_seconds', 'characters'] = 'tokens'
    output_unit: Literal['tokens', 'text_tokens', 'audio_tokens', 'audio_seconds', 'characters'] = 'tokens'
    input_paise_per_million: int = Field(ge=0, le=10**9)
    output_paise_per_million: int = Field(ge=0, le=10**9)
    request_paise: int = Field(default=0, ge=0, le=10**6)
    effective_from: datetime | None = None
    note: str = Field(default='', max_length=200)


def price_row(row):
    return {'id': row.id, 'model': row.model, 'version': row.version, 'input_unit': row.input_unit,
            'output_unit': row.output_unit, 'input_paise_per_million': row.input_paise_per_million,
            'output_paise_per_million': row.output_paise_per_million, 'request_paise': row.request_paise,
            'effective_from': row.effective_from, 'note': row.note, 'created_at': row.created_at}


@router.get('/ai-prices')
def ai_prices(db: Session = Depends(get_db)):
    rows = db.query(AiPriceVersion).order_by(AiPriceVersion.model, AiPriceVersion.version.desc()).all()
    builtin = [{'model': model, 'input_unit': p[0], 'output_unit': p[1], 'input_paise_per_million': p[2],
                'output_paise_per_million': p[3], 'request_paise': p[4]} for model, p in sorted(ai_costs.BUILTIN_PRICES.items())]
    return {'versions': [price_row(row) for row in rows], 'builtin': builtin, 'builtin_basis': ai_costs.PRICE_BASIS}


@router.post('/ai-prices', status_code=201)
def add_ai_price(payload: PriceVersionCreate, actor: User = Depends(require_admin_user), db: Session = Depends(get_db)):
    latest = db.query(func.max(AiPriceVersion.version)).filter(AiPriceVersion.model == payload.model).scalar() or 0
    row = AiPriceVersion(model=payload.model, version=latest + 1, input_unit=payload.input_unit,
                         output_unit=payload.output_unit, input_paise_per_million=payload.input_paise_per_million,
                         output_paise_per_million=payload.output_paise_per_million, request_paise=payload.request_paise,
                         effective_from=payload.effective_from or datetime.utcnow(), note=payload.note or None,
                         created_by_user_id=actor.id)
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Another price version was added. Reload and retry.') from None
    db.add(AdminEvent(user_id=actor.id, event_name='admin_ai_price_added', payload_json=json.dumps({
        'model': row.model, 'version': row.version})))
    db.commit()
    db.refresh(row)
    return price_row(row)
