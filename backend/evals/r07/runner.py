"""R07 runner: plays synthetic profiles through the real interview provider functions.

The app database, auth and quotas are bypassed on purpose; contexts are built exactly as
``routers.interview_routes.create_session`` and ``routers.resume_routes`` build them, and
reservations mirror ``services.interviews.estimate`` so measured usage can be compared to them.
"""
import contextlib
import json
import os
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from evals.r07 import profiles as profile_store
from evals.r07.fake_openai import FakeOpenAI
from services import ai_costs
from services import interview_provider as provider
from services.interview_plan import PLAN_VERSION, make_plan
from services.interviews import MAX_OUTPUT_TOKENS, TEXT_OVERHEAD_CHARS
from services.resume_questions import generate_questions

RESULTS_DIR = Path(__file__).with_name("results")
DEFAULT_MODEL = "gpt-4.1-mini"
# Same as routers.interview_routes.create_session when no saved question set is used.
DEFAULT_OPENINGS = {
    "cat": "Tell me about yourself and why a two-year MBA is the next step you want to take.",
    "experienced": "Walk me through your experience and why a management programme makes sense for you now.",
}


def price_for(model):
    if model in ai_costs.BUILTIN_PRICES:
        return ai_costs.Price(model, *ai_costs.BUILTIN_PRICES[model], "builtin")
    return ai_costs.Price(model, *ai_costs.FALLBACK_PRICE, "fallback")


def git_state():
    def git(*args):
        try:
            return subprocess.run(["git", *args], capture_output=True, text=True, timeout=5,
                                  cwd=Path(__file__).parent).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            return ""
    return {"commit": git("rev-parse", "HEAD"), "dirty": bool(git("status", "--porcelain"))}


class Run:
    """One evaluation run: owns the output directory and the per-call ledger."""

    def __init__(self, out_dir, provider_name, model):
        self.out_dir = out_dir
        self.provider_name = provider_name
        self.model = model
        self.price = price_for(model)
        (out_dir / "sessions").mkdir(parents=True)
        self._calls = (out_dir / "calls.jsonl").open("a", encoding="utf-8")

    def close(self):
        self._calls.close()

    def call(self, profile_id, operation, reserve_in, reserve_out, action):
        """Run one provider step; returns its result or None. Every attempt is recorded."""
        reserved = self.price.cost(reserve_in, reserve_out)
        started = time.perf_counter()
        result, usage, failure, billing = None, {}, None, "charged"
        try:
            result, usage = action()
        except provider.ProviderFailure as exc:
            failure, billing, usage = exc.code, exc.billing, exc.usage or {}
        latency_ms = round((time.perf_counter() - started) * 1000)
        input_tokens, output_tokens = usage.get("input_tokens"), usage.get("output_tokens")
        if isinstance(input_tokens, int) and isinstance(output_tokens, int):
            cost = self.price.cost(input_tokens, output_tokens)
        else:
            # Same rule as the app's ledger: charged without usage or unknown -> the reservation.
            cost = 0 if billing == "none" else reserved
        self._record({
            "profile_id": profile_id, "operation": operation, "attempt": 1, "ok": failure is None,
            "failure_code": failure, "billing": billing, "latency_ms": latency_ms, "model": self.model,
            "input_tokens": input_tokens, "output_tokens": output_tokens,
            "reserved_input_tokens": reserve_in, "reserved_output_tokens": reserve_out,
            "reserved_paise": reserved, "cost_paise": cost,
        })
        return result

    def _record(self, row):
        self._calls.write(json.dumps(row) + "\n")
        self._calls.flush()


def _follow_ups(graph, root):
    # Breadth-first, as interview_routes.create_session collects a saved branch.
    follow_ups, pending = [], [root]
    while pending:
        current = pending.pop(0)
        children = [edge["child"] for edge in graph["edges"] if edge["parent"] == current]
        pending.extend(children)
        follow_ups.extend(node["text"] for node in graph["nodes"] if node["id"] in children)
    return follow_ups


