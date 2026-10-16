# R09 Catalogue durability and source review — evidence (2026-10-15)

Branch `r09-catalogue-durability`, based on `b52df68`. Migration `0007` (down_revision `0004`).

## Design

- Tables: `catalog_programs` (stable slug id) → `catalog_cycles` (one per admissions cycle, e.g. `2026-27`, points at its published revision) → `catalog_revisions` (state `draft | in_review | published | superseded`; `verification_status unverified | verified | stale | archived`; `rights_status`; fee; `source_url`; `checked_at`; `change_note`; creator; reviewer; reviewed/published timestamps) → `catalog_rounds` (label + deadline per revision).
- Workflow (all `/admin/catalog/*`, `require_admin_user`): create draft → edit draft → submit → return or publish (verified needs source URL + check date). Publishing a correction marks the previous revision `superseded`; nothing is deleted. One open revision per cycle. Cycles can be archived (hidden from public).
- Public `GET /programs`, `GET /programs/{id}`: published, non-archived cycles only, with `verification_status`, `status_reason`, `checked_at`, `cycle`, `is_current_cycle` and `autofill_allowed`. Freshness is computed on read: verified + checked within `CATALOG_STALE_AFTER_DAYS` (default 120) + current cycle (`CATALOG_CURRENT_CYCLE` override, otherwise July–June) is the only case that autofills.
- Seed JSON is import-only: `python manage_catalog.py import-seed` creates unverified drafts, skips existing programmes, never writes the file.
- Frontend: tracker template fills only school/programme names unless `autofill_allowed`, and shows "Unverified — check the official source" with the reason; `/programs` shows the same label and no longer shows invented fallback fees; Admin → Programmes is a review/publish screen (`CatalogReview.js`) with history.
- Removed: `/admin/programs` POST/PUT/DELETE (file-writing editor).

## Commands and results

| Check | Result |
| --- | --- |
| `python -m unittest tests/test_api_smoke.py` | 6 tests OK |
| `python -m unittest tests.test_interviews tests.test_resume_questions tests.test_interview_plan tests.test_admin_operations tests.test_auth_email_flows tests.test_schema_migrations tests.test_program_catalog tests.test_postgres_runtime tests.test_auth_sessions` (Postgres 16 on :5433) | 81 tests OK, none skipped |
| New `tests.test_program_catalog` | 9 tests: restart preserves changes; unpublished/unverified not public or autofilled; stale and wrong-cycle not autofilled; verified requires source + date; corrections keep history and published revisions are immutable; admin-only + ordered workflow; reviewer recorded + archive hides; seed import idempotent, unverified, file unchanged; real seed file imports cleanly |
| `CI=true npx react-scripts test --watchAll=false` | 20 suites, 76 tests passed (new `src/app/catalogAutofill.test.js`) |
| `REACT_APP_SITE_URL=https://www.masters-preview.in REACT_APP_ALLOW_INDEXING=true npm run build` | OK; "Rendered 5 public pages, catalogue and 404" |
| `npm run check:routes -- http://127.0.0.1:3901` against `PORT=3901 node scripts/serve.cjs` | All route checks passed |
| Fresh SQLite: `manage_db.py` then `manage_catalog.py import-seed` twice | `revision 0007 (head 0007)`; `created=5 skipped=0 invalid=0`, then `created=0 skipped=5 invalid=0`; seed file unchanged |

## Rollback

Revert the branch and run `alembic downgrade 0004` (drops the four catalogue tables; export reviewed records first if they matter). The seed JSON is untouched, so the old file-backed catalogue still works after a code revert.

## Operational note

After deploying, the public catalogue is empty until an admin runs the import and publishes reviewed records. That is intended: seed data is not authoritative.
