import json
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from database import get_db
from models import ApplicationTracker, ResumeQuestionSet, User
from resume_schemas import ResumeQuestionsCreate
from routers.interview_routes import interview_user
from services import interview_provider as provider
from services.interviews import fingerprint, reserve_quota, require_live
from services.resume_parser import MAX_BYTES
from services.resume_questions import extract_document, generate_questions, owned_set, serialize_set

router = APIRouter(prefix="/interviews/resume", tags=["resume questions"])


@router.post("/extract")
async def extract_resume(request: Request, format: Literal["pdf", "docx", "txt"],
                         user: User = Depends(interview_user), db: Session = Depends(get_db)):
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > MAX_BYTES:
            raise HTTPException(413, "Choose a resume under 5 MiB.")
        data.extend(chunk)
    reserve_quota(db, user.id, "resume_upload")
    db.commit()
    text = await run_in_threadpool(extract_document, bytes(data), format)
    return {"text": text, "message": "Review and edit this text before generating questions. The uploaded file is not saved."}


@router.get("/question-sets")
def list_sets(offset: int = 0, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    if not 0 <= offset <= 10000:
        raise HTTPException(422, "Invalid history offset")
    rows = db.query(ResumeQuestionSet).filter_by(user_id=user.id, status="completed").order_by(ResumeQuestionSet.created_at.desc()).offset(offset).limit(21).all()
    return {"items": [serialize_set(row) for row in rows[:20]], "has_more": len(rows) > 20}


@router.post("/question-sets", status_code=201)
def create_set(payload: ResumeQuestionsCreate, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    digest = fingerprint(payload.model_dump(mode="json"))
    row = db.query(ResumeQuestionSet).filter_by(user_id=user.id, request_id=str(payload.request_id)).first()
    if row:
        if row.fingerprint != digest:
            raise HTTPException(409, "This request ID was already used with different resume details.")
        if row.status == "completed":
            return serialize_set(row)
    require_live(db)
    if not payload.consent:
        raise HTTPException(422, "Confirm the resume processing notice before generating questions.")
    application = None
    if payload.application_id:
        application = db.query(ApplicationTracker).filter_by(id=payload.application_id, user_id=user.id).first()
        if not application:
            raise HTTPException(404, "Application not found")
    context = {"route": payload.route, "school": application.school_name if application else "General MBA practice",
               "programme": application.program_name if application else (payload.programme_name or "MBA")}
    now, token = datetime.utcnow(), str(uuid4())
    if row is None:
        reserve_quota(db, user.id, "resume")
        row = ResumeQuestionSet(id=str(uuid4()), user_id=user.id, request_id=str(payload.request_id), fingerprint=digest,
                                context_json=json.dumps(context), pending_token=token, pending_until=now + timedelta(minutes=3))
        db.add(row)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "These questions are already being prepared. Wait a moment, then retry.") from None
    else:
        changed = db.query(ResumeQuestionSet).filter(
            ResumeQuestionSet.id == row.id,
            or_(ResumeQuestionSet.pending_token.is_(None), ResumeQuestionSet.pending_until < now),
        ).update({"pending_token": token, "pending_until": now + timedelta(minutes=3), "status": "pending"}, synchronize_session=False)
        if changed != 1:
            db.rollback()
            raise HTTPException(409, "These questions are still being prepared. Please wait before retrying.")
    reserve_quota(db, user.id)
    db.commit()
    row_id = row.id
    try:
        graph, usage = generate_questions(payload.resume_text, context)
        changed = db.query(ResumeQuestionSet).filter_by(id=row_id, pending_token=token).update({
            "status": "completed", "questions_json": json.dumps(graph), "usage_json": json.dumps(usage),
            "pending_token": None, "pending_until": None}, synchronize_session=False)
        if changed != 1:
            db.rollback()
            raise HTTPException(409, "This question set changed. Refresh your saved sets before retrying.")
        db.commit()
        db.refresh(row)
        return serialize_set(row)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        db.query(ResumeQuestionSet).filter_by(id=row_id, pending_token=token).update({
            "status": "failed", "pending_token": None, "pending_until": None}, synchronize_session=False)
        db.commit()
        message = str(exc) if isinstance(exc, provider.ProviderFailure) else "Questions could not be prepared. Your reviewed text is still here; please retry."
        raise HTTPException(503, message) from None


@router.delete("/question-sets/{set_id}", status_code=204)
def delete_set(set_id: UUID, user: User = Depends(interview_user), db: Session = Depends(get_db)):
    row = owned_set(db, set_id, user.id)
    changed = db.query(ResumeQuestionSet).filter(
        ResumeQuestionSet.id == row.id,
        or_(ResumeQuestionSet.pending_token.is_(None), ResumeQuestionSet.pending_until < datetime.utcnow()),
    ).delete(synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, "Wait for question generation to finish before deleting this set.")
    db.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
