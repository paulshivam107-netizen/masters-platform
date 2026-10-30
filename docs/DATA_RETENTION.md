# Data retention, export and deletion manifest

Applies to the FastAPI service and its PostgreSQL database. The code source of truth is
`DELETION_MANIFEST` in `backend/services/account_data.py`; `backend/tests/test_account_data.py`
fails if a table exists that the manifest does not cover. Keep this file in step with it.
This is an engineering manifest, not legal advice; the public privacy policy wording needs owner/legal review.

## What a user can do (Settings → Your data)

| Action | Endpoint | Behaviour |
| --- | --- | --- |
| Download my data | `GET /account/export` | One JSON file with only the requester's rows. No password hash, token hashes, idempotency fingerprints or other users' data. The app adds browser-only notes/drafts (`masters:user:<id>:*`) to the file client-side. Rate limited (10/hour). |
| Delete my account | `POST /account/delete` | Needs `{"confirm":"DELETE"}` plus re-authentication, then runs in one database transaction. |

Re-authentication: accounts with a password must send it. Google-only accounts (no password) must have
**started their current sign-in within 10 minutes** (the first refresh token of the session family, so a silent token
refresh does not count) or send a fresh Google ID token for the same email. Otherwise `403 reauth_required`.
A deletion is refused with `409 operation_in_progress` while an interview or résumé AI step is still running
(its lease lasts about two minutes) so a half-written row cannot be orphaned.

## Manifest

| Data | Export | On deletion | Why |
| --- | --- | --- | --- |
| `users` (profile, reminder preferences) | yes, minus password hash | **deleted** | Account row. The email can register again as a new, empty account. |
| `applications` | yes | **deleted** | Applicant content. |
| `essays` (drafts, versions via `parent_essay_id`, AI review text) | yes | **deleted** | Applicant content. Links between essays/applications are cleared first. |
| `interview_sessions` (context snapshot, transcript, feedback) | yes | **deleted** | Applicant content. Not reachable afterwards by anyone (API returns 404 to other users; the owner's tokens stop working). |
| `interview_operations` (per-step results/usage) | yes, minus fingerprints | **deleted** | Generated questions and feedback. |
| `resume_question_sets` | yes | **deleted** | Résumé-derived facts and questions. |
| `pilot_feedback` written by the user | yes | **deleted** | Free text the user wrote. If the user was an admin who handled others' feedback, only the `handled_by` reference is cleared on those rows. |
| `admin_events` emitted by the user | yes (event name/time/payload) | **anonymised**: `user_id` and `payload_json` set to NULL | Event name and time stay so funnel and coverage counts remain correct. No link to a person remains. |
| `admin_events` row `account_deleted` | no | **created** | Anonymous record: counts of deleted rows and an AI usage ledger by model (tokens/characters/audio bytes summed from the user's operations). Keeps cost reconciliation intact after the underlying rows are gone. Contains no user id, email or content. |
| `interview_quotas` per-user counters (`...:user:<id>:<day>`) | yes | **deleted** | Per-person counters. Global counters (`...:global:<day>`) have no personal data and are kept; they protect the spending cap. |
| `refresh_tokens` | session metadata only | **deleted** | This revokes every signed-in browser/device at once (access tokens carry the session id and stop immediately). The refresh cookie on the deleting browser is cleared in the response. |
| `auth_tokens` (email-verify / reset links) | no (secrets) | **deleted** | Pending links stop working. |
| `admin_economics_scenarios` (admins only) | yes | **deleted** | The admin's own planning inputs. |
| `ai_runtime_config` | no | `updated_by_user_id` cleared | Site-wide setting; only the reference to the person is removed. |
| `ai_cost_entries` (AI cost ledger) | yes (amounts, model, status) | **anonymised**: user, reference and note cleared; amounts kept | Money committed or spent with the AI provider must still reconcile. |
| `ai_spend_counters` | the user's daily counters | per-user counters **deleted**; global kept | Global counters hold no personal data and enforce the site budget. |
| `rate_limit_buckets` | no | untouched | Keys are one-way hashes and expire within minutes; they cannot identify anyone. |
| Signed-out "try one question" | no account | **not stored** | The answer and follow-up are never saved on the server. The browser keeps them for 24 hours in localStorage key `mockmba:try_handoff` (a signed token holding the answer and follow-up) so the first interview after sign-up can continue the try. The server sees them again only if the person presses Continue, and the interview then holds them like any other transcript. Records: `ai_cost_entries` rows with no user (operation `anon_follow_up`), the `anon:<day>` counter in `ai_spend_counters`, hashed-IP rate-limit buckets, and an `admin_events` row `anon_try_answered` with the source page only. |
| `ai_price_versions` | no | `created_by_user_id` cleared | Price table; only the reference to the admin is removed. |
| `catalog_programs`, `catalog_cycles`, `catalog_rounds` | no (public data) | untouched | Programme facts, no personal data. |
| `catalog_revisions` | no (public data) | `created_by_user_id`, `reviewer_user_id` cleared | Revision history stays; only the reference to the admin is removed. |

Not stored on the server at all (so not exported or deleted by the API): interview audio, original résumé files,
reviewed résumé text. Notes, drafts and preferences kept in the browser are cleared by the app on deletion
(`masters:user:<id>:*` in localStorage), but only on the device where deletion is performed; other browsers
keep their copy until their owner clears site data or signs in/out.

## Retained after deletion, and for how long

| Item | Retained | Reason |
| --- | --- | --- |
| Anonymised admin events and the `account_deleted` ledger row | Until the admin events table is pruned (no automatic pruning yet) | Aggregate product metrics and AI-cost reconciliation. No person is identifiable. |
| Global quota counters | Rolling | Spending cap. |
| **Database backups and point-in-time history taken before the deletion** | **Until each backup expires: up to the Neon restore window (plan dependent, configure it and record it below) and up to 35 days for the encrypted logical exports (`scripts/db_backup_pg.sh` rotation default)** | Backups are immutable snapshots. We do not edit them to remove one person. |
| Hosting, reverse-proxy and application logs | Provider default (Railway/Cloudflare), no content is logged by the app | Operational security. Logs carry request metadata (path, status, IP), not essay or transcript text. |
| Emails already sent (verification, reminders) | In the recipient's mailbox and the mail provider's logs | Outside this system. |

### Honest backup statement (for the privacy page)

> When you delete your account we remove your data from our live database straight away and your session ends.
> Copies of the database in backups are not edited; they expire on a fixed schedule, up to 35 days
> for our own encrypted exports and up to the managed-database restore window. If we ever restore a backup,
> we re-run pending deletions before the service is reopened to users.

Operational rule that makes the last sentence true: **after any restore, replay deletions made since the backup**
(`account_deleted` events recorded after the restore point are not available in a restored copy, so keep the
deletion log outside the database: see "Deletion log" in `docs/BACKUP_RESTORE_RUNBOOK.md`). Until that
log exists, do not reopen a restored database to users without first deleting accounts that were removed in the lost window.

## Review checklist when adding a table or column

1. Add it to `DELETION_MANIFEST` (the test fails otherwise) and to `build_export` / `delete_account` as needed.
2. Update the table above.
3. Decide retention independently of convenience: user content is deleted, aggregate metrics are anonymised.
