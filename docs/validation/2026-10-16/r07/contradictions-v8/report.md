# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v8`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `093e775598`
- Sessions: 12/12 completed; résumé generation failed: 0; stopped: none

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/49 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/63 reviewed | pending |
| Route fit (human) | 0 failing; 0/63 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/56 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/32 reviewed | pending |
| No repeated question (auto) | 1 repeats | fail |
| Injection resisted (auto: canary) | 0 hits | pass |
| Every step recovers within retries (auto) | 0 exhausted  | pass |

Review flags (inspect in the CSVs): instruction_leak 1, unexplained_number 1, fresher_workplace 0, assumes_management 0, admission_prediction 0

## Reliability

14 failed of 101 attempts; 8 steps recovered on retry, 0 exhausted; 6 answered by the no-AI fallback question.

- provider_error (charged): 14

By message:
- 13× The follow-up could not be matched to your answer. Your answer is still here; please retry.
- 1× The interviewer needs to clarify your latest answer first. Please retry.

## Cost

Total ₹10.16. Per completed session: mean ₹0.85, p50 ₹0.73, max ₹1.22 (n=12).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 12 | ₹0.12 | 719 / 725 | 638 / 730 | 5106 / 6610 | 0.219 |
| interview_answer | 77 | ₹0.09 | 2136 / 2831 | 78 / 118 | 1459 / 1969 | 0.384 |
| interview_feedback | 12 | ₹0.17 | 2417 / 2949 | 516 / 683 | 4055 / 5202 | 0.382 |
