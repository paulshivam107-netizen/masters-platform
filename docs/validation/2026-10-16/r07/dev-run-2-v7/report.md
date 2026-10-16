# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v7`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `38ab201f76`
- Sessions: 24/24 completed; résumé generation failed: 0; stopped: none

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/80 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/111 reviewed | pending |
| Route fit (human) | 0 failing; 0/111 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/113 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/68 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary / leak) | 1 hits | fail |
| Every step recovers within retries (auto) | 0 exhausted  | pass |

Review flags (inspect in the CSVs): unexplained_number 4, fresher_workplace 0, assumes_management 1, admission_prediction 1

## Reliability

3 failed of 160 attempts; 3 steps recovered on retry, 0 exhausted; 0 answered by the no-AI fallback question.

- provider_error (charged): 3

By message:
- 3× The follow-up could not be matched to your answer. Your answer is still here; please retry.

## Cost

Total ₹17.03. Per completed session: mean ₹0.71, p50 ₹0.64, max ₹1.13 (n=24).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 24 | ₹0.12 | 716 / 731 | 627 / 769 | 5278 / 6674 | 0.22 |
| interview_answer | 112 | ₹0.09 | 2053 / 2835 | 74 / 103 | 1409 / 1878 | 0.386 |
| interview_feedback | 24 | ₹0.17 | 2356 / 2957 | 507 / 614 | 4229 / 5168 | 0.381 |
