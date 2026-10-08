import hashlib
import json
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from auth import get_current_user
from database import get_db
from interview_schemas import InterviewAction, InterviewAnswer, InterviewCreate, InterviewSpeech
from models import AiRuntimeConfig, ApplicationTracker, InterviewOperation, InterviewSession, User
from services import interview_provider as provider
from services.interview_questions import question_bank, starting_question, follow_up_questions
from services.resume_questions import owned_set
from services.interview_plan import make_plan
from services.interviews import claim, complete, fingerprint, owned, require_live, reserve_quota, run_step, serialize
from services.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/interviews", tags=["interviews"])


def interview_user(request: Request, response: Response, user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if not user.is_active:
        raise HTTPException(403, "This account is inactive")
    enforce_rate_limit(request, action="interviews", limit=90, window_seconds=60, user_id=user.id)
    return user


@router.get("/questions")
def questions(user: User = Depends(interview_user)):
    return question_bank()


@router.get("/capabilities")
def capabilities(user: User = Depends(interview_user), db: Session = Depends(get_db)):
    runtime = db.query(AiRuntimeConfig).first()
    available = provider.live_available() and (runtime is None or runtime.ai_enabled)
    return {"chat": available, "voice": available, "demo": True,
            "provider": "openai", "voice_style": "turn_based",
            "max_answer_chars": 3000, "max_recording_seconds": provider.MAX_RECORDING_SECONDS,
            "max_audio_bytes": provider.MAX_AUDIO_BYTES,
            "message": "AI interviews are connected." if available else "AI practice is not connected yet. You can explore a clearly labelled demo."}


@router.get("/sessions")
def list_sessions(user: User = Depends(interview_user), db: Session = Depends(get_db), offset: int = 0):
    if offset < 0 or offset > 10000:
        raise HTTPException(422, "Invalid history offset")
    rows = db.query(InterviewSession).filter_by(user_id=user.id).order_by(InterviewSession.created_at.desc()).offset(offset).limit(21).all()
    return {"items": [serialize(row, False) for row in rows[:20]], "has_more": len(rows) > 20}


@router.post("/sessions", status_code=201)
def create_session(payload: InterviewCreate, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    digest = fingerprint(payload.model_dump(mode="json"))
    previous = db.query(InterviewSession).filter_by(user_id=user.id, create_request_id=str(payload.request_id)).first()
    if previous:
        if previous.create_fingerprint != digest:
            raise HTTPException(409, "This request ID was already used for another interview.")
        return serialize(previous)
    if payload.provider == "openai":
        require_live(db)
        if not payload.consent:
            raise HTTPException(422, "Confirm the AI processing notice before starting.")
    if payload.provider == "demo" and payload.mode == "voice":
        raise HTTPException(422, "The demo supports typed answers. Voice needs a live AI connection.")
    application = None
    if payload.application_id:
        application = db.query(ApplicationTracker).filter_by(id=payload.application_id, user_id=user.id).first()
        if not application:
            raise HTTPException(404, "Application not found")
    context = {"route": payload.route, "background": payload.background, "goal": payload.goal,
               "school": application.school_name if application else "General MBA practice",
               "programme": application.program_name if application else (payload.programme_name or "MBA"),
               "practice_focus": payload.practice_focus, "question_limit": payload.question_limit,
               "interview_plan": make_plan(payload.route, payload.practice_focus)}
    opening = ("Tell me about yourself and why a two-year MBA is the next step you want to take."
               if payload.route == "cat" else
               "Walk me through your experience and why a management programme makes sense for you now.")
    if payload.profile_set_id:
        profile_set = owned_set(db, payload.profile_set_id, user.id)
        if profile_set.status != "completed" or json.loads(profile_set.context_json)["route"] != payload.route:
            raise HTTPException(422, "Choose a completed resume profile for this programme type.")
        profile_graph = json.loads(profile_set.questions_json)
        facts = {fact["id"]: fact for fact in profile_graph.get("profile", [])}
        selected_facts = payload.profile_fact_ids or []
        if not selected_facts or len(set(selected_facts)) != len(selected_facts) or any(key not in facts for key in selected_facts):
            raise HTTPException(422, "Review the facts in your saved resume profile again.")
        context.update(profile_set_id=profile_set.id, resume_profile=[facts[key] for key in selected_facts],
                       profile_version=profile_graph["version"])
    if payload.question_set_id:
        question_set = owned_set(db, payload.question_set_id, user.id)
        if question_set.status != "completed":
            raise HTTPException(409, "These resume questions are not ready yet.")
        graph = json.loads(question_set.questions_json)
        if json.loads(question_set.context_json)["route"] != payload.route:
            raise HTTPException(422, "Choose a resume profile for this programme type.")
        context.update(question_set_id=question_set.id, question_bank_version=graph["version"])
        chosen = next((node for node in graph["nodes"] if node["id"] == payload.question_id
                       and node["id"] in graph["roots"] and payload.route in node["routes"]), None)
        if payload.question_id and chosen is None:
            raise HTTPException(422, "Choose an opening from your saved set for the same application route.")
        if chosen:
            opening = chosen["text"]
        follow_ups, pending = [], [chosen["id"]] if chosen else []
        while pending:
            current = pending.pop(0)
            children = [edge["child"] for edge in graph["edges"] if edge["parent"] == current]
            pending.extend(children)
            follow_ups.extend(node["text"] for node in graph["nodes"] if node["id"] in children)
        context.update(question_id=chosen["id"] if chosen else None, resume_follow_ups=follow_ups)
    elif payload.question_id:
        chosen = starting_question(payload.question_id, payload.route)
        if chosen is None:
            raise HTTPException(422, "Choose a starting question available for your application route.")
        opening = chosen["text"]
        context.update(question_id=chosen["id"], question_bank_version=question_bank()["version"])
    if payload.profile_fact_ids and not payload.profile_set_id:
        raise HTTPException(422, "Choose the saved resume profile for these facts.")
    if not payload.question_id:
        openings = {
            "behavioural": "Tell me about a time something you tried did not work out. What happened?",
            "motivation": "Why is this management programme the right next step for you now?",
            "academics": "Choose a subject or academic project you know well. What interests you about it?",
            "work": "Describe a recent responsibility and a decision you personally made within it.",
            "resume": "Choose one experience from your resume that you would like to discuss. What was your part in it?",
        }
        opening = openings.get(payload.practice_focus, opening)
    reserve_quota(db, user.id, "sessions")
    session = InterviewSession(
        id=str(uuid4()), user_id=user.id, create_request_id=str(payload.request_id), create_fingerprint=digest,
        context_json=json.dumps(context), provider=payload.provider, mode=payload.mode,
        question_limit=payload.question_limit, prompt_version=provider.PROMPT_VERSION,
        transcript_json=json.dumps([{"id": "q1", "role": "assistant", "text": opening}]),
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        previous = db.query(InterviewSession).filter_by(user_id=user.id, create_request_id=str(payload.request_id)).first()
        if previous and previous.create_fingerprint == digest:
            return serialize(previous)
        raise HTTPException(409, "An interview with this request ID already exists") from None
    db.refresh(session)
    return serialize(session)


@router.get("/sessions/{session_id}")
def get_session(session_id: UUID, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    return serialize(owned(db, str(session_id), user.id))


@router.post("/sessions/{session_id}/answers")
def answer(session_id: UUID, payload: InterviewAnswer, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    session = owned(db, str(session_id), user.id)
    transcript = json.loads(session.transcript_json)
    count = sum(turn["role"] == "user" for turn in transcript)
    # Replay checks in claim precede closed-session/version checks.
    op, token = claim(db, session, payload.request_id, payload.expected_version, "answer", {"text": payload.text},
                      billable=count + 1 < session.question_limit)
    if token is None:
        return serialize(session)

    def perform():
        if session.status != "active" or count >= session.question_limit:
            raise provider.ProviderFailure("All answers are saved. Open the debrief to finish.", 409)
        transcript.append({"id": f"a{count + 1}", "role": "user", "text": payload.text, "request_id": str(payload.request_id)})
        status = "ready_for_feedback"
        usage = {}
        if count + 1 < session.question_limit:
            if session.provider == "demo":
                context = json.loads(session.context_json)
                branch = context.get("resume_follow_ups") or follow_up_questions(context.get("question_id"), context["route"])
                question = {"question": branch[count] if count < len(branch) else provider.demo_question(count + 1)}
            else:
                question, usage = provider.next_question(json.loads(session.context_json), transcript)
            transcript.append({"id": f"q{count + 2}", "role": "assistant", "text": question["question"],
                               **{key: value for key, value in question.items() if key != "question"}})
            status = "active"
        return complete(db, session, op, token, {"transcript_json": json.dumps(transcript), "status": status}, usage=usage)
    return run_step(db, session, op, token, perform)


@router.post("/sessions/{session_id}/finish")
def finish(session_id: UUID, payload: InterviewAction, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    session = owned(db, str(session_id), user.id)
    if session.status == "completed":
        return serialize(session)
    transcript = json.loads(session.transcript_json)
    if not any(t["role"] == "user" for t in transcript):
        raise HTTPException(422, "Answer at least one question before requesting a debrief.")
    op, token = claim(db, session, payload.request_id, payload.expected_version, "feedback", {})
    if token is None:
        return serialize(session)

    def perform():
        report, usage = ((provider.demo_feedback(transcript), {}) if session.provider == "demo" else
                         provider.feedback(json.loads(session.context_json), transcript))
        return complete(db, session, op, token,
                        {"feedback_json": json.dumps(report), "status": "completed"}, usage=usage)
    return run_step(db, session, op, token, perform)


def voice_session(db, session_id, user_id):
    session = owned(db, str(session_id), user_id)
    if session.provider != "openai" or session.mode != "voice":
        raise HTTPException(422, "Start a voice interview to use audio.")
    require_live(db)
    return session


@router.post("/sessions/{session_id}/transcribe")
async def transcribe(session_id: UUID, request: Request, request_id: UUID, expected_version: int,
                     user: User = Depends(interview_user), db: Session = Depends(get_db)):
    session = voice_session(db, session_id, user.id)
    if session.status != "active" or expected_version < 0:
        raise HTTPException(409, "This interview is not waiting for an answer.")
    content_type = request.headers.get("content-type", "").split(";")[0].lower()
    if content_type not in {"audio/webm", "audio/mp4", "audio/wav", "audio/mpeg"}:
        raise HTTPException(415, "Use a WebM, MP4, WAV or MP3 recording.")
    audio = bytearray()
    async for chunk in request.stream():
        audio.extend(chunk)
        if len(audio) > provider.MAX_AUDIO_BYTES:
            raise HTTPException(413, "This recording is too large. Record a shorter answer or type it instead.")
    valid = (content_type == "audio/webm" and audio[:4] == b"\x1aE\xdf\xa3" or
             content_type == "audio/mp4" and audio[4:8] == b"ftyp" or
             content_type == "audio/wav" and audio[:4] == b"RIFF" and audio[8:12] == b"WAVE" or
             content_type == "audio/mpeg" and (audio[:3] == b"ID3" or len(audio) > 1 and audio[0] == 255 and audio[1] & 224 == 224))
    if len(audio) < 32 or not valid:
        raise HTTPException(422, "This recording is empty or unreadable. Record again or type your answer.")
    op, token = claim(db, session, request_id, expected_version, "transcribe", {"audio_hash": hashlib.sha256(audio).hexdigest()})
    if token is None:
        return json.loads(op.result_json)

    def perform():
        text = provider.transcribe(bytes(audio), content_type)
        result = {"text": text}
        complete(db, session, op, token, result=result,
                 usage={"audio_bytes": len(audio), "model": "transcription"})
        return result
    # Raw audio is bounded, used for this request only, and never written to disk/database.
    return await run_in_threadpool(run_step, db, session, op, token, perform)


@router.post("/sessions/{session_id}/speech")
def speech(session_id: UUID, payload: InterviewSpeech, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    session = voice_session(db, session_id, user.id)
    question = next((t for t in json.loads(session.transcript_json) if t["id"] == payload.turn_id and t["role"] == "assistant"), None)
    if question is None:
        raise HTTPException(404, "Question not found")
    op, token = claim(db, session, payload.request_id, payload.expected_version, "speech", {"turn_id": payload.turn_id})
    if token is None:
        raise HTTPException(409, "Audio is not retained on the server. Press Hear question to generate it again.")

    def perform():
        audio = provider.speech(question["text"])
        complete(db, session, op, token, usage={"characters": len(question["text"]), "model": "speech"})
        return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
    return run_step(db, session, op, token, perform)


@router.get("/sessions/{session_id}/export")
def export_session(session_id: UUID, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    return JSONResponse(serialize(owned(db, str(session_id), user.id)), headers={
        "Content-Disposition": f'attachment; filename="interview-{session_id}.json"', "Cache-Control": "no-store",
    })


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: UUID, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    session = owned(db, str(session_id), user.id)
    # Take the same row lease used by paid steps before deleting its operations.
    now = datetime.utcnow()
    changed = db.query(InterviewSession).filter(
        InterviewSession.id == session.id, InterviewSession.version == session.version,
        or_(InterviewSession.pending_token.is_(None), InterviewSession.pending_until < now),
    ).update({"pending_token": str(uuid4()), "pending_until": now + timedelta(minutes=3)}, synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, "Wait for the current step to finish before deleting this session.")
    db.query(InterviewOperation).filter_by(session_id=session.id).delete(synchronize_session=False)
    db.delete(session)
    db.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
