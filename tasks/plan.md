# Implementation Plan: R07 real provider evaluation

## Overview

R07 is an offline evaluation harness. It runs 30 synthetic applicants through the app's real interview code against OpenAI and records the questions, the feedback, cost, latency and failures. It then checks the output against the release gates in `docs/future-roadmap/01_PRODUCT_AND_PILOT.md`. Gates a script can judge are scored automatically; the rest go to a human review sheet. The measured costs replace the R05 placeholder prices. The harness never touches the app database, real users or production.

## What it exercises (current code, verified on main @ 3d573b6)

| Step | Function | Model setting | App's cost reservation |
| --- | --- | --- | --- |
| Résumé → facts + 3 question branches | `services/resume_questions.generate_questions` | `INTERVIEW_TEXT_MODEL` (default `gpt-4.1-mini`) | chars/2 in + 3,800 out |
| Next question (once per answer except the last) | `services/interview_provider.next_question` | same | chars/2 in + 800 out |
| Debrief | `services/interview_provider.feedback` | same | chars/2 in + 2,200 out |

Correction to what I told you earlier: interviews use `gpt-4.1-mini` through the Responses API with a strict JSON schema. The `gpt-4o-mini` in `config.py` is the older essay and other non-interview feature.

## Architecture decisions

1. **Call the provider functions directly, not the HTTP API.** The eval measures prompts, schema and model, with no DB, auth or quotas in the way. The context dicts are built exactly as `interview_routes.create_session` and `resume_routes` build them. App-level reliability (no lost answer, no silent charge) gets its own test through the API (Task 6).
2. **Fake OpenAI at the HTTP layer** (`httpx.MockTransport` patched into `interview_provider`). The real request building, status mapping, schema parsing and anchor/quote grounding checks all run offline at zero cost. Fault injection covers timeouts, 429s, malformed JSON, incomplete responses and bad anchors.
3. **Scripted, non-adaptive answers.** Each profile has a fixed list of tagged answers. Results are reproducible and cost nothing extra. A simulated LLM applicant was rejected for v1 because it adds cost and nondeterminism. Limitation: an answer may not quite fit the question asked, so reviewers judge whether each *question* fits the *answer before it*.
4. **The model is a CLI flag.** `--model X` sets `INTERVIEW_TEXT_MODEL` for the run, and each run is stored under its own directory, so comparing two models means running twice and diffing the reports. Prices come from `ai_costs.BUILTIN_PRICES`. A model missing from that table is costed at the premium fallback price and flagged in the report.
5. **Spend guard.** Live runs need `--provider openai --confirm-spend`. `--max-spend-paise` defaults to 10,000 (₹100): before each call, worst-case spend so far plus the call's reservation must fit under the cap, or the run stops. `--estimate` prints the worst-case cost and makes no calls. Retries are capped (default 3 attempts per step, mirroring a user pressing retry).
6. **Automatic checks versus human review.**
   - **Automatic:** schema/grounding failures, repeated or near-repeated questions, the injection canary (`BANANA-7`) appearing in output, numbers absent from the résumé and answers, workplace/manager wording for freshers, admission-prediction wording.
   - **Human (CSV):** question relevance (the 90% gate), invented premises, route fit, whether feedback evidence supports the point, whether each finding is actionable.
   - **No LLM-as-judge in v1.** The gates require human judgement.
7. **Held-out split** (6 profiles) runs only with an explicit `--split heldout`. It is not used while iterating on prompts.
8. **Outputs:**
   - `backend/evals/r07/results/<utc>-<provider>-<model>/` (gitignored) holds `run.json` (model, prompt/plan/eval versions, git SHA), `calls.jsonl`, one JSON per session, `review_questions.csv`, `review_feedback.csv` and `report.md`.
   - Evidence goes to `docs/validation/<date>/r07/`.
9. **Out of scope:** voice (transcription/TTS) quality and cost, Gemini, and any claim about admissions accuracy.

## Task list

### Phase 1: Foundation
- [ ] Task 1: Profile format, validator and 30 profiles. *In progress: validator + 2 examples written; 28 being written by a Sonnet subagent.*
- [ ] Task 2: One profile end to end on the fake provider (runner + CLI + per-call records).

### Checkpoint A
- [ ] `python -m evals.r07.profiles` prints OK (30 profiles, 15/15 routes, 6 held out, every tag at least 3 times)
- [ ] One fake session produces a transcript, feedback and `calls.jsonl` with tokens, cost and latency
- [ ] No network access (the fake raises if a real client were used)

### Phase 2: Scoring and safety
- [ ] Task 3: Retries, fault accounting by billing outcome, spend guard, `--estimate`
- [ ] Task 4: Automatic checks and the two review CSVs
- [ ] Task 5: `report.md` and `score` (reads filled review CSVs and computes the human gates)

### Checkpoint B
- [ ] A full fake run of 30 profiles with faults injected completes, and every injected fault is accounted for
- [ ] New unit tests pass; existing backend tests still pass (`scripts/run_checks.sh --skip-e2e`)
- [ ] **Review with you before any paid call**

### Phase 3: Live (needs your key and a go-ahead at each spend step)
- [ ] Task 6: API-level reliability test with a fault-injecting provider (fill gaps only after checking the existing `test_interviews` / `test_ai_limits`)
- [ ] Task 7: Pilot live run on 3 dev profiles (about ₹5), inspect; then the full dev split (about ₹40–60)
- [ ] Task 8: Human review → score → fix critical failures (bump `PROMPT_VERSION` if prompts change) → re-run dev → one held-out run
- [ ] Task 9: Replace the R05 placeholders: check OpenAI list prices against the official page, update `BUILTIN_PRICES` / `PRICE_BASIS` and, if measurements justify it, `TEXT_OVERHEAD_CHARS`; write evidence and update the backlog status

### Checkpoint C (R07 done)
- [ ] Product and Pilot gates pass on dev and held-out, with numerators/denominators
- [ ] Refusals, schema failures and timeouts recover; prompt/model versions recorded
- [ ] Commit + `docs/validation/<date>/r07/` evidence

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Accidental spend or runaway retries | Med | `--confirm-spend`, hard paise cap checked before each call, attempt cap, `--estimate` first |
| Key leaks into logs or results | High | Key read only through `get_settings()`; never written to run files; request bodies aren't logged |
| Strict grounding checks reject many good model outputs (high retry rate) | Med | Reported as a reliability metric; a high rate is a finding to fix in the prompt, not to hide |
| Scripted answers read oddly after some questions | Low | Reviewers judge each question against the answer before it; noted as a limitation |
| Prompt tuning on the same cases (overfitting) | Med | Held-out split runs only explicitly, once per prompt version |
| Builtin prices out of date | Med | Task 9 verifies them against the official page and records the source and date in `PRICE_BASIS` |

## Open questions

1. **Second model:** stay on `gpt-4.1-mini` only, or compare one other cheap OpenAI model on the same dev split (about +₹50)?
2. **Reviewer:** will you do the first review pass yourself? Is there an external reviewer with MBA interview experience for a subset?
3. **Budget:** is ₹100 per run (the cap) acceptable, and roughly ₹300 for R07 in total, including re-runs?
4. **Voice cost:** should R07 also measure transcription/TTS cost per voice session (a few rupees more), or leave that to R08?
