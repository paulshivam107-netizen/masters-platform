# R07 tasks

See `tasks/plan.md` for decisions, risks and open questions.

## Task 1: Profiles, validator, 30 synthetic profiles
**Description:** A versioned set of 30 synthetic applicants (about 15 per route, 6 held out) with tagged answer scripts covering specific answers, vague claims, contradiction, unknowns, disagreement, confidential details, stop requests, irrelevant text and injection.
**Acceptance criteria:**
- [ ] `python -m evals.r07.profiles` prints OK
- [ ] No real names, companies or contact data; injection answers contain `BANANA-7`
**Verification:** validator output pasted into the evidence; spot-read 5 profiles
**Dependencies:** none
**Files:** `backend/evals/r07/profiles.py`, `backend/evals/r07/profiles/{dev,heldout}/*.json`
**Scope:** S (code) + data

## Task 2: One profile end to end on the fake provider
**Description:** The runner builds the app's context, generates résumé facts and questions, plays the scripted answers through `next_question`, requests `feedback` and records each call (operation, attempt, tokens, reservation, cost in paise, latency, outcome).
**Acceptance criteria:**
- [ ] `python -m evals.r07 run --provider fake --ids cat-01-commerce-fresher` writes a session JSON and `calls.jsonl`
- [ ] Context matches `interview_routes.create_session`, including the résumé profile, follow-ups and plan
**Verification:** a unit test runs one profile with the fake and asserts the transcript length and the call records
**Dependencies:** 1
**Files:** `backend/evals/r07/runner.py`, `fake_openai.py`, `__main__.py`, `backend/tests/test_r07_eval.py`
**Scope:** M

## Checkpoint A
- [ ] Validator OK; one fake session complete; no network

## Task 3: Retries, failure accounting, spend guard
**Description:** On `ProviderFailure`, retry up to N attempts and record the code and the billing outcome (`none` = 0, `charged` = actual usage or the reservation, `unknown` = the reservation). Stop before a call would push worst-case spend past `--max-spend-paise`. `--estimate` makes no calls. A live run requires `--confirm-spend`.
**Acceptance criteria:**
- [ ] With `--fake-fault-every 3`, every injected fault type appears in `calls.jsonl` and each step either recovers or is marked exhausted
- [ ] The budget-stop test passes; a live run without `--confirm-spend` exits before any call
**Verification:** unit tests
**Dependencies:** 2
**Files:** `runner.py`, `__main__.py`, `test_r07_eval.py`
**Scope:** S

## Task 4: Automatic checks and review CSVs
**Description:** Flags for each question and feedback point (repeat or near-repeat, canary, unexplained number, fresher workplace wording, admission prediction), plus `review_questions.csv` and `review_feedback.csv` with blank reviewer columns.
**Acceptance criteria:**
- [ ] Each check has a positive and a negative unit test
- [ ] Every follow-up/clarification question has a CSV row; every feedback point has a row
**Verification:** unit tests; open the CSVs from a fake run
**Dependencies:** 2
**Files:** `backend/evals/r07/checks.py`, `runner.py`, `test_r07_eval.py`
**Scope:** S

## Task 5: Report and score
**Description:** `report.md` contains a gates table (automatic results, human gates pending or scored), reliability by failure code, cost per session (mean/p50/max) and per operation, latency p50/p95, and actual-versus-reserved tokens. `python -m evals.r07 score <run_dir>` recomputes it from filled CSVs.
**Acceptance criteria:**
- [ ] The report shows numerators/denominators and the model, prompt, plan and eval versions plus the git SHA
- [ ] A filled sample CSV produces the correct grounded-follow-up percentage
**Verification:** unit test on a small fixture
**Dependencies:** 3, 4
**Files:** `backend/evals/r07/report.py`, `__main__.py`, `test_r07_eval.py`, `backend/evals/r07/README.md`
**Scope:** S

## Checkpoint B (review with owner before spend)
- [ ] Full fake run with faults (30 profiles); `scripts/run_checks.sh --skip-e2e` green; README explains how to run

## Task 6: API-level reliability test
**Description:** Through the interview API, a timeout, malformed output or refusal keeps the answer, releases or marks the cost entry correctly, and a retry succeeds. Add tests only for gaps in the existing ones.
**Acceptance criteria:** [ ] tests on SQLite and Postgres
**Dependencies:** none (can run in parallel with 2–5)
**Files:** `backend/tests/test_interviews.py` or `test_ai_limits.py`
**Scope:** S

## Task 7: Live pilot and dev run (owner go-ahead at each step)
**Acceptance criteria:**
- [ ] `--estimate` shown to the owner first
- [ ] 3 profiles first, then the full dev split, all within the cap
**Dependencies:** 5, the key in `backend/.env`

## Task 8: Review, fix, held-out
**Acceptance criteria:**
- [ ] Zero critical invented premises; at least 90% grounded follow-ups (n/N); route-fit and feedback-evidence gates pass
- [ ] Each fix is recorded with a `PROMPT_VERSION` bump; the held-out split is run once on the final version
**Dependencies:** 7

## Task 9: Prices and evidence
**Acceptance criteria:**
- [ ] `BUILTIN_PRICES` / `PRICE_BASIS` verified against OpenAI's official pricing (with date); the measured ₹ per session is recorded
- [ ] `docs/validation/<date>/r07/README.md` contains the reports; backlog R07 status updated; commit
**Dependencies:** 8

## Checkpoint C: R07 done