def run_profile(run, profile):
    pid, route = profile["id"], profile["route"]
    programme = profile.get("programme_name") or "MBA"
    resume_context = {"route": route, "school": "General MBA practice", "programme": programme}
    graph = run.call(
        pid, "resume_questions",
        ai_costs.text_tokens_upper_bound(len(profile["resume_text"]) + len(json.dumps(resume_context)) + 6000), 3800,
        lambda: generate_questions(profile["resume_text"], resume_context),
    )
    focus = profile.get("practice_focus", "balanced")
    answers = profile["answers"]
    context = {"route": route, "background": profile.get("background", ""), "goal": profile.get("goal", ""),
               "school": "General MBA practice", "programme": programme, "practice_focus": focus,
               "question_limit": len(answers), "interview_plan": make_plan(route, focus)}
    opening = DEFAULT_OPENINGS[route]
    if graph:
        root = graph["roots"][0]
        opening = next(node["text"] for node in graph["nodes"] if node["id"] == root)
        context.update(profile_set_id=f"eval-{pid}", resume_profile=graph["profile"], profile_version=graph["version"],
                       question_set_id=f"eval-{pid}", question_bank_version=graph["version"],
                       question_id=root, resume_follow_ups=_follow_ups(graph, root))
    transcript = [{"id": "q1", "role": "assistant", "text": opening}]
    stopped_at = None
    for index, answer in enumerate(answers, 1):
        before = json.dumps(transcript)
        transcript.append({"id": f"a{index}", "role": "user", "text": answer["text"],
                           "request_id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"r07/{pid}/{index}"))})
        if index == len(answers):
            break
        chars = len(json.dumps(context)) + len(before) + len(answer["text"]) + TEXT_OVERHEAD_CHARS
        question = run.call(pid, "interview_answer", ai_costs.text_tokens_upper_bound(chars), MAX_OUTPUT_TOKENS["answer"],
                            lambda: provider.next_question(context, transcript))
        if question is None:
            stopped_at = f"a{index}"
            break
        transcript.append({"id": f"q{index + 1}", "role": "assistant", "text": question["question"],
                           **{key: value for key, value in question.items() if key != "question"}})
    feedback = None
    if stopped_at is None:
        chars = len(json.dumps(context)) + len(json.dumps(transcript)) + TEXT_OVERHEAD_CHARS
        feedback = run.call(pid, "interview_feedback", ai_costs.text_tokens_upper_bound(chars), MAX_OUTPUT_TOKENS["feedback"],
                            lambda: provider.feedback(context, transcript))
    session = {"profile_id": pid, "split": profile["split"], "route": route, "persona": profile.get("persona", {}),
               "answer_tags": [a["tag"] for a in answers], "context": context, "question_graph": graph,
               "transcript": transcript, "feedback": feedback, "stopped_at": stopped_at}
    (run.out_dir / "sessions" / f"{pid}.json").write_text(json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8")
    return session


@contextlib.contextmanager
def _model(model):
    previous = os.environ.get("INTERVIEW_TEXT_MODEL")
    os.environ["INTERVIEW_TEXT_MODEL"] = model
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop("INTERVIEW_TEXT_MODEL", None)
        else:
            os.environ["INTERVIEW_TEXT_MODEL"] = previous


def run_suite(profiles, *, provider="fake", model=DEFAULT_MODEL, out_root=RESULTS_DIR):
    if provider not in ("fake", "openai"):
        raise ValueError("provider must be fake or openai")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    out_dir = Path(out_root) / f"{stamp}-{provider}-{model}"
    run = Run(out_dir, provider, model)
    meta = {"provider": provider, "model": model, "prompt_version": provider_prompt_version(),
            "plan_version": PLAN_VERSION, "eval_version": profile_store.EVAL_VERSION,
            "price": {"source": run.price.source, "basis": ai_costs.PRICE_BASIS,
                      "input_paise_per_million": run.price.input_paise_per_million,
                      "output_paise_per_million": run.price.output_paise_per_million},
            "profiles": [p["id"] for p in profiles], "git": git_state(),
            "started_at": datetime.now(timezone.utc).isoformat()}
    fake = FakeOpenAI()
    try:
        with _model(model), (fake.installed() if provider == "fake" else contextlib.nullcontext()):
            for profile in profiles:
                run_profile(run, profile)
    finally:
        run.close()
        meta["finished_at"] = datetime.now(timezone.utc).isoformat()
        (out_dir / "run.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return out_dir


def provider_prompt_version():
    return provider.PROMPT_VERSION
