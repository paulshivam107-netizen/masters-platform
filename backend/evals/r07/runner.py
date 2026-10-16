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

from evals.r07 import checks
from evals.r07 import profiles as profile_store
from evals.r07.fake_openai import FakeOpenAI
from services import ai_costs
from services import interview_provider as provider
from services.interview_plan import PLAN_VERSION, make_plan
from services.interviews import (FALLBACK_AFTER_ATTEMPTS, MAX_OUTPUT_TOKENS, TEXT_OVERHEAD_CHARS, closing_turn,
                                 fallback_question, is_stop_request)
from services.resume_questions import generate_questions

RESULTS_DIR = Path(__file__).with_name("results")
DEFAULT_MODEL = "gpt-4.1-mini"
# Same as routers.interview_routes.create_session when no saved question set is used.
DEFAULT_OPENINGS = {
    "cat": "Tell me about yourself and why a two-year MBA is the next step you want to take.",
    "experienced": "Walk me through your experience and why a management programme makes sense for you now.",
}


# Upper bounds on model-written text that later calls carry, used by the offline estimate.
MAX_PROFILE_CHARS = 12 * 320
MAX_FOLLOW_UP_CHARS = 2 * 420
MAX_QUESTION_TURN_CHARS = 1000


class SpendNotConfirmed(Exception):
    """A live run needs explicit confirmation that it will spend money."""


class BudgetExceeded(Exception):
    pass


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

    def __init__(self, out_dir, provider_name, model, max_attempts=3, max_spend_paise=10_000):
        self.out_dir = out_dir
        self.provider_name = provider_name
        self.model = model
        self.price = price_for(model)
        self.max_attempts = max_attempts
        self.max_spend_paise = max_spend_paise
        # Conservative: unknown outcomes count at their reservation.
        self.spent_paise = 0
        # The latest parsed model output, so a rejected one can be inspected (results are gitignored).
        self.last_output = None
        (out_dir / "sessions").mkdir(parents=True)
        self._calls = (out_dir / "calls.jsonl").open("a", encoding="utf-8")

    def close(self):
        self._calls.close()

    def call(self, profile_id, step, operation, reserve_in, reserve_out, action, fallback=None):
        """Run one provider step with up to max_attempts tries (a user pressing retry); returns
        its result or None. Every attempt is recorded. With ``fallback``, the app's no-AI
        question replaces the model from attempt FALLBACK_AFTER_ATTEMPTS, as the answer route does."""
        reserved = self.price.cost(reserve_in, reserve_out)
        for attempt in range(1, self.max_attempts + 1):
            if fallback and attempt >= FALLBACK_AFTER_ATTEMPTS:
                self._record({"profile_id": profile_id, "step": step, "operation": operation, "attempt": attempt,
                              "ok": True, "fallback": True, "failure_code": None, "failure_message": None,
                              "rejected_output": None, "billing": "none", "latency_ms": 0, "model": None,
                              "input_tokens": None, "output_tokens": None, "reserved_input_tokens": reserve_in,
                              "reserved_output_tokens": reserve_out, "reserved_paise": reserved, "cost_paise": 0})
                return fallback()
            if self.spent_paise + reserved > self.max_spend_paise:
                raise BudgetExceeded(f"next call could exceed {self.max_spend_paise} paise")
            started = time.perf_counter()
            result, usage, failure, billing, message = None, {}, None, "charged", None
            self.last_output = None
            try:
                result, usage = action()
            except provider.ProviderFailure as exc:
                # The message is the user-facing text; it identifies which check rejected the output.
                failure, billing, usage, message = exc.code, exc.billing, exc.usage or {}, str(exc)
            latency_ms = round((time.perf_counter() - started) * 1000)
            input_tokens, output_tokens = usage.get("input_tokens"), usage.get("output_tokens")
            if billing == "none":
                cost = 0
            elif isinstance(input_tokens, int) and isinstance(output_tokens, int):
                cost = self.price.cost(input_tokens, output_tokens)
            else:
                # Same rule as the app's ledger: charged without usage, or unknown -> the reservation.
                cost = reserved
            self.spent_paise += cost
            self._record({
                "profile_id": profile_id, "step": step, "operation": operation, "attempt": attempt,
                "ok": failure is None, "fallback": False, "failure_code": failure, "failure_message": message,
                "rejected_output": self.last_output if failure else None, "billing": billing, "latency_ms": latency_ms,
                "model": self.model, "input_tokens": input_tokens, "output_tokens": output_tokens,
                "reserved_input_tokens": reserve_in, "reserved_output_tokens": reserve_out,
                "reserved_paise": reserved, "cost_paise": cost,
            })
            if failure is None:
                return result
        return None

    def _record(self, row):
        self._calls.write(json.dumps(row) + "\n")
        self._calls.flush()


