# R02 acceptance evidence — PostgreSQL migrations and runtime roles

Run on 15 Oct 2026 against a local PostgreSQL 16.15 server with password (SCRAM) auth and
disposable databases, plus SQLite. Synthetic data only.

## Acceptance criteria from the backlog

| Criterion | Evidence |
| --- | --- |
| Empty DB upgrades to head | `db_migrate.py` on a fresh Postgres DB → `0003`; `db_migrate.py check` → no drift; same on SQLite (`test_schema_migrations`) |
| Upgrade from existing (pre-Alembic) DB | Postgres DB created by the old startup code (13 RLS policies, 6 users) → adopted, stamped, upgraded; 0 policies, 0 RLS tables, 6 users kept, no drift. SQLite DB created by the old code → adopted; row counts identical, `integrity_check` ok, `foreign_key_check` clean, no drift |
| Runtime cannot change schema | As `app_runtime`: CREATE TABLE → permission denied for schema public; ALTER/DROP → must be owner; UPDATE/DELETE alembic_version → permission denied; TRUNCATE → permission denied; SELECT works |
| Runtime role completes owned operations | Full API smoke suite (signup, applications, essays, reviews, isolation, telemetry) passes connected as `app_runtime` with `AUTO_MIGRATE_ON_STARTUP=false` |
| Rejects other-user access under that role | `test_account_b_cannot_touch_account_a_data`: 11 read/update/delete/attach attempts across applications, essays and interviews all 404; A's data intact |
| Concurrent quota / idempotency | 20 simultaneous quota reservations, cap 5 → exactly 5 granted, counter = 5. 8 simultaneous duplicate interview creates → 1 session. 8 simultaneous uses of one reset link → one 200, seven 400 |
| Failed/behind migration leaves old release recoverable | API in `APP_ENV=production` refuses to start on an unversioned DB with a clear message and creates no tables; migrations run as a separate release step, so the old release keeps serving until the new one passes its schema gate. Baseline downgrade is blocked to prevent accidental data loss |

## Automated tests

- `backend/tests/test_schema_migrations.py` (6, SQLite, always run)
- `backend/tests/test_postgres_runtime.py` (6, Postgres; runs when `TEST_POSTGRES_ADMIN_URL` is set — CI now starts a `postgres:16` service)

Full backend run: 63 tests pass (SQLite + Postgres).

## Not covered here

Neon-specific behaviour (pooled vs direct endpoints, compute suspend/resume, branch restore)
needs the real Neon project; repeat steps 1–4 of the README "Database migrations" section there.
