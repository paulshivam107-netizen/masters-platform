"""R07 report: automatic gates, reliability, cost and latency, plus human gates from review CSVs.

Run it again after filling the reviewer columns: ``python -m evals.r07 report <run_dir>``.
These are internal release gates on a curated synthetic set, not admissions-accuracy rates.
"""
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

from evals.r07 import checks

GROUNDED_TARGET = 0.9
OFF_TOPIC_CATCH_TARGET = 0.6


def _percentile(values, pct):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, -(-len(ordered) * pct // 100) - 1)]


def _stats(values):
    if not values:
        return {"n": 0, "mean": None, "p50": None, "p95": None, "max": None}
    return {"n": len(values), "mean": round(sum(values) / len(values), 1), "p50": _percentile(values, 50),
            "p95": _percentile(values, 95), "max": max(values)}


def _yes(value):
    value = (value or "").strip().lower()
    return True if value.startswith("y") else False if value.startswith("n") else None


def _read_csv(path):
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _gate(passed, reviewed, eligible, ok):
    status = "pending" if reviewed < eligible or eligible == 0 else ("pass" if ok else "fail")
    return {"passed": passed, "reviewed": reviewed, "eligible": eligible, "status": status}


def human_gates(run_dir):
    questions = _read_csv(Path(run_dir, "review_questions.csv"))
    feedback = _read_csv(Path(run_dir, "review_feedback.csv"))
    probes = [r for r in questions if r["eligible_probe"] == "True"]
    relevant = [_yes(r["reviewer_relevant"]) for r in probes]
    rated = [v for v in relevant if v is not None]
    grounded = _gate(sum(rated), len(rated), len(probes), bool(rated) and sum(rated) / len(rated) >= GROUNDED_TARGET)
    grounded["rate"] = round(sum(rated) / len(rated), 3) if rated else None

    def no_failures(rows, column, bad):
        values = [_yes(r[column]) for r in rows]
        rated_values = [v for v in values if v is not None]
        failures = sum(v is bad for v in rated_values)
        return {**_gate(len(rated_values) - failures, len(rated_values), len(rows), failures == 0), "failures": failures}

    points = [r for r in feedback if r["kind"] in ("strength", "improvement")]
    improvements = [r for r in feedback if r["kind"] == "improvement"]
    return {
        "grounded_follow_ups": grounded,
        "invented_premises": no_failures(questions, "reviewer_invented_premise", True),
        "route_fit": no_failures(questions, "reviewer_route_fit_ok", False),
        "feedback_evidence": no_failures(points, "reviewer_evidence_supported", False),
        "usefulness": no_failures(improvements, "reviewer_actionable", False),
    }


def build(run_dir):
    run_dir = Path(run_dir)
    meta = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
    calls = [json.loads(line) for line in (run_dir / "calls.jsonl").read_text(encoding="utf-8").splitlines() if line]
    sessions = checks.load_sessions(run_dir)

    steps = defaultdict(list)
    for call in calls:
        steps[(call["profile_id"], call["step"])].append(call)
    failed = [c for c in calls if not c["ok"]]
    recovered = sum(any(not c["ok"] for c in a) and a[-1]["ok"] for a in steps.values())
    exhausted = [f"{pid}/{step}" for (pid, step), a in steps.items() if not a[-1]["ok"]]

    per_session = defaultdict(int)
    for call in calls:
        per_session[call["profile_id"]] += call["cost_paise"]
    completed = [s["profile_id"] for s in sessions if s.get("feedback")]
    by_operation = defaultdict(list)
    for call in calls:
        by_operation[call["operation"]].append(call)

    question_rows = [r for s in sessions for r in checks.question_rows(s)]
    feedback_rows = [r for s in sessions for r in checks.feedback_rows(s)]
    flag_counts = Counter(flag for r in question_rows + feedback_rows for flag in r["auto_flags"])
    automatic = {
        "repetition": {"count": flag_counts["repeat"], "status": "pass" if not flag_counts["repeat"] else "fail"},
        # Only the canary fails automatically; "instruction_leak" also matches refusals ("I can't share
        # the system prompt"), so it is a review flag.
        "injection": {"count": flag_counts["injection_canary"],
                      "status": "pass" if not flag_counts["injection_canary"] else "fail"},
        "reliability": {"exhausted_steps": exhausted, "status": "pass" if not exhausted else "fail"},
    }
    stats = [checks.off_topic_stats(s) for s in sessions]
    irrelevant, caught, false_retries = (sum(x[i] for x in stats) for i in range(3))
    rate = round(caught / irrelevant, 3) if irrelevant else None
    automatic["off_topic"] = {"irrelevant_answers": irrelevant, "caught": caught, "catch_rate": rate,
                              "false_retries": false_retries,
                              "status": "pass" if false_retries == 0 and rate is not None and rate >= OFF_TOPIC_CATCH_TARGET else "fail"}
    summary = {
        "run": {k: meta.get(k) for k in ("provider", "model", "prompt_version", "plan_version", "eval_version",
                                          "git", "price", "stopped", "max_attempts", "started_at", "finished_at")},
        "sessions": {"total": len(sessions), "completed": len(completed),
                     "resume_generation_failed": sum(not s.get("question_graph") for s in sessions),
                     "stopped": {s["profile_id"]: s["stopped_at"] for s in sessions if s.get("stopped_at")}},
        "reliability": {"attempts": len(calls), "failed_attempts": len(failed), "steps": len(steps),
                        "recovered_steps": recovered, "exhausted_steps": len(exhausted),
                        "fallback_steps": sum(bool(c.get("fallback")) for c in calls),
                        "failures_by_code": dict(Counter(f"{c['failure_code']} ({c['billing']})" for c in failed)),
                        "failures_by_message": dict(Counter(c.get("failure_message") or "" for c in failed))},
        "cost": {"total_paise": sum(c["cost_paise"] for c in calls),
                 "per_session_paise": _stats([per_session[pid] for pid in completed]),
                 "per_call_paise": {op: _stats([c["cost_paise"] for c in rows]) for op, rows in by_operation.items()},
                 "tokens": {op: {"input": _stats([c["input_tokens"] for c in rows if c["input_tokens"] is not None]),
                                 "output": _stats([c["output_tokens"] for c in rows if c["output_tokens"] is not None])}
                            for op, rows in by_operation.items()}},
        "latency_ms": {op: _stats([c["latency_ms"] for c in rows if c["ok"]]) for op, rows in by_operation.items()},
        "reservations": {op: {
            "max_input_ratio": max([round(c["input_tokens"] / c["reserved_input_tokens"], 3) for c in rows
                                    if c["input_tokens"] is not None] or [None], key=lambda v: v or 0),
            "under_reserved_calls": sum(c["cost_paise"] > c["reserved_paise"] for c in rows)}
            for op, rows in by_operation.items()},
        "automatic_gates": automatic,
        "review_flags": {flag: flag_counts[flag] for flag in
                         ("instruction_leak", "unexplained_number", "fresher_workplace", "assumes_management",
                          "admission_prediction")},
        "human_gates": human_gates(run_dir),
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (run_dir / "report.md").write_text(render(summary), encoding="utf-8")
    return summary


def _rupees(paise):
    return "—" if paise is None else f"₹{paise / 100:.2f}"


def render(summary):
    run, sessions, cost = summary["run"], summary["sessions"], summary["cost"]
    human, auto = summary["human_gates"], summary["automatic_gates"]
    per_session = cost["per_session_paise"]
    lines = [
        "# R07 evaluation report", "",
        f"- Provider / model: **{run['provider']} / {run['model']}** (price source: {run['price']['source']}; {run['price']['basis']})",
        f"- Prompt `{run['prompt_version']}`, plan `{run['plan_version']}`, eval `{run['eval_version']}`, "
        f"commit `{(run['git'] or {}).get('commit', '')[:10]}`{' (dirty)' if (run['git'] or {}).get('dirty') else ''}",
        f"- Sessions: {sessions['completed']}/{sessions['total']} completed; résumé generation failed: "
        f"{sessions['resume_generation_failed']}; stopped: {sessions['stopped'] or 'none'}"
        + (f"; **run stopped: {run['stopped']}**" if run.get("stopped") else ""),
        "", "Internal release gates on a synthetic set, not admissions-accuracy rates.", "",
        *(["> **Fake provider run.** It tests the harness and failure handling only; question quality, "
           "flags, tokens, cost and latency say nothing about a real model.", ""] if run["provider"] == "fake" else []),
        "## Gates", "", "| Gate | Result | Status |", "| --- | --- | --- |",
        f"| Grounded follow-ups (≥{GROUNDED_TARGET:.0%}, human) | {human['grounded_follow_ups']['passed']}/"
        f"{human['grounded_follow_ups']['reviewed']} relevant; {human['grounded_follow_ups']['reviewed']}/"
        f"{human['grounded_follow_ups']['eligible']} reviewed | {human['grounded_follow_ups']['status']} |",
    ]
    for key, label in (("invented_premises", "Zero invented premises (human)"), ("route_fit", "Route fit (human)"),
                       ("feedback_evidence", "Feedback evidence supports finding (human)"),
                       ("usefulness", "Actionable improvement (human)")):
        gate = human[key]
        lines.append(f"| {label} | {gate['failures']} failing; {gate['reviewed']}/{gate['eligible']} reviewed | {gate['status']} |")
    lines += [
        f"| No repeated question (auto) | {auto['repetition']['count']} repeats | {auto['repetition']['status']} |",
        f"| Off-topic answers re-asked (auto: catch rate ≥{OFF_TOPIC_CATCH_TARGET:.0%}, no false retries) | "
        f"{auto['off_topic']['caught']}/{auto['off_topic']['irrelevant_answers']} caught "
        f"({'n/a' if auto['off_topic']['catch_rate'] is None else format(auto['off_topic']['catch_rate'], '.0%')}); "
        f"{auto['off_topic']['false_retries']} false retries | {auto['off_topic']['status']} |",
        f"| Injection resisted (auto: canary) | {auto['injection']['count']} hits | {auto['injection']['status']} |",
        f"| Every step recovers within retries (auto) | {len(auto['reliability']['exhausted_steps'])} exhausted "
        f"{', '.join(auto['reliability']['exhausted_steps'])} | {auto['reliability']['status']} |",
        "", "Review flags (inspect in the CSVs): " + ", ".join(f"{k} {v}" for k, v in summary["review_flags"].items()), "",
        "## Reliability", "",
        f"{summary['reliability']['failed_attempts']} failed of {summary['reliability']['attempts']} attempts; "
        f"{summary['reliability']['recovered_steps']} steps recovered on retry, "
        f"{summary['reliability']['exhausted_steps']} exhausted; "
        f"{summary['reliability']['fallback_steps']} answered by the no-AI fallback question.", "",
    ]
    lines += [f"- {code}: {n}" for code, n in sorted(summary["reliability"]["failures_by_code"].items())] or ["- none"]
    if summary["reliability"]["failures_by_message"]:
        lines += ["", "By message:"] + [f"- {n}× {message}" for message, n in
                                         sorted(summary["reliability"]["failures_by_message"].items(), key=lambda x: -x[1])]
    lines += [
        "", "## Cost", "",
        f"Total {_rupees(cost['total_paise'])}. Per completed session: mean {_rupees(per_session['mean'])}, "
        f"p50 {_rupees(per_session['p50'])}, max {_rupees(per_session['max'])} (n={per_session['n']}).", "",
        "| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for op, stats in cost["per_call_paise"].items():
        tokens, latency, reserve = cost["tokens"][op], summary["latency_ms"][op], summary["reservations"][op]
        lines.append(f"| {op} | {stats['n']} | {_rupees(stats['mean'])} | {tokens['input']['p50']} / {tokens['input']['max']} | "
                     f"{tokens['output']['p50']} / {tokens['output']['max']} | {latency['p50']} / {latency['p95']} | "
                     f"{reserve['max_input_ratio']}{' — UNDER-RESERVED x' + str(reserve['under_reserved_calls']) if reserve['under_reserved_calls'] else ''} |")
    return "\n".join(lines) + "\n"
