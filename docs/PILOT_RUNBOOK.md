# Pilot Runbook (10-30 Users)

## Scope

- Environment: local/pilot stack (`frontend` + `backend` + SQLite).
- Cohort: 10-30 invited users.
- Goal: validate stability, UX flow completion, and admin observability before wider release.

## Daily Operating Cadence

1. Run smoke checks:
   - `bash scripts/run_checks.sh --skip-e2e`
2. Review admin panel:
   - DAU/WAU
   - New users (7d)
   - Activated users (7d)
   - Activation rate (7d)
   - API/error events (7d)
   - Telemetry coverage gaps
3. Review feedback queue:
   - `/admin/feedback`
4. Triage and log issues by severity.

## Severity Model

- `SEV-1`: Login broken, data loss, app unusable for all users.
  - Response target: immediate, fix same day.
- `SEV-2`: Core workflow broken for some users (create app/essay/save).
  - Response target: within 24 hours.
- `SEV-3`: Non-blocking bugs, layout issues, minor edge cases.
  - Response target: within 3 days.
- `SEV-4`: Cosmetic/polish improvements.
  - Response target: batch into weekly cleanup.

## Triage Template

- Reported by:
- Timestamp:
- Environment:
- Repro steps:
- Expected vs actual:
- Severity:
- Owner:
- Status:

## Guardrail Checks Before Any Pilot Day

1. `APP_ENV=pilot python3 scripts/validate_env.py --strict`
2. Optional backup drill weekly:
   - `python3 scripts/db_backup_restore.py drill`
3. Fresh backup before schema or auth changes:
   - `python3 scripts/db_backup_restore.py backup --label pre-change`

## Entry / Exit Criteria

### Pilot Start Criteria

- Backend smoke tests green.
- Frontend unit tests green.
- Auth smoke and app smoke green locally.
- Admin overview + coverage endpoints returning data.

### Pilot Exit Criteria

- No open `SEV-1` / `SEV-2` issues for 7 consecutive days.
- Activation rate stable or trending up.
- Telemetry coverage for key events at 100% for 7-day window.
