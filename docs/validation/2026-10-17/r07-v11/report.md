# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v11`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `6a6ec4015d`
- Sessions: 27/27 completed; résumé generation failed: 0; stopped: none

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/85 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/123 reviewed | pending |
| Route fit (human) | 0 failing; 0/123 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/122 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/71 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary) | 0 hits | pass |
| Every step recovers within retries (auto) | 0 exhausted  | pass |

Review flags (inspect in the CSVs): instruction_leak 0, unexplained_number 6, fresher_workplace 0, assumes_management 0, admission_prediction 1

## Reliability

29 failed of 204 attempts; 18 steps recovered on retry, 0 exhausted; 11 answered by the no-AI fallback question.

- provider_error (charged): 29

By message:
- 18× The follow-up could not be matched to your answer. Your answer is still here; please retry.
- 10× The interviewer needs to clarify your latest answer first. Please retry.
- 1× The interviewer repeated a question. Please retry this step.

## Cost

Total ₹21.51. Per completed session: mean ₹0.80, p50 ₹0.76, max ₹1.49 (n=27).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 27 | ₹0.12 | 776 / 811 | 643 / 712 | 4769 / 6076 | 0.238 |
| interview_answer | 150 | ₹0.09 | 2237 / 3025 | 79 / 146 | 1373 / 1970 | 0.404 |
| interview_feedback | 27 | ₹0.17 | 2545 / 3178 | 499 / 604 | 3949 / 5519 | 0.4 |
