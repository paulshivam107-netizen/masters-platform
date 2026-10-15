# R06 evidence — account export, account deletion, PostgreSQL backup/restore

15 Oct 2026. Local only: SQLite for API tests, local PostgreSQL 16 (127.0.0.1:5433) for the
runtime-role tests and the restore drill. Synthetic data only. Nothing was deployed.

## What was built

| Piece | Where |
| --- | --- |
| `GET /account/export`, `POST /account/delete` | `backend/routers/account_routes.py` |
| Export/deletion over one manifest covering every table | `backend/services/account_data.py` (`DELETION_MANIFEST`) |
| Written manifest + retention/backup limits | `docs/DATA_RETENTION.md` |
| Settings → "Your data" (download, delete with typed confirmation) | `frontend/src/components/views/workspace/AccountDataCard.js` |
| Encrypted logical backup | `scripts/db_backup_pg.sh` (`pg_dump -Fc` → `openssl enc -aes-256-cbc -pbkdf2`) |
| Restore drill | `scripts/db_restore_drill.py` |
| Runbook (Neon PITR/branch, export, drill, full restore) | `docs/BACKUP_RESTORE_RUNBOOK.md` |
| SQLite script relabelled local-only | `scripts/db_backup_restore.py`, README, PILOT_RUNBOOK |

No schema change was needed (no Alembic revision added).

## Acceptance → evidence

| Acceptance | Evidence |
| --- | --- |
| Export belongs only to the requesting user | `test_export_contains_only_requesting_users_data_and_no_secrets`: two populated users; A's export contains A's essay/answer/feedback/telemetry/résumé markers and none of B's; no password hash, token hash, fingerprint or session family id appears. Restored-DB check `export_isolated: true`. |
| Deleted interview content is inaccessible | `test_deletion_removes_content_anonymises_aggregates_and_revokes_sessions`: after deletion the old token gets 401 on interview/essay/application URLs and export; user B gets 404 on the same ids; rows for A are gone in `applications`, `essays`, `interview_sessions`, `interview_operations`, `resume_question_sets`, `pilot_feedback`, `refresh_tokens`; A's telemetry kept with `user_id`/payload NULL; only A's quota counters removed (a look-alike `id=<A>1` key and the global counter stay); B untouched; same email re-registers empty. |
| Re-authentication | password required (wrong/missing → 403, no `confirm` → 422); Google-only account refused when its sign-in started 30 min ago (`reauth_required`), accepted at 2 min; a password sent by a passwordless account is rejected. |
| Sessions revoked | refresh cookie cleared in the response; old refresh cookie → 401; a second device's access token → 401 (`test_deletion_revokes_other_signed_in_devices`). |
| In-flight AI step | deletion returns 409 `operation_in_progress` and changes nothing. |
| Manifest is complete | `ManifestTest`: fails if any table lacks a manifest entry. |
| Restored DB has expected rows and working ownership; finance reconciliation survives | Drill below. |
| Backup-retention limits published accurately | `docs/DATA_RETENTION.md` "Honest backup statement"; runbook section 5 notes the open deletion-log gap. |

## Restore drill (run against local PostgreSQL 16)

```
DRILL_ADMIN_URL=postgresql://postgres:***@127.0.0.1:5433/postgres python scripts/db_restore_drill.py
```

Result **PASS** in 1.5 s ([full output](restore-drill-output.json)): encrypted dump 43,984 bytes;
`row_counts_match`, `ownership_match` (per-user counts across 8 owned tables), `usage_ledger_match`
(344 tokens) all true; post-restore `schema_drift: 0`, `export_isolated`, `sequence_continues`,
`delete_account_ok` all true. Both scratch databases were dropped afterwards (verified none left).

## Test runs

| Suite | Result |
| --- | --- |
| `tests/test_api_smoke.py` | 6 passed |
| `test_interviews, test_resume_questions, test_interview_plan, test_admin_operations, test_auth_email_flows, test_schema_migrations, test_postgres_runtime (with TEST_POSTGRES_ADMIN_URL), test_auth_sessions, test_account_data` | 80 passed, 0 skipped |
| new `tests.test_account_data` alone | 8 passed |
| Frontend `react-scripts test` | 20 suites, 74 tests passed (3 new in `AccountDataCard.test.js`) |

## Limitations / owner actions

- Not run against Neon. Record the Neon restore window; choose where encrypted dumps live and how they are scheduled and alerted.
- After a restore, accounts deleted since the restore point come back until re-deleted; an off-database deletion log is needed (runbook section 5).
- Google-only re-auth uses the start time of the current session family (first sign-in, not token refreshes) rather than the access token's `iat`, because `iat` is renewed on every silent refresh and would not prove a fresh login. The UI has no "re-sign-in with Google" button inside the dialog; it tells the user to sign out and in again.
- Browser notes are cleared only on the device where deletion happens.
- Privacy page wording needs legal/owner review.
