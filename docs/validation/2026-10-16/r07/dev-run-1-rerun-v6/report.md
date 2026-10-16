# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v6`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `12889df652`
- Sessions: 3/4 completed; résumé generation failed: 1; stopped: {'exp-12-short-resume-banker': 'a4'}

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/14 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/18 reviewed | pending |
| Route fit (human) | 0 failing; 0/18 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/14 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/9 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary / leak) | 0 hits | pass |
| Every step recovers within retries (auto) | 2 exhausted exp-12-short-resume-banker/resume, exp-12-short-resume-banker/a4 | fail |

Review flags (inspect in the CSVs): unexplained_number 0, fresher_workplace 0, assumes_management 1, admission_prediction 0

## Reliability

7 failed of 31 attempts; 1 steps recovered on retry, 2 exhausted.

- provider_error (charged): 7

By message:
- 4× The follow-up could not be matched to your answer. Your answer is still here; please retry.
- 3× The drafted questions could not be grounded in your resume. Your reviewed text is still here; please retry.

## Cost

Total ₹3.01. Per completed session: mean ₹0.74, p50 ₹0.67, max ₹0.92 (n=3).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 6 | ₹0.12 | 687 / 725 | 600 / 652 | 4927 / 5342 | 0.217 |
| interview_answer | 22 | ₹0.08 | 1817 / 2644 | 67 / 89 | 1620 / 2018 | 0.362 |
| interview_feedback | 3 | ₹0.16 | 2204 / 2686 | 488 / 507 | 3935 / 4430 | 0.351 |
