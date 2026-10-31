"""Carry a signed-out "try one question" into the visitor's first interview after they sign up.

The browser keeps a signed token for 24 hours. The server stores nothing until the signed-in user chooses to
continue; the signature only proves that this server wrote the follow-up. Seeding makes no AI call.
"""
import base64
import hashlib
import hmac
import json
import re
import time
from typing import get_args

from config import get_settings
from interview_schemas import NextQuestion

QUESTION = {"id": "motivation", "text": "Walk me through yourself, and why an MBA is the next step you want to take."}
MIN_CHARS, MAX_CHARS, MAX_FOLLOW_UP = 40, 1200, 300
LINK_OR_EMAIL = re.compile(r"https?://|www\.|\S+@\S+\.\S+", re.I)
VERSION, TTL_SECONDS = 1, 24 * 3600
TOPICS = get_args(NextQuestion.model_fields["topic"].annotation)


class HandoffInvalid(Exception):
    """Expired, tampered, malformed, wrong version, or not something the public route could have produced."""


def usable_follow_up(text) -> bool:
    return isinstance(text, str) and 0 < len(text) <= MAX_FOLLOW_UP and not LINK_OR_EMAIL.search(text)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _mac(body: str) -> str:
    # The prefix keeps this signature apart from the sign-in tokens, which share the secret.
    key = get_settings().SECRET_KEY.encode()
    return _b64(hmac.new(key, b"try-handoff." + body.encode(), hashlib.sha256).digest())


def sign(payload: dict) -> str:
    claims = {**payload, "v": VERSION, "exp": int(time.time()) + TTL_SECONDS}
    body = _b64(json.dumps(claims, separators=(",", ":"), ensure_ascii=False).encode())
    return f"{body}.{_mac(body)}"


def verify(token: str) -> dict:
    try:
        body, mac = token.split(".")
        if not hmac.compare_digest(mac, _mac(body)):
            raise ValueError("bad signature")
        claims = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if claims["v"] != VERSION or claims["exp"] <= time.time():
            raise ValueError("wrong version or expired")
    except Exception:  # one outcome for every way a token can be wrong
        raise HandoffInvalid from None
    return claims


def seed_turns(token: str, request_id: str) -> list[dict]:
    """q1 (the server's own opener), a1 (the visitor's answer) and q2 (the follow-up), re-checked from the token."""
    claims = verify(token)
    answer, follow_up, quote, fallback = (claims.get(key) for key in ("answer", "follow_up", "quote", "fallback"))
    if (claims.get("question_id") != QUESTION["id"] or not isinstance(answer, str) or not MIN_CHARS <= len(answer) <= MAX_CHARS
            or not usable_follow_up(follow_up) or not isinstance(fallback, bool) or claims.get("topic") not in TOPICS
            or not (quote is None or isinstance(quote, str))):
        raise HandoffInvalid
    return [
        {"id": "q1", "role": "assistant", "text": QUESTION["text"]},
        {"id": "a1", "role": "user", "text": answer, "request_id": request_id},
        # Same shape the answers route stores for a model question; a fixed question never anchors to the answer.
        {"id": "q2", "role": "assistant", "text": follow_up, "kind": "new_topic" if fallback else "follow_up",
         "topic": claims["topic"], "conflict": "", "anchor_turn_id": "" if fallback else "a1",
         "anchor_quote": quote if quote and not fallback and quote in answer else "", **({"fallback": True} if fallback else {})},
    ]
