# R05 evidence: shared throttling and AI monetary limits

Date: 2026-10-15 · Branch: `r05-throttling-ai-limits` (stacked on R04 WIP `b52df68`) · Not merged or deployed.
All provider traffic stubbed; no real API calls, keys or spend. PostgreSQL 16 disposable databases only.

## What changed

| Area | Change |
| --- | --- |
| Throttling | `services/rate_limit.py` now uses `rate_limit_buckets` (atomic `INSERT .. ON CONFLICT DO UPDATE .. WHERE count < cap RETURNING`, own connection so a rolled-back login still counts). Fixed window smoothed by the weighted previous window; keys hashed (no raw e-mail/IP stored); expired rows purged in bounded batches. |
| Layers | Every limited call checks an IP layer (5x headroom) plus the account or e-mail layer when known. |
| Client IP | `TRUSTED_PROXY_HOPS` (Docker image: 1). Client = N-th entry from the right of `X-Forwarded-For`; client-prepended entries ignored; fewer entries than hops -> grouped as `unproxied`; IPv6 grouped by /64. uvicorn's `forwarded-allow-ips='*'` (leftmost, spoofable) is no longer relied on. |
| Money | `services/ai_costs.py`: integer paise, `ai_price_versions` (paise per million units, effective dates) with built-in fallbacks; `reserve` before dispatch (conservative max: input chars/2 tokens + max output tokens; audio by max seconds/characters); `finish` -> settled (actual usage, or reservation when unreported) / released / unknown; idempotent conditional transitions. |
| Caps | `ai_spend_counters` per UTC day, global and per user: one conditional `UPDATE` (`committed + amount <= cap AND in_flight < max`) in the reserving transaction. Unknown outcomes stay counted. Alert threshold is reported only. |
| Outcomes | Connect error/pool timeout/HTTP error status -> released; read timeout/lost connection -> unknown; 2xx with invalid or ungrounded output -> charged with reported usage; save conflict/unexpected error after a call -> unknown; reservations older than `AI_RESERVATION_STALE_MINUTES` -> unknown. |
| Retries/concurrency | No automatic provider retries; per-request attempts bounded (`AI_MAX_ATTEMPTS_PER_REQUEST`); per-user and global in-flight limits. |
| Denials | Refused before any provider call; transaction rolled back so the interview lease, transcript and request id are untouched (same request id succeeds later). 429 for user limits, 503 for site budget/kill switch; `X-AI-Limit` and `Retry-After` headers. |
| Admin | `GET /admin/pilot/ai-ledger` (today vs caps, alert flag, unknown count, reconciliation), `POST /admin/pilot/ai-ledger/{id}/resolve`, `GET/POST /admin/pilot/ai-prices` (audited). Frontend: Spending -> "Cost ledger & caps". |
| Schema | Alembic `0005` (4 new tables, additive). Rollback: `alembic downgrade 0004` drops only R05 tables. |

## Results

```
backend/ SECRET_KEY=... TEST_POSTGRES_ADMIN_URL=postgresql://postgres:***@127.0.0.1:5433/postgres
python -m unittest tests/test_api_smoke.py                                  -> Ran 6 tests, OK
python -m unittest tests.test_interviews tests.test_resume_questions tests.test_interview_plan \
  tests.test_admin_operations tests.test_auth_email_flows tests.test_schema_migrations \
  tests.test_postgres_runtime tests.test_auth_sessions tests.test_ai_limits tests.test_postgres_limits
                                                                            -> Ran 94 tests, OK
frontend: CI=true npx react-scripts test --watchAll=false                    -> 19 suites, 72 tests passed
```

Acceptance mapping (new tests):

| Acceptance | Test |
| --- | --- |
| Two workers respect the same limits | `test_postgres_limits.test_rate_limit_is_shared_by_two_worker_processes` (2 OS processes x 15 hits, limit 10 -> exactly 10), `test_rate_limit_threads_on_two_engines`, `test_ai_limits.SharedRateLimitTest` |
| Concurrent reservations cannot overspend | `test_concurrent_reservations_cannot_overspend_global_cap` (30 threads, 2 engines, cap 12 x 51 paise -> 12 granted, counter = 612), `..._respect_user_cap`, `test_concurrency_limit_holds_across_workers` |
| Disabled AI blocks billable ops | `test_disabled_ai_blocks_billable_steps_and_preserves_input` (answer + résumé), `test_caps_concurrency_and_kill_switch` |
| Denied op preserves input | same + `test_user_money_cap_denies_with_429_and_keeps_answer`, `test_retries_of_one_request_are_bounded` |
| Unknown outcome visible | `test_timeout_is_unknown_connect_error_is_released_bad_output_is_charged` (admin ledger shows it; resolve is audited, idempotent) |
| Alerts not mistaken for caps | `test_alert_is_reported_but_does_not_block`, frontend `AI ledger separates alerts from hard caps...` |
| Spoof-resistant client IP | `ClientIpTest` |

Synthetic ledger with concurrent reconciliation (PostgreSQL, 30 reservations, then 60 threads closing each entry twice at once from two workers):

```
{'day': '2026-10-15', 'committed_paise': 1026, 'settled_paise': 414,
 'counts': {'reserved': 6, 'settled': 12, 'released': 6, 'unknown': 6},
 'in_flight': 6, 'balanced': True, 'mismatches': []}
```

## Limitations / follow-ups

- Built-in prices are list prices at Rs 90/USD (Oct 2026 doc assumptions); speech/transcription reservations are placeholder bounds because those endpoints report no usage. R07 should measure and add DB price versions.
- Actual usage above the reservation (very long inputs) is recorded and counted but can overshoot a cap by that difference.
- Caps are environment variables (redeploy to change); the existing call-count quotas remain as a second guard.
- Trial allowance and credit-based consumption belong to R12/R13; unknown outcomes are resolved manually here.
