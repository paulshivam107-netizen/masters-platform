"""One real follow-up for a signed-out visitor.

Stateless: nothing about the visitor, answer or follow-up is stored. The only records are cost-ledger
rows (no user), rate-limit buckets (hashed IP, purged within days) and an anonymous admin event.
Every check that costs nothing runs before the first reservation; spend comes from the shared
``anon`` pool inside the global cap (see ``services/ai_costs.py``). The response carries a signed token
(``services/try_handoff.py``) the browser may keep for 24 hours to continue the try after sign-up.
"""
import json
from types import SimpleNamespace
from typing import Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from models import AdminEvent, AiRuntimeConfig
from services import ai_costs
from services import interview_provider as provider
from services.interview_plan import make_plan
from services.interviews import estimate, fallback_question, is_stop_request, non_answer_reason
from services.rate_limit import enforce_rate_limit
from services.try_handoff import MAX_CHARS, MIN_CHARS, QUESTION, sign, usable_follow_up

router = APIRouter(prefix="/public/try", tags=["public-try"])

BURST_SECONDS, DAILY_TRIES = 20, 3
UNAVAILABLE = "This try is not available right now. Sign up to practise a full interview."
NOT_ANSWERED = "That doesn't seem to answer the question. Write a few sentences about your own background and reasons."
TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class TryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    question_id: Literal["motivation"]
    # The real bounds are checked in the handler so every rejection is a plain-text detail.
    answer: str = Field(min_length=1, max_length=5000)
    request_id: UUID
    turnstile_token: str = Field(default="", max_length=2048)
    website: str = Field(default="", max_length=200)  # honeypot: real visitors never fill it
    source: str = Field(default="practice", pattern=r"^(practice|school:[a-z0-9-]{1,60})$")


def turnstile_configured(settings):
    # Production fails closed without both keys; local development may run without Turnstile.
    keys = bool(settings.TURNSTILE_SITE_KEY and settings.TURNSTILE_SECRET_KEY)
    return keys or not settings.is_production_like_env


def available(db) -> bool:
    settings = get_settings()
    runtime = db.query(AiRuntimeConfig).first()
    return bool(settings.ANON_TRY_ENABLED and turnstile_configured(settings) and provider.live_available()
                and (runtime is None or runtime.ai_enabled) and ai_costs.caps()["anon_daily_cap_paise"] > 0)


def limited(request, db, action, limit, window, message):
    try:
        enforce_rate_limit(request, action=action, limit=limit, window_seconds=window, db=db)
    except HTTPException as exc:
        raise HTTPException(429, message, headers=exc.headers) from None


def verify_turnstile(token: str):
    secret = get_settings().TURNSTILE_SECRET_KEY
    if not secret:
        return  # only reachable outside production (see turnstile_configured)
    if not token:
        raise HTTPException(400, "Please complete the check and try again.")
    try:
        with httpx.Client(timeout=httpx.Timeout(5, connect=3), trust_env=False) as client:
            response = client.post(TURNSTILE_URL, data={"secret": secret, "response": token})
        passed = response.status_code == 200 and response.json().get("success") is True
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "The check could not run. Please try again in a moment.") from None
    if not passed:
        raise HTTPException(400, "The check did not pass. Please try again.")


def ask(db, reference_id, context, transcript, answer):
    """One billed model call; None when the model answered (and billed) but the output was unusable."""
    shape = SimpleNamespace(context_json=json.dumps(context), transcript_json=json.dumps(transcript))
    _, model, tokens_in, tokens_out = estimate(shape, "answer", {"text": answer})
    entry = ai_costs.reserve(db, user_id=None, operation="anon_follow_up", model=model, input_units=tokens_in,
                             output_units=tokens_out, reference_id=reference_id)
    db.commit()
    try:
        question, usage = provider.next_question(context, transcript)
    except provider.ProviderFailure as exc:
        ai_costs.finish(db, entry.id, exc.billing, exc.usage, exc.code)
        db.commit()
        if exc.billing == "charged":
            return None
        raise HTTPException(exc.status, str(exc)) from None
    except Exception:
        ai_costs.finish(db, entry.id, "unknown", None, "unexpected_error")
        db.commit()
        raise HTTPException(503, UNAVAILABLE) from None
    ai_costs.finish(db, entry.id, "charged", usage)
    db.commit()
    return question


@router.get("/status")
def status(request: Request, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    enforce_rate_limit(request, action="try-status", limit=60, window_seconds=60, memory=True)
    live = available(db)
    return {"available": live, "turnstile_site_key": (get_settings().TURNSTILE_SITE_KEY or None) if live else None,
            "question": QUESTION if live else None, "min_chars": MIN_CHARS, "max_chars": MAX_CHARS}


@router.post("/follow-up")
def follow_up(payload: TryRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if payload.website:  # honeypot: treated like any other rejection, nothing is reserved
        raise HTTPException(422, "Something went wrong. Reload the page and try again.")
    if not available(db):
        raise HTTPException(503, UNAVAILABLE)
    answer = payload.answer
    if len(answer) < MIN_CHARS:
        raise HTTPException(422, f"Write at least {MIN_CHARS} characters so the follow-up has something to quote.")
    if len(answer) > MAX_CHARS:
        raise HTTPException(422, f"Keep your answer under {MAX_CHARS} characters.")
    if is_stop_request(answer) or non_answer_reason(answer):
        raise HTTPException(422, NOT_ANSWERED)
    limited(request, db, "try-burst", 1, BURST_SECONDS, "Please wait a few seconds before trying again.")
    verify_turnstile(payload.turnstile_token)
    limited(request, db, "try-day", DAILY_TRIES, 86400, "You've used today's free tries. Sign up to keep practising.")

    context = {"route": "auto", "kind": "taster", "background": "", "goal": "", "school": "General MBA practice",
               "programme": "MBA", "practice_focus": "motivation", "question_limit": 3,
               "interview_plan": make_plan("auto", "motivation")}
    transcript = [{"id": "q1", "role": "assistant", "text": QUESTION["text"]},
                  {"id": "a1", "role": "user", "text": answer, "request_id": str(payload.request_id)}]
    reference = str(payload.request_id)
    result = ask(db, reference, context, transcript, answer)
    if result is None:  # ungrounded or incomplete output: one more try, then a fixed question
        try:
            result = ask(db, reference, context, transcript, answer)
        except ai_costs.Denied:
            result = None
    question = result
    if question is not None and question.get("kind") in ("off_topic", "end_requested"):
        raise HTTPException(422, NOT_ANSWERED)
    if question is None or not usable_follow_up(question["question"]):
        question = fallback_question(context, transcript)
    quote = question.get("anchor_quote") or None
    quote = quote if quote and quote in answer and not question.get("fallback") else None
    db.add(AdminEvent(user_id=None, event_name="anon_try_answered", payload_json=json.dumps(
        {"source": payload.source, "grounded": bool(quote), "fallback": bool(question.get("fallback"))})))
    db.commit()
    fallback = bool(question.get("fallback"))
    handoff = sign({"question_id": QUESTION["id"], "answer": answer, "follow_up": question["question"], "quote": quote,
                    "fallback": fallback, "topic": question["topic"]})
    return {"follow_up": question["question"], "quote": quote, "fallback": fallback, "handoff": handoff}
