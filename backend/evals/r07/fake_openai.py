"""A deterministic stand-in for the OpenAI Responses API at the HTTP layer.

It is patched in under ``interview_provider``'s httpx client, so the real request building,
status mapping, JSON-schema parsing and grounding checks all run. It makes no network calls
and measures nothing about model quality: it only proves the harness and failure paths work.
"""
import contextlib
import json
import re
from unittest.mock import patch

import httpx

FAULTS = ("timeout", "rate_limit", "malformed", "incomplete", "bad_anchor")
# Only explicit requests to end, so a "specific" answer mentioning a stop doesn't end the fake run.
STOP_REQUEST = re.compile(r"\b(stop|end) (here|now|the (practice )?session|this session)\b|\bend the practice\b")
TOPICS = ("education", "experience", "projects", "behaviour", "motivation", "contribution", "interests")


class FakeOpenAI:
    def __init__(self, fault_every=0):
        self.fault_every = fault_every
        self.calls = 0

    def _fault(self):
        if not self.fault_every or self.calls % self.fault_every:
            return None
        return FAULTS[(self.calls // self.fault_every - 1) % len(FAULTS)]

    def handle(self, request):
        self.calls += 1
        fault = self._fault()
        if fault == "timeout":
            raise httpx.ReadTimeout("fake timeout", request=request)
        if fault == "rate_limit":
            return httpx.Response(429, json={"error": {"message": "fake rate limit"}})
        body = json.loads(request.content)
        schema = body["text"]["format"]["name"]
        payload = json.loads(body["input"])
        output = {"NextQuestion": _next_question, "InterviewFeedback": _feedback,
                  "ResumeQuestionDraft": _resume_draft}[schema](payload["context"], payload["transcript"])
        if fault == "bad_anchor" and schema == "NextQuestion" and output["kind"] in ("follow_up", "clarification"):
            output["anchor_quote"] = "text that is not in the answer"
        text = "not json {" if fault == "malformed" else json.dumps(output)
        return httpx.Response(200, json={
            "status": "incomplete" if fault == "incomplete" else "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": text}]}],
            "usage": {"input_tokens": len(request.content) // 4, "output_tokens": len(text) // 4,
                      "total_tokens": len(request.content) // 4 + len(text) // 4},
        })

    @contextlib.contextmanager
    def installed(self):
        real_client = httpx.Client
        transport = httpx.MockTransport(self.handle)

        def client(**kwargs):
            return real_client(transport=transport, timeout=kwargs.get("timeout"))

        with patch("services.interview_provider.httpx.Client", client), \
                patch("services.interview_provider.api_key", lambda: "fake-key"), \
                patch("services.interview_provider.enabled", lambda: True):
            yield self


def _words(text, count=6):
    return " ".join(text.split()[:count])


def _next_question(context, transcript):
    asked = sum(t["role"] == "assistant" for t in transcript)
    # No digits: the eval flags numbers that appear in neither the resume nor the answers.
    last = next(t for t in reversed(transcript) if t["role"] == "user")
    topic = TOPICS[asked % len(TOPICS)]
    quote = _words(last["text"])
    lowered = last["text"].lower()
    if STOP_REQUEST.search(lowered):
        return {"question": "Understood, we will stop here. Thank you for practising today.",
                "kind": "end_requested", "topic": TOPICS[0], "anchor_turn_id": "", "anchor_quote": ""}
    if context["next_step"]["move_on"] or not quote or quote not in last["text"]:
        return {"question": f"Turning to {topic}, what is one example you would like to discuss?",
                "kind": "new_topic", "topic": topic, "anchor_turn_id": "", "anchor_quote": ""}
    return {"question": f"You said \"{quote}\". What did you personally do there, and why ({topic})?",
            "kind": "follow_up", "topic": topic, "anchor_turn_id": last["id"], "anchor_quote": quote}


def _feedback(context, transcript):
    answers = [t for t in transcript if t["role"] == "user"]
    point = lambda turn: {"turn_id": turn["id"], "quote": _words(turn["text"], 5) or turn["text"][:5]}
    return {
        "summary": "Fake debrief for harness testing only.",
        "strengths": [{**point(answers[0]), "observation": "Fake observation."}],
        "improvements": [{**point(answers[-1]), "observation": "Fake observation.", "suggestion": "Fake suggestion."}],
        "next_exercise": "Fake exercise.",
    }


def _resume_draft(context, transcript):
    lines = [line.strip()[:240] for line in context["reviewed_resume"].splitlines() if len(line.strip()) >= 12]
    lines = (lines * 9)[:9]
    question = lambda i, depth: {"question": f"Tell me more about this line, {'abc'[i]} {'xyz'[depth - 1]}.",
                                 "evidence_quote": lines[i * 3 + depth - 1]}
    return {
        "profile": [{"category": "experience", "evidence_quote": line} for line in dict.fromkeys(lines)][:12],
        "branches": [{"opening": question(i, 1), "follow_up": question(i, 2), "deeper_follow_up": question(i, 3)}
                     for i in range(3)],
    }