def reserve_resume(profile, resume_context):
    return ai_costs.text_tokens_upper_bound(len(profile["resume_text"]) + len(json.dumps(resume_context)) + 6000), 3800


def reserve_answer(context_chars, transcript_chars, answer_chars):
    # services.interviews.estimate: context_json + transcript_json + the new answer + overhead.
    chars = context_chars + transcript_chars + answer_chars + TEXT_OVERHEAD_CHARS
    return ai_costs.text_tokens_upper_bound(chars), MAX_OUTPUT_TOKENS["answer"]


def reserve_feedback(context_chars, transcript_chars):
    return ai_costs.text_tokens_upper_bound(context_chars + transcript_chars + TEXT_OVERHEAD_CHARS), MAX_OUTPUT_TOKENS["feedback"]


def resume_context_for(profile):
    return {"route": profile["route"], "school": "General MBA practice", "programme": profile.get("programme_name") or "MBA"}


def base_context(profile):
    focus = profile.get("practice_focus", "balanced")
    return {"route": profile["route"], "background": profile.get("background", ""), "goal": profile.get("goal", ""),
            "school": "General MBA practice", "programme": profile.get("programme_name") or "MBA",
            "practice_focus": focus, "question_limit": len(profile["answers"]),
            "interview_plan": make_plan(profile["route"], focus)}


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
    resume_context = resume_context_for(profile)
    graph = run.call(pid, "resume", "resume_questions", *reserve_resume(profile, resume_context),
                     lambda: generate_questions(profile["resume_text"], resume_context))
    answers = profile["answers"]
    context = base_context(profile)
    opening = DEFAULT_OPENINGS[route]
    if graph:
        root = graph["roots"][0]
        opening = next(node["text"] for node in graph["nodes"] if node["id"] == root)
        context.update(profile_set_id=f"eval-{pid}", resume_profile=graph["profile"], profile_version=graph["version"],
                       question_set_id=f"eval-{pid}", question_bank_version=graph["version"],
                       question_id=root, resume_follow_ups=_follow_ups(graph, root))
    transcript = [{"id": "q1", "role": "assistant", "text": opening}]
    stopped_at = None
    ended_by_request = False
    for index, answer in enumerate(answers, 1):
        before = json.dumps(transcript)
        transcript.append({"id": f"a{index}", "role": "user", "text": answer["text"],
                           "request_id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"r07/{pid}/{index}"))})
        if index == len(answers):
            break
        if is_stop_request(answer["text"]):
            # As the answer route does: no model call, no cost.
            question = closing_turn(context, transcript)
        else:
            question = run.call(pid, f"a{index}", "interview_answer",
                                *reserve_answer(len(json.dumps(context)), len(before), len(answer["text"])),
                                lambda: provider.next_question(context, transcript),
                                fallback=lambda: fallback_question(context, transcript))
        if question is None:
            stopped_at = f"a{index}"
            break
        transcript.append({"id": f"q{index + 1}", "role": "assistant", "text": question["question"],
                           **{key: value for key, value in question.items() if key != "question"}})
        if question["kind"] == "end_requested":
            ended_by_request = True
            break
    feedback = None
    if stopped_at is None:
        feedback = run.call(pid, "feedback", "interview_feedback",
                            *reserve_feedback(len(json.dumps(context)), len(json.dumps(transcript))),
                            lambda: provider.feedback(context, transcript))
    session = {"profile_id": pid, "split": profile["split"], "route": route, "persona": profile.get("persona", {}),
               "answer_tags": [a["tag"] for a in answers], "resume_text": profile["resume_text"], "context": context, "question_graph": graph,
               "transcript": transcript, "feedback": feedback, "stopped_at": stopped_at,
               "ended_by_request": ended_by_request}
    (run.out_dir / "sessions" / f"{pid}.json").write_text(json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8")
    return session


def estimate(profiles, *, model=DEFAULT_MODEL, max_attempts=3):
    """Worst-case spend from the app's own reservation formulas, with no provider calls."""
    price, calls, worst = price_for(model), 0, 0

    def add(units):
        nonlocal calls, worst
        calls += 1
        worst += price.cost(*units)

    for profile in profiles:
        add(reserve_resume(profile, resume_context_for(profile)))
        context_chars = len(json.dumps(base_context(profile))) + MAX_PROFILE_CHARS + MAX_FOLLOW_UP_CHARS + 400
        transcript_chars = MAX_QUESTION_TURN_CHARS
        for index, answer in enumerate(profile["answers"], 1):
            if index == len(profile["answers"]):
                transcript_chars += len(json.dumps(answer["text"])) + 120
                break
            add(reserve_answer(context_chars, transcript_chars, len(answer["text"])))
            transcript_chars += len(json.dumps(answer["text"])) + 120 + MAX_QUESTION_TURN_CHARS
        add(reserve_feedback(context_chars, transcript_chars))
    return {"model": model, "price_source": price.source, "calls": calls,
            "worst_case_paise": worst, "worst_case_with_retries_paise": worst * max_attempts}


@contextlib.contextmanager
def _capture_outputs(run):
    """Wrap provider._structured (used by next_question, feedback and generate_questions)."""
    original = provider._structured

    def structured(*args, **kwargs):
        result, usage = original(*args, **kwargs)
        run.last_output = result
        return result, usage

    provider._structured = structured
    try:
        yield
    finally:
        provider._structured = original


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


def run_suite(profiles, *, provider="fake", model=DEFAULT_MODEL, out_root=RESULTS_DIR, max_attempts=3,
              max_spend_paise=10_000, confirm_spend=False, fake_fault_every=0):
    if provider not in ("fake", "openai"):
        raise ValueError("provider must be fake or openai")
    if provider == "openai":
        if not confirm_spend:
            raise SpendNotConfirmed("A live run spends money: pass --confirm-spend after checking --estimate.")
        if not live_key_configured():
            raise SpendNotConfirmed("OPENAI_API_KEY is not configured in backend/.env.")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    out_dir = Path(out_root) / f"{stamp}-{provider}-{model}"
    run = Run(out_dir, provider, model, max_attempts, max_spend_paise)
    meta = {"provider": provider, "model": model, "prompt_version": provider_prompt_version(),
            "plan_version": PLAN_VERSION, "eval_version": profile_store.EVAL_VERSION,
            "price": {"source": run.price.source, "basis": ai_costs.PRICE_BASIS,
                      "input_paise_per_million": run.price.input_paise_per_million,
                      "output_paise_per_million": run.price.output_paise_per_million},
            "max_attempts": max_attempts, "max_spend_paise": max_spend_paise, "fake_fault_every": fake_fault_every,
            "profiles": [p["id"] for p in profiles], "git": git_state(), "stopped": None,
            "started_at": datetime.now(timezone.utc).isoformat()}
    fake = FakeOpenAI(fault_every=fake_fault_every)
    try:
        with _model(model), _capture_outputs(run), (fake.installed() if provider == "fake" else contextlib.nullcontext()):
            for profile in profiles:
                run_profile(run, profile)
    except BudgetExceeded:
        meta["stopped"] = "budget"
    finally:
        run.close()
        checks.write_review_files(out_dir)
        meta["spent_paise_worst_case"] = run.spent_paise
        meta["finished_at"] = datetime.now(timezone.utc).isoformat()
        (out_dir / "run.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return out_dir


def live_key_configured():
    return provider.live_available()


def provider_prompt_version():
    return provider.PROMPT_VERSION
