# R07 provider evaluation

Runs 30 synthetic applicants (`profiles/dev`, 24; `profiles/heldout`, 6) through the app's real
`generate_questions` → `next_question` → `feedback` functions and reports the release gates from
`docs/future-roadmap/01_PRODUCT_AND_PILOT.md`. No database, users or production are touched.
Run everything from `backend/`.

```bash
python -m evals.r07 validate                                  # check the profiles
python -m evals.r07 run --fake-fault-every 4                  # offline, zero cost
python -m evals.r07 run --estimate                            # worst-case cost, no calls
python -m evals.r07 run --provider openai --confirm-spend --ids cat-01-commerce-fresher
python -m evals.r07 run --provider openai --confirm-spend     # full dev split
python -m evals.r07 report evals/r07/results/<run>            # re-score after review
```

- **Model:** `--model` (default `gpt-4.1-mini`) sets `INTERVIEW_TEXT_MODEL` for the run. To
  compare models, run the same split twice and compare the reports. A model missing from
  `services/ai_costs.BUILTIN_PRICES` is costed at the premium fallback price; add its price first.
- **Spend:** a live run needs `--confirm-spend` and `OPENAI_API_KEY` in `backend/.env`. It stops
  before worst-case spend could pass `--max-spend-paise` (default 10,000 = ₹100). Unknown
  outcomes (timeouts) count at their reservation. Each step gets `--max-attempts` tries (default 3).
- **Held-out:** run `--split heldout` only once per final prompt version. Don't tune on it.
- **Outputs** (`results/<utc>-<provider>-<model>/`, gitignored): `run.json`, `calls.jsonl`,
  `sessions/*.json`, `review_questions.csv`, `review_feedback.csv`, `summary.json`, `report.md`.
- **Review:** in the CSVs, fill `reviewer_*` columns with Y/N, then run `report`. A question is
  relevant if it follows sensibly from the answer immediately before it. Answers are a fixed
  script, so don't penalise a question because the next scripted answer ignores it.
  `auto_flags` are hints, not verdicts.
- **Not covered:** voice transcription/TTS, other providers, admissions accuracy.
