from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ApplicationTracker, Essay, User
from schemas import (
    EssayAssistRequest,
    EssayAssistResponse,
    EssayCreate,
    EssayResponse,
    EssayReviewRequest,
    EssayVersionInfo,
    ReviewResponse,
)
from services.ai_runtime import (
    call_gemini_text,
    call_openai_text,
    get_or_create_ai_runtime_config,
)
from services.migrations import backfill_essay_application_links
from services.reviews import extract_score, generate_mock_outline, generate_mock_review

router = APIRouter(prefix="/essays", tags=["essays"])


@router.post("/", response_model=EssayResponse)
async def create_essay(
    essay: EssayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application_id = essay.application_id

    if application_id is not None:
        application = db.query(ApplicationTracker).filter(
            and_(ApplicationTracker.id == application_id, ApplicationTracker.user_id == current_user.id)
        ).first()
        if not application:
            raise HTTPException(status_code=404, detail="Linked application not found")

    if essay.parent_essay_id:
        parent = db.query(Essay).filter(
            and_(Essay.id == essay.parent_essay_id, Essay.user_id == current_user.id)
        ).first()

        if not parent:
            raise HTTPException(status_code=404, detail="Parent essay not found")

        if application_id is None:
            application_id = parent.application_id

        db.query(Essay).filter(Essay.parent_essay_id == essay.parent_essay_id).update({"is_latest": False})
        db.query(Essay).filter(Essay.id == essay.parent_essay_id).update({"is_latest": False})

        version_count = db.query(Essay).filter(Essay.parent_essay_id == essay.parent_essay_id).count()
        new_version = version_count + 2
        parent_id = essay.parent_essay_id
    else:
        new_version = 1
        parent_id = None

    db_essay = Essay(
        user_id=current_user.id,
        school_name=essay.school_name,
        program_type=essay.program_type,
        essay_prompt=essay.essay_prompt,
        essay_content=essay.essay_content,
        version=new_version,
        parent_essay_id=parent_id,
        application_id=application_id,
        is_latest=True
    )

    db.add(db_essay)
    db.commit()
    db.refresh(db_essay)
    return db_essay


@router.get("/", response_model=List[EssayResponse])
async def get_essays(
    current_user: User = Depends(get_current_user),
    latest_only: bool = True,
    application_id: Optional[int] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db)
):
    backfill_essay_application_links(current_user.id, db)

    query = db.query(Essay).filter(Essay.user_id == current_user.id)
    if latest_only:
        query = query.filter(Essay.is_latest == True)
    if application_id is not None:
        query = query.filter(Essay.application_id == application_id)

    return query.offset(skip).limit(limit).all()


