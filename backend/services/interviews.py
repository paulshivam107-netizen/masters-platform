"""Session persistence, optimistic concurrency, idempotency and durable quotas."""
import hashlib
import json
import os
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from models import AiRuntimeConfig, InterviewOperation, InterviewQuota, InterviewSession
from services import interview_provider as provider


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def limit(name, default):
    try:
        return max(1, min(int(os.getenv(name, str(default))), 10000))
    except ValueError:
        return default


def owned(db, session_id, user_id):
    session = db.query(InterviewSession).filter_by(id=session_id, user_id=user_id).first()
    if session is None:
        raise HTTPException(404, "Interview not found")
    return session


def require_live(db):
    runtime = db.query(AiRuntimeConfig).first()
    if runtime is not None and not runtime.ai_enabled:
        raise HTTPException(503, "AI practice is temporarily paused by the site owner.")
    if not provider.live_available():
        raise HTTPException(503, "AI interviews are not connected yet. You can try a demo instead.")


def reserve_quota(db, user_id, family="ai"):
    day = datetime.utcnow().date().isoformat()
    caps = (
        [(f"ai:global:{day}", limit("INTERVIEW_GLOBAL_DAILY_CALLS", 200)),
         (f"ai:user:{user_id}:{day}", limit("INTERVIEW_USER_DAILY_CALLS", 40))]
        if family == "ai" else
        [(f"{family}:user:{user_id}:{day}", 5 if family == "resume" else 8)]
    )
    if family == "resume_upload":
        caps = [(f"resume_upload:global:{day}", 200), (f"resume_upload:user:{user_id}:{day}", 20)]
    for key, cap in caps:
        if db.get(InterviewQuota, key) is None:
            try:
                with db.begin_nested():
                    db.add(InterviewQuota(id=key, calls=0))
                    db.flush()
            except IntegrityError:
                pass
        changed = db.query(InterviewQuota).filter(
            InterviewQuota.id == key, InterviewQuota.calls < cap,
        ).update({InterviewQuota.calls: InterviewQuota.calls + 1}, synchronize_session=False)
        if changed != 1:
            db.rollback()
            raise HTTPException(429, "Today's interview usage limit has been reached. Limits reset at midnight UTC.")


def serialize(session, detail=True):
    transcript = json.loads(session.transcript_json)
    result = {
        "id": session.id, "provider": session.provider, "mode": session.mode,
        "status": session.status, "version": session.version,
        "question_limit": session.question_limit,
        "answer_count": sum(t["role"] == "user" for t in transcript),
        "context": json.loads(session.context_json), "prompt_version": session.prompt_version,
        "created_at": session.created_at.isoformat() + "Z",
        "updated_at": session.updated_at.isoformat() + "Z",
        "busy": bool(session.pending_token and session.pending_until and session.pending_until > datetime.utcnow()),
    }
    if detail:
        result.update(transcript=transcript, feedback=json.loads(session.feedback_json) if session.feedback_json else None)
    else:
        # Background and goals are unnecessary in the history list.
        result["context"] = {k: v for k, v in result["context"].items() if k in ("school", "programme", "route")}
    return result


def claim(db, session, request_id, version, kind, payload, billable=True):
    request_id = str(request_id)
    digest = fingerprint({"kind": kind, "payload": payload, "version": version})
    previous = db.query(InterviewOperation).filter_by(session_id=session.id, request_id=request_id).first()
    if previous:
        if previous.fingerprint != digest or previous.kind != kind:
            raise HTTPException(409, "This request ID was already used for a different action.")
        if previous.status == "succeeded":
            return previous, None
    if session.version != version:
        raise HTTPException(409, "This interview changed in another tab. Reload it before sending your answer.")
    if session.status == "completed":
        raise HTTPException(409, "This interview is complete. Start another session to practise again.")
    if kind in ("answer", "transcribe") and session.status != "active":
        raise HTTPException(409, "All answers are saved. Open the debrief to finish.")
    if session.provider == "openai":
        require_live(db)
    now = datetime.utcnow()
    token = str(uuid4())
    changed = db.query(InterviewSession).filter(
        InterviewSession.id == session.id, InterviewSession.version == version,
        or_(InterviewSession.pending_token.is_(None), InterviewSession.pending_until < now),
    ).update({"pending_token": token, "pending_until": now + timedelta(minutes=3)}, synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, "An interview step is already running. Wait a moment, then reload the session.")
    if billable and session.provider == "openai":
        reserve_quota(db, session.user_id)
    if previous:
        previous.status = "pending"
        previous.attempts += 1
        op = previous
    else:
        op = InterviewOperation(id=str(uuid4()), session_id=session.id, request_id=request_id,
                                kind=kind, fingerprint=digest)
        db.add(op)
    db.commit()
    db.refresh(session)
    return op, token


def complete(db, session, op, token, updates=None, result=None, usage=None):
    values = {"pending_token": None, "pending_until": None, "updated_at": datetime.utcnow()}
    if updates:
        values.update(updates)
        values["version"] = InterviewSession.version + 1
    changed = db.query(InterviewSession).filter_by(id=session.id, pending_token=token).update(values, synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, "The session changed while this step was running. Reload to continue.")
    op.status = "succeeded"
    op.failure_code = None
    op.result_json = json.dumps(result) if result is not None else None
    op.usage_json = json.dumps(usage or {})
    db.commit()
    db.refresh(session)
    return serialize(session)


def fail(db, session_id, operation_id, token, reason="save_failed"):
    db.rollback()
    changed = db.query(InterviewSession).filter_by(id=session_id, pending_token=token).update(
        {"pending_token": None, "pending_until": None}, synchronize_session=False,
    )
    if changed:
        db.query(InterviewOperation).filter_by(id=operation_id).update({"status": "failed", "failure_code": reason, "failed_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()


def run_step(db, session, op, token, action):
    try:
        return action()
    except provider.ProviderFailure as exc:
        fail(db, session.id, op.id, token, getattr(exc, "code", "provider_error"))
        raise HTTPException(exc.status, str(exc)) from None
    except HTTPException:
        raise
    except Exception:
        fail(db, session.id, op.id, token)
        raise HTTPException(503, "This interview step could not be saved. Reload the session before retrying.") from None
