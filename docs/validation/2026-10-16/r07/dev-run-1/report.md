# R07 evaluation report

- Provider / model: **openai / gpt-4.1-mini** (price source: builtin; builtin-2026-10 (USD list price at Rs 90/USD))
- Prompt `mba-interview-v5`, plan `resume-led-v1`, eval `r07-eval-v1`, commit `ca3ae98484`
- Sessions: 20/24 completed; résumé generation failed: 1; stopped: {'cat-06-it-services-2yrs': 'a5', 'exp-02-consultant-pgpx': 'a2', 'exp-10-ngo-teacher': 'a2', 'exp-12-short-resume-banker': 'a4'}

Internal release gates on a synthetic set, not admissions-accuracy rates.

## Gates

| Gate | Result | Status |
| --- | --- | --- |
| Grounded follow-ups (≥90%, human) | 0/0 relevant; 0/69 reviewed | pending |
| Zero invented premises (human) | 0 failing; 0/101 reviewed | pending |
| Route fit (human) | 0 failing; 0/101 reviewed | pending |
| Feedback evidence supports finding (human) | 0 failing; 0/93 reviewed | pending |
| Actionable improvement (human) | 0 failing; 0/59 reviewed | pending |
| No repeated question (auto) | 0 repeats | pass |
| Injection resisted (auto: canary / leak) | 1 hits | fail |
| Every step recovers within retries (auto) | 5 exhausted cat-03-arts-history/resume, cat-06-it-services-2yrs/a5, exp-02-consultant-pgpx/a2, exp-10-ngo-teacher/a2, exp-12-short-resume-banker/a4 | fail |

Review flags (inspect in the CSVs): unexplained_number 0, fresher_workplace 0, assumes_management 1, admission_prediction 0

## Reliability

30 failed of 174 attempts; 10 steps recovered on retry, 5 exhausted.

- provider_error (charged): 30

By message:
- 24× The follow-up could not be matched to your answer. Your answer is still here; please retry.
- 5× The profile could not be matched to your resume. Please retry.
- 1× The drafted questions could not be grounded in your resume. Your reviewed text is still here; please retry.

## Cost

Total ₹17.05. Per completed session: mean ₹0.73, p50 ₹0.61, max ₹1.27 (n=20).

| Operation | Calls | Mean cost | Input tokens p50 / max | Output tokens p50 / max | Latency p50 / p95 ms | Max input / reserved |
| --- | --- | --- | --- | --- | --- | --- |
| resume_questions | 29 | ₹0.12 | 716 / 731 | 631 / 706 | 5358 / 5985 | 0.22 |
| interview_answer | 125 | ₹0.08 | 1918 / 2651 | 68 / 104 | 1393 / 1919 | 0.362 |
| interview_feedback | 20 | ₹0.16 | 2196 / 2751 | 474 / 631 | 4284 / 6485 | 0.357 |
