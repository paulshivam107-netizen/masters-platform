# Master's Application Platform

**Continue from the October 2026 checkpoint:** [session handoff](docs/SESSION_HANDOFF.md) links the implemented features, complete future roadmap, AI learning plan and archived validation evidence.

![CI](https://github.com/paulshivam107-netizen/masters-platform/actions/workflows/ci.yml/badge.svg)

Planning workspace for Master's applicants with applications tracking, essay drafting, document readiness, deadlines, reminders, and AI essay review (mock or Anthropic-backed).

## Future product and business roadmap

Start with [the detailed roadmap](docs/future-roadmap/README.md) for the current interview-led strategy, pilot gates, hosting/database migration, pricing calculator, SEO/acquisition plan, operations and 38 scoped implementation tickets. It supersedes the older planning priorities below where they conflict; planned work is not a claim of production readiness.

## Current Architecture

- `frontend/`: React app (modularized view/layout/action layers)
- `backend/`: FastAPI app with JWT auth, profile + reminder endpoints, essay + application APIs
- `mba_platform.db`: SQLite database for local/pilot environments

### Frontend structure highlights

- `frontend/src/components/views/workspace/*`: page-level workspace views
- `frontend/src/app/derived.js`: computed dashboard/timeline/readiness helpers
- `frontend/src/app/*Actions.js`: domain action modules (essay/application, nav, profile, exports, docs)
- `frontend/src/app/layoutModel.js`: nav grouping + page heading resolver

### Backend structure highlights

- `backend/main.py`: API routes
- `backend/config.py`: centralized environment settings
- `backend/auth.py`: JWT + password auth utilities
- `backend/database.py`: DB engine/session config

## Quick Start

### Docker

```bash
./start.sh
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Local (without Docker)

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm start
```

## Environment Variables

Defined in `.env` (project root), consumed by backend settings:

- `DATABASE_URL` (default: `sqlite:///./mba_platform.db`)
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `MOCK_MODE` (`true` by default)
- `ANTHROPIC_API_KEY` (optional; required when `MOCK_MODE=false`)
- `GOOGLE_CLIENT_ID` (optional)
- `APP_ENV` (`development` by default; use `pilot`/`staging`/`production` for strict safety checks)
- `EXPOSE_DEV_AUTH_TOKENS` (optional override; default behavior exposes dev auth tokens only in local/test-style environments)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (optional for reminders)
- `CORS_ORIGINS` (comma-separated list)
- `ADMIN_EMAILS` (comma-separated emails that should have admin access)

Frontend:

- `REACT_APP_API_URL` (defaults to `http://localhost:8000`)
- `REACT_APP_GOOGLE_CLIENT_ID` (optional; if omitted, frontend reads `GET /auth/google/config` from backend)

## Pilot Readiness Notes

- Default mode is mock AI review (`MOCK_MODE=true`) to keep development cost-free.
- Health endpoint includes DB connectivity and runtime mode: `GET /health`.
- JWT secret now comes from configuration (`SECRET_KEY`) rather than hardcoded constant.
- API startup now fails fast when `SECRET_KEY` is weak/default.
- In `pilot`/`staging`/`production` env modes, dev auth-token exposure is blocked.

## Basic Validation Commands

```bash
cd frontend && npm run build
```

## Unified Dev Smoke Checks

Run backend API smoke + frontend unit + frontend e2e smoke in one command:

```bash
bash scripts/run_checks.sh
```

Notes:
- The script auto-starts backend (`:8000`) and frontend (`:3000`) if they are not already running.
- Authenticated app smoke tests run only if `E2E_EMAIL` and `E2E_PASSWORD` are set.
- The script now validates environment configuration before tests.
- Optional DB backup/restore drill can be included with `RUN_DB_DRILL=1`.
- For quick local validation without Playwright, run:

```bash
bash scripts/run_checks.sh --skip-e2e
```

## Ops Utilities

Validate `.env` and runtime config:

```bash
python3 scripts/validate_env.py
python3 scripts/validate_env.py --strict
```

Pilot preflight (strict env + smoke, with optional full E2E gate):

```bash
bash scripts/preflight_pilot.sh
RUN_E2E=1 bash scripts/preflight_pilot.sh
```

Pilot environment template:

```bash
cat .env.pilot.example
```

SQLite backup/restore/drill utility:

```bash
python3 scripts/db_backup_restore.py backup --label pre-pilot
python3 scripts/db_backup_restore.py drill
python3 scripts/db_backup_restore.py restore --from /absolute/path/to/backup.sqlite3 --force
```

## E2E Smoke (Playwright)

Playwright smoke specs are scaffolded in:

- `frontend/e2e/tests/smoke-auth.spec.js`
- `frontend/e2e/tests/smoke-app.spec.js`

Setup and run:

```bash
cd frontend
npm i -D @playwright/test
npx playwright install chromium
npm run e2e
```

Recommended stable local run (single worker, full setup + provisioning):

```bash
bash scripts/run_e2e_full.sh
```

One-command pilot gate (validate env + reset/seed + health + full e2e + pass/fail summary):

```bash
bash scripts/pilot_ready_check.sh
```

Reset local SQLite data to a clean seeded baseline (includes automatic DB backup + deterministic E2E user provisioning):

```bash
bash scripts/reset_seed_local.sh
```

Authenticated smoke tests require:

- `E2E_EMAIL`
- `E2E_PASSWORD`

Optional admin smoke tests require:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

Notes:
- `scripts/run_e2e_full.sh` defaults to `E2E_WORKERS=1` for reliable local runs.
- Override only if needed, e.g. `E2E_WORKERS=2 bash scripts/run_e2e_full.sh`.
- `scripts/pilot_ready_check.sh` also defaults to `E2E_WORKERS=1`.
- To skip DB reset in pilot check: `RUN_RESET=0 bash scripts/pilot_ready_check.sh`.

### Known-Good Local Baseline

- Date: February 13, 2026
- Command: `E2E_WORKERS=1 bash scripts/run_e2e_full.sh`
- Result: `10/10` tests passed (authenticated smoke, auth smoke, admin smoke, and core flows)

## CI

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on every push and pull request.
- Installs backend/frontend dependencies, Playwright Chromium, then runs:

```bash
bash scripts/run_checks.sh
```

## Pilot Guardrails Added

- Rate limiting on `auth/*` and `telemetry/events` endpoints.
- Consistent error payloads with request IDs for validation/runtime failures.
- Admin dashboard overview now includes:
  - DAU/WAU from telemetry
  - new users vs activated users (7d)
  - activation rate (7d)
  - apps/essays created (7d)
  - API/error-style event count (7d)
  - telemetry coverage report for key events

## Pilot Operations

- Pilot triage and incident workflow:
  - `docs/PILOT_RUNBOOK.md`

### Pilot Admin Sanity Checklist (Pre-demo / Pre-pilot)

- Confirm API health in browser: `http://127.0.0.1:8000/health`
- Login with pilot user and verify:
  - Overview loads
  - Create menu opens
  - Essays and Applications navigation works
- Login with admin user and verify:
  - Admin nav appears
  - Admin panel loads and refresh works
- In Settings, verify:
  - Feedback submit action succeeds
  - Reminder preview opens without API error
- Run end-to-end smoke:
  - `bash scripts/run_e2e_full.sh`

## Migration + Seed (Pilot)

```bash
python3 scripts/db_migrate.py
python3 scripts/seed_pilot_data.py
```

## Auth Session Notes

- Auth now returns both `access_token` and `refresh_token`.
- `POST /auth/refresh` rotates refresh tokens and issues a new access token.
- `POST /auth/logout` can revoke current refresh token or all sessions.
- Email verification flow:
  - `POST /auth/request-email-verification`
  - `POST /auth/verify-email`
- Password reset flow:
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
- In local/test-style environments without SMTP, auth email endpoints can include `dev_token` for testing.
- In `pilot`/`staging`/`production`, `dev_token` exposure is disabled.

## Admin Bootstrap (Local/Pilot)

- Add your email in `.env` as `ADMIN_EMAILS=you@example.com` and re-login.
- Or promote/demote directly from local DB:

```bash
python3 scripts/set_user_role.py you@example.com admin
python3 scripts/set_user_role.py you@example.com user
```

```bash
PYTHONDONTWRITEBYTECODE=1 python3 - <<'PY'
import sys
sys.path.append('backend')
import main
from routers.system_routes import health_check
print(health_check())
PY
```

## Onboarding and public launch

- [Interview Studio setup](docs/INTERVIEW_SETUP.md): backend key, chat/voice flow, résumé profiles, adaptive follow-ups, local recording/playback, limits, privacy and validation.
- [UI consistency review](docs/UI_CONSISTENCY_REVIEW.md): fixes, browser coverage, test results and remaining validation.
- [Interview question graph](docs/INTERVIEW_QUESTION_BANK.md): 95 question-only prompts, linked follow-ups, source coverage and maintenance.
- [Indian MBA launch and growth plan](docs/LAUNCH_AND_GROWTH_PLAN.md): audiences, pilot steps, outreach drafts, adoption metrics, quality backlog and interview revenue path.
- [Search and AI visibility implementation](docs/SEO_IMPLEMENTATION.md): public HTML rendering, crawler policy, deployment routing and launch checks.

`npm run build` now also renders the public pages and generates crawler files. Run `npm run preview` from `frontend` to check the resulting static site. Public indexing is off by default; set the documented public origin and indexing flag only for a reviewed production launch.


## Admin pilot operations

Open `/app/admin` with an active admin account. Sections can be linked directly, for example `/app/admin?section=spending`.

- **Overview:** interview steps requiring attention and unresolved feedback.
- **Interviews:** failed/stalled operations, safe diagnostic categories, attempts and session IDs. Applicant retries resolve the queue automatically. No transcripts, resumes or recordings are exposed. Older failures show an unknown reason; requests rejected before an operation exists are not included.
- **Spending:** recorded live interview/resume usage, optional text-cost estimates using rates entered by the admin, and the integrated economics calculator. Usage is not an invoice: deleted records, failed-call charges and audio costs are not fully captured. Calculator scenarios persist per admin account with edit-conflict protection. Temporary token rates are not saved.
- **Feedback:** search and paginate reports; mark open, in progress or resolved, with internal notes. Resolution requires a note. Changes are audited and concurrent edits return a conflict instead of overwriting. No customer messages are sent.
- **Users / Programmes / System:** existing controls grouped into focused screens. The AI pause switch covers live interviews; model selection in the existing settings form applies to essay reviews.

### Upgrade and validation

Restart the backend after updating code. Standard startup creates the `admin_economics_scenarios` table and applies additive feedback/operation columns; `python scripts/db_migrate.py` performs the same migration explicitly. Back up any valuable database before upgrades. Never run seed/reset scripts against existing applicant data.

New regression coverage: `backend/tests/test_admin_operations.py`, `frontend/src/components/views/workspace/AdminPilot.test.js`, and `adminEconomics.test.js`. The standard CI runner includes the admin backend suite. Validation used an isolated SQLite database and synthetic admin/member accounts, with no provider calls. A real PostgreSQL upgrade and real-provider billing reconciliation remain deployment checks.

Validated on 8 October 2026: 32 backend tests, 59 frontend tests across 17 suites, and the real application's production compilation passed. The 12 new frontend checks were rerun after final UI changes. Browser checks used the actual admin components and API in a synthetic fixture: feedback resolution persisted across reload; calculator assumptions saved and reloaded; diagnostics displayed; light/dark themes and a 390px phone viewport were reviewed with no horizontal overflow. This was not a production sign-in or live-provider test. [Saved browser evidence](docs/validation/admin-pilot/) contains synthetic data only.
