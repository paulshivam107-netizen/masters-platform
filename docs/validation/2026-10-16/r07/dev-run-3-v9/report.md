# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v9`, plan `resume-led-v2`, eval `r07-eval-v1`, commit `2537f6782e`
- Sessions: 24/24 completed; résumé generation failed: 0; stopped: none

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/86 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/111 reviewed | pending |
| Route fit (human) | 0 failing; 0/111 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/110 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/64 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary) | 0 hits | pass |
| Every step recovers within retries (auto) | 0 exhausted  | pass |

Review flags (inspect in the CSVs): instruction_leak 0, unexplained_number 2, fresher_workplace 0, assumes_management 0, admission_prediction 1

## Reliability

15 failed of 172 attempts; 10 steps recovered on retry, 0 exhausted; 5 answered by the no-AI fallback question.

- provider_error (charged): 15

By message:
- 14× The follow-up could not be matched to your answer. Your answer is still here; please retry.
- 1× The feedback could not be matched to your answers. Please retry the debrief.

## Cost

Total ₹17.68. Per completed session: mean ₹0.74, p50 ₹0.65, max ₹1.19 (n=24).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 24 | ₹0.12 | 716 / 731 | 604 / 740 | 4973 / 6565 | 0.22 |
| interview_answer | 123 | ₹0.09 | 2080 / 2829 | 74 / 127 | 1427 / 2007 | 0.388 |
| interview_feedback | 25 | ₹0.17 | 2385 / 2932 | 510 / 586 | 4148 / 5400 | 0.381 |