@router.get("/{essay_id}", response_model=EssayResponse)
async def get_essay(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(and_(Essay.id == essay_id, Essay.user_id == current_user.id)).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay


@router.get("/{essay_id}/versions", response_model=EssayVersionInfo)
async def get_essay_versions(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(and_(Essay.id == essay_id, Essay.user_id == current_user.id)).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")

    root_id = essay.parent_essay_id if essay.parent_essay_id else essay.id
    versions = db.query(Essay).filter(
        and_(Essay.user_id == current_user.id, ((Essay.id == root_id) | (Essay.parent_essay_id == root_id)))
    ).order_by(Essay.version).all()

    return {
        "essay_id": essay_id,
        "total_versions": len(versions),
        "current_version": essay.version,
        "versions": versions
    }


def _build_review_prompt(essay: Essay, review_request: EssayReviewRequest) -> str:
    return f"""You are an expert admissions consultant reviewing MBA/MS application essays.

School: {essay.school_name}
Program Type: {essay.program_type}
Essay Prompt: {essay.essay_prompt}

Essay Content:
{essay.essay_content}

Please provide a comprehensive review with:
1. Overall Assessment (strengths and weaknesses)
2. Structure and Flow Analysis
3. Content Quality (storytelling, authenticity, impact)
4. Specific Suggestions for Improvement
5. Grammar and Style Review
6. Overall Score (1-10) and Competitiveness

Focus Areas: {', '.join(review_request.focus_areas) if review_request.focus_areas else 'All aspects'}
"""


def _build_outline_prompt(payload: EssayAssistRequest) -> str:
    point_lines = "\n".join([f"- {point}" for point in payload.skeleton_points])
    return f"""You are an admissions writing coach.

Build a practical essay outline using the user's skeleton points.

School: {payload.school_name}
Program: {payload.program_type}
Prompt: {payload.essay_prompt}
Target length: {payload.target_word_count} words

Skeleton points from user:
{point_lines}

Return:
1) A markdown outline with 5 sections and approximate word budget per section.
2) Exactly 3 concise next-step bullets.
3) Keep language tactical and specific.
"""


def _run_provider_text(provider: str, prompt: str, *, max_tokens: int, openai_model: str, gemini_model: str) -> str:
    if provider == "openai":
        return call_openai_text(prompt, max_tokens=max_tokens, model=openai_model)
    if provider == "gemini":
        return call_gemini_text(prompt, max_tokens=max_tokens, model=gemini_model)
    raise HTTPException(status_code=400, detail="Unsupported AI provider in runtime config.")


@router.post("/{essay_id}/review", response_model=ReviewResponse)
async def review_essay(
    essay_id: int,
    review_request: EssayReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(and_(Essay.id == essay_id, Essay.user_id == current_user.id)).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")

    try:
        runtime = get_or_create_ai_runtime_config(db)
        provider = (runtime.provider or "mock").strip().lower()

        if not runtime.ai_enabled:
            raise HTTPException(status_code=503, detail="AI is temporarily disabled by admin.")

        if provider == "mock":
            review_content, score = generate_mock_review(essay)
        else:
            prompt = _build_review_prompt(essay, review_request)
            review_content = _run_provider_text(
                provider,
                prompt,
                max_tokens=2000,
                openai_model=runtime.openai_model,
                gemini_model=runtime.gemini_model,
            )
            score = extract_score(review_content)

        essay.ai_review = review_content
        essay.review_score = score
        db.commit()

        return ReviewResponse(essay_id=essay_id, review_content=review_content, score=score)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(exc)}") from exc


@router.post("/assist/outline", response_model=EssayAssistResponse)
async def assist_essay_outline(
    payload: EssayAssistRequest,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    caution = (
        "Use this outline as a drafting scaffold. Keep final wording, stories, and voice authentically your own."
    )

    try:
        runtime = get_or_create_ai_runtime_config(db)
        provider = (runtime.provider or "mock").strip().lower()

        if not runtime.ai_enabled:
            raise HTTPException(status_code=503, detail="AI is temporarily disabled by admin.")

        if provider == "mock":
            outline_markdown, next_steps = generate_mock_outline(
                school_name=payload.school_name,
                program_type=payload.program_type,
                essay_prompt=payload.essay_prompt,
                skeleton_points=payload.skeleton_points,
                target_word_count=payload.target_word_count,
            )
            return {
                "outline_markdown": outline_markdown,
                "next_steps": next_steps,
                "mode": "mock",
                "caution": caution,
            }

        outline_markdown = _run_provider_text(
            provider,
            _build_outline_prompt(payload),
            max_tokens=1400,
            openai_model=runtime.openai_model,
            gemini_model=runtime.gemini_model,
        )
        next_steps = [
            "Draft each section in your own voice before running final review.",
            "Add at least two concrete outcomes with measurable impact.",
            "Check that every paragraph answers the essay prompt directly.",
        ]
        return {
            "outline_markdown": outline_markdown,
            "next_steps": next_steps,
            "mode": provider,
            "caution": caution,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Outline assist failed: {str(exc)}") from exc


@router.delete("/{essay_id}")
async def delete_essay(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(and_(Essay.id == essay_id, Essay.user_id == current_user.id)).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")

    db.delete(essay)
    db.commit()
    return {"message": "Essay deleted successfully"}
