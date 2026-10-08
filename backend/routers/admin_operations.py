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
from models import (AdminEconomicsScenario, AdminEvent, InterviewOperation,
                    InterviewQuota, InterviewSession, PilotFeedback, ResumeQuestionSet, User)
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
