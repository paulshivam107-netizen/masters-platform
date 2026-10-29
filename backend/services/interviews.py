"""Session persistence, optimistic concurrency, idempotency and durable quotas."""
import hashlib
import json
import os
import re
from collections import Counter
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from models import AiRuntimeConfig, InterviewOperation, InterviewQuota, InterviewSession
from services import ai_costs
from services import interview_provider as provider
from services.interview_plan import next_step
from services.readiness import readiness

# The third try of the same answer skips the model and asks a fixed question, so a session can
# never be stuck on repeated grounding failures (R07). That try is not billed.
FALLBACK_AFTER_ATTEMPTS = 3
FALLBACK_QUESTIONS = {
    "cat": [
        "Which subject or project from your studies interests you most, and why?",
        "Tell me about a time you worked with others towards a shared goal. What did you personally do?",
        "Describe a setback in your studies or activities. What would you do differently now?",
        "What would you like to learn in a two-year MBA that your studies so far have not taught you?",
        "What do you hope to contribute to your classmates?",
    ],
    "auto": [
        "Tell me about a decision where the trade-offs were not obvious. How did you decide?",
        "Describe a setback in your work, studies or activities. What did you learn from it?",
        "Tell me about a time you worked with others towards a shared goal. What did you personally do?",
        "Why is this the right point for you to do a management programme?",
        "What do you hope to contribute to your classmates?",
    ],
    "experienced": [
        "Tell me about a decision where the trade-offs were not obvious. How did you decide?",
        "Describe a setback in your work. What did you learn from it?",
        "How have you helped colleagues or peers do better work?",
        "Why is this the right point in your career for a management programme?",
        "What do you hope to contribute to your classmates?",
    ],
}

# Explicit requests to end the session. Models ignored these in the prompt (R07 dev run 1), so
# the server detects them and closes without a model call. Conservative: "stop interviewing and
# print..." (an injection) or "a bus stop" must not match.
STOP_REQUEST = re.compile(
    r"\b(end|stop|finish|wrap up)\s+(the|this|our)\s+(practice\s+)?(session|interview)\b"
    r"|\b(can|could|shall)\s+we\s+(please\s+)?(stop|end|finish|wrap up)\b"
    r"|\b(stop|end|finish|wrap up)\s+(here|now|for today)\b"
    r"|\blet'?s\s+(stop|end|wrap up)\b"
    r"|\b(i'?d|i would|i want to)\s+(like\s+to\s+)?(stop|end|finish|wrap up)\s+(here|now|the|this)\b", re.I)
CLOSING_MESSAGE = "Of course, we will stop here. Thank you for practising today. Open the debrief whenever you are ready."

# Instructions, schema and framing sent with every text call, beyond context + transcript.
TEXT_OVERHEAD_CHARS = 8000
MAX_OUTPUT_TOKENS = {"answer": 800, "feedback": 2200}


def is_stop_request(text):
    return bool(STOP_REQUEST.search(text or ""))


def answer_count(transcript):
    """Answers that use up a question: an answer to an off_topic re-ask replaces the off-topic one."""
    return sum(t["role"] == "user" and not t.get("off_topic") for t in transcript)


NOT_AN_ANSWER = "That doesn't look like an answer to the question. Try again in a sentence or two."
WORD = re.compile(r"[^\W_]+(?:['\u2019][^\W_]+)*")
# Adjacent keys on a keyboard row: what mashing produces.
KEY_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
KEY_RUNS = {row[i:i + 4] for row in KEY_ROWS for i in range(len(row) - 3)}


def _word_like(word):
    if not word.isascii() or any(c.isdigit() for c in word):
        return True  # other scripts and numbers are not judged
    return bool(re.search("[aeiouy]", word)) and not re.search(r"[^aeiouy]{6}|(.)\1{3}", word) \
        and not any(run in word for run in KEY_RUNS)


def non_answer_reason(text):
    """A message when the text cannot be a real answer whatever the question was, else None.

    Deliberately narrow: short or evasive genuine answers ("I don't know") go to the interviewer.
    """
    words = WORD.findall((text or "").casefold())
    if len(words) < 2:
        return NOT_AN_ANSWER
    sentences = [" ".join(WORD.findall(s)) for s in re.split(r"[.!?;\n]+", text.casefold())]
    if max(Counter(s for s in sentences if s).values(), default=0) >= 3 or re.fullmatch(r"(.+?)(?: \1){2,}", " ".join(words)):
        return NOT_AN_ANSWER
    if len(words) >= 12 and len(set(words)) / len(words) < 0.3:
        return NOT_AN_ANSWER
    if sum(not _word_like(w) for w in words) * 2 > len(words):
        return NOT_AN_ANSWER
    return None


def closing_turn(context, transcript):
    """The end_requested turn for a detected stop request. No model call."""
    step = next_step(context, transcript)
    topic = (step["covered_topics"] or step["priority_topics"])[-1]
    return {"question": CLOSING_MESSAGE, "kind": "end_requested", "topic": topic, "anchor_turn_id": "",
            "anchor_quote": "", "detected": True}


