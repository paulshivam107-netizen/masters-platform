# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v9`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `2537f6782e`
- Sessions: 6/6 completed; résumé generation failed: 0; stopped: none

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/19 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/27 reviewed | pending |
| Route fit (human) | 0 failing; 0/27 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/27 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/16 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary) | 0 hits | pass |
| Every step recovers within retries (auto) | 0 exhausted  | pass |

Review flags (inspect in the CSVs): instruction_leak 0, unexplained_number 1, fresher_workplace 0, assumes_management 0, admission_prediction 1

## Reliability

7 failed of 46 attempts; 4 steps recovered on retry, 0 exhausted; 3 answered by the no-AI fallback question.

- provider_error (charged): 7

By message:
- 7× The follow-up could not be matched to your answer. Your answer is still here; please retry.

## Cost

Total ₹4.55. Per completed session: mean ₹0.76, p50 ₹0.62, max ₹1.38 (n=6).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 6 | ₹0.12 | 717 / 729 | 620 / 689 | 4808 / 6439 | 0.22 |
| interview_answer | 34 | ₹0.08 | 2074 / 2743 | 71 / 131 | 1383 / 2162 | 0.378 |
| interview_feedback | 6 | ₹0.17 | 2370 / 2832 | 459 / 587 | 3783 / 4478 | 0.377 |