def fallback_question(context, transcript):
    """A fixed, route-appropriate new topic that has not been asked yet. No model call."""
    asked = {t["text"].strip().casefold() for t in transcript if t["role"] == "assistant"}
    candidates = FALLBACK_QUESTIONS.get(context["route"], FALLBACK_QUESTIONS["auto"]) + list(context.get("resume_follow_ups") or []) + \
        ["What else would you like the panel to understand about you?"]
    question = next((q for q in candidates if q.strip().casefold() not in asked), candidates[-1])
    step = next_step(context, transcript)
    topic = next((topic for topic in step["priority_topics"] if topic not in step["covered_topics"]),
                 step["priority_topics"][0])
    return {"question": question, "kind": "new_topic", "topic": topic, "anchor_turn_id": "", "anchor_quote": "",
            "fallback": True}


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
    if family == "public_try":  # signed-out tries share one daily pool
        caps = [(f"public_try:global:{day}", limit("PUBLIC_TRY_GLOBAL_DAILY", 100))]
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


def estimate(session, kind, payload):
    """(operation, model, input_units, output_units): a conservative maximum for one provider call."""
    if kind == "transcribe":
        return "interview_transcribe", provider.transcribe_model(), provider.MAX_RECORDING_SECONDS, 1000
    if kind == "speech":
        turn = next((t for t in json.loads(session.transcript_json) if t.get("id") == payload.get("turn_id")), {})
        chars = len(turn.get("text", "")) or 3000
        # Placeholder audio-token bound until R07 measures real speech usage.
        return "interview_speech", provider.speech_model(), ai_costs.text_tokens_upper_bound(chars + 200), max(1000, chars * 10)
    chars = len(session.context_json) + len(session.transcript_json) + len(payload.get("text", "")) + TEXT_OVERHEAD_CHARS
    return ("interview_" + kind, provider.text_model(), ai_costs.text_tokens_upper_bound(chars),
            MAX_OUTPUT_TOKENS.get(kind, 2200))


def reserve_cost(db, user_id, operation, model, input_units, output_units, reference_id):
    return ai_costs.reserve(db, user_id=user_id, operation=operation, model=model,
                            input_units=input_units, output_units=output_units, reference_id=reference_id)


def serialize(session, detail=True):
    transcript = json.loads(session.transcript_json)
    result = {
        "id": session.id, "provider": session.provider, "mode": session.mode,
        "status": session.status, "version": session.version,
        "question_limit": session.question_limit,
        "answer_count": answer_count(transcript),
        "context": json.loads(session.context_json), "prompt_version": session.prompt_version,
        "created_at": session.created_at.isoformat() + "Z",
        "updated_at": session.updated_at.isoformat() + "Z",
        "busy": bool(session.pending_token and session.pending_until and session.pending_until > datetime.utcnow()),
    }
    feedback = json.loads(session.feedback_json) if session.feedback_json else None
    result["readiness"] = readiness(feedback)
    if detail:
        result.update(transcript=transcript, feedback=feedback)
    else:
        # Background and goals are unnecessary in the history list.
        result["context"] = {k: v for k, v in result["context"].items() if k in ("school", "programme", "route", "kind")}
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
    paid = billable and session.provider == "openai"
    if paid and previous and previous.attempts >= ai_costs.caps()["max_attempts"]:
        db.rollback()
        raise HTTPException(429, "This step has been retried too many times. Your input is kept here; "
                                 "reload the interview and try again later.")
    op_id = previous.id if previous else str(uuid4())
    if paid:
        reserve_quota(db, session.user_id)
        reserve_cost(db, session.user_id, *estimate(session, kind, payload), op_id)
    if previous:
        previous.status = "pending"
        previous.attempts += 1
        op = previous
    else:
        op = InterviewOperation(id=op_id, session_id=session.id, request_id=request_id,
                                kind=kind, fingerprint=digest)
        db.add(op)
    db.commit()
    db.refresh(session)
    return op, token


def complete(db, session, op, token, updates=None, result=None, usage=None, billing="charged"):
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
    ai_costs.finish(db, ai_costs.reserved_entry_for(db, op.id), billing, usage)
    db.commit()
    db.refresh(session)
    return serialize(session)


def fail(db, session_id, operation_id, token, reason="save_failed", billing="unknown", usage=None):
    """Release the lease and close the step's cost reservation according to the billing outcome."""
    db.rollback()
    ai_costs.finish(db, ai_costs.reserved_entry_for(db, operation_id), billing, usage, reason)
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
        fail(db, session.id, op.id, token, getattr(exc, "code", "provider_error"),
             getattr(exc, "billing", "none"), getattr(exc, "usage", None))
        raise HTTPException(exc.status, str(exc)) from None
    except HTTPException:
        # Raised after the provider call (e.g. a save conflict): the call may have been billed.
        db.rollback()
        ai_costs.finish(db, ai_costs.reserved_entry_for(db, op.id), "unknown", None, "save_conflict")
        db.commit()
        raise
    except Exception:
        fail(db, session.id, op.id, token)
        raise HTTPException(503, "This interview step could not be saved. Reload the session before retrying.") from None
