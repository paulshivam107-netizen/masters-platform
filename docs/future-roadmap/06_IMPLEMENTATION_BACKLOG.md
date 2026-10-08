# Implementation backlog and future assistant handoff

[Roadmap index](README.md)

## How to use this backlog

Work one ticket at a time in dependency order. Each estimate is focused engineering time, not elapsed calendar time, vendor/KYC waiting, customer recruitment or founder learning. Expect a learning/unknown-work buffer. The first paid release can readily require 80–140 engineering hours plus pilot, editorial and acquisition work; this is why the roadmap does not promise a complete launch in a few evenings.

The status of every ticket below is **planned**, unless its description says it is a verification of existing work. Mark done only with an implementation revision and acceptance evidence. Do not infer completion from a previous assistant's summary. Existing test records in the UI review are useful baselines but were run on a disposable local setup, not production.

## Foundation before an external pilot

### R01 Auth email origins and real email delivery

- **Scope:** `backend/services/auth_flows.py`, matching frontend auth routes, configuration interface and tests; 2–5h.
- **Work:** replace localhost email links with an explicitly validated public frontend origin; keep staging/production distinct; verify expired/used tokens and safe reset responses. Configure owner-provided SMTP/provider settings separately.
- **Acceptance:** actual verification/reset emails lead to the correct HTTPS app; tokens work once; invalid/expired links explain recovery; no token in analytics/logs. Email failure does not misrepresent a successfully created account.
- **Dependency:** public/staging origin chosen. **Do not:** print secrets or execute email tests against uninvolved people.

### R02 PostgreSQL migrations and runtime roles

- **Scope:** `backend/database.py`, `backend/main.py`, `backend/services/migrations.py`, migration tooling and synthetic DB tests; 10–18h.
- **Work:** Alembic baseline/revisions, remove runtime DDL, define migration owner/runtime grants, reconcile RLS role assumptions and configure small explicit pools.
- **Acceptance:** empty DB and upgrade-from-baseline work; runtime cannot change schema; actual runtime role completes owned operations and rejects other-user access; concurrent quota/idempotency cases pass; failed migration leaves old release recoverable.
- **Dependency:** chosen PostgreSQL service or disposable local PostgreSQL. **Do not:** run SQLite reset/seed scripts on real data.

### R03 HTTPS staging and production delivery

- **Scope:** build/deployment manifests, frontend delivery rules, backend container and health checks; 5–10h plus account setup.
- **Work:** supported runtimes, reproducible installs, static frontend build, private shell and real 404 routing, separate environments and build variables.
- **Acceptance:** fresh-account and returning-user deep links work; public HTML visible without JS; private noindex; all secrets backend-only; restart retains data; preview indexing disabled; logs redacted.
- **Dependency:** R02 and owner-created accounts. **Evidence:** deployed route/status table and rollback steps.

### R04 Authentication and ownership hardening

- **Scope:** `backend/auth.py`, auth router/services, `frontend/src/contexts/AuthContext.js`, `frontend/src/api/client.js`, ownership tests; 8–16h.
- **Work:** reviewed refresh-cookie/access-token strategy, CSRF/origin controls, rotation/replay/logout handling, admin permissions and multi-tab refresh behaviour. Decide managed-auth migration only if needed.
- **Acceptance:** refresh cannot be replayed indefinitely; logout revokes supported sessions; A cannot read/update/delete/export B's data; account switching cannot replay queued work under the wrong identity; meaningful XSS/token risks reviewed.
- **Dependency:** R03 HTTPS staging. **Do not:** assume moving a token into a cookie alone solves CSRF/auth.

### R05 Shared throttling and AI monetary limits

- **Scope:** rate-limit service, interview/résumé services, cost ledger model, admin view and tests; 8–14h.
- **Work:** shared expiring limits for auth and expensive operations; trusted proxy interpretation; monetary reservation/reconciliation, model price versions, bounded retries/concurrency and trial allowance.
- **Acceptance:** two workers respect the same limits; concurrent reservations cannot overspend; disabled AI blocks new billable operations; denied operation preserves input; unknown provider outcome is visible; alerts are not mistaken for hard caps.
- **Dependency:** R02. **Evidence:** race tests and synthetic cost ledger with reconciliation.

### R06 Backup restore export and deletion

- **Scope:** dedicated PostgreSQL backup/restore runbook, account export/deletion service and tests; 6–12h.
- **Work:** scoped exports, deletion manifest across profiles/session copies/notes, retention exceptions, encrypted backup policy and isolated restore drill.
- **Acceptance:** export belongs only to requesting user; deleted interview content is inaccessible; published backup-retention limitations are accurate; restored DB includes expected rows and functioning ownership; finance reconciliation survives restore.
- **Dependency:** R02; final retention policy. **Do not:** describe a local SQLite backup as production PostgreSQL recovery.

### R07 Real provider evaluation and model contract

- **Scope:** interview provider/plan/schemas, résumé generator and new versioned evaluation fixtures; 8–14h plus human review.
- **Work:** 30 synthetic profiles and representative answer chains; evaluate grounding, unsupported premises, unknown answers, route fit, feedback quality, latency and complete cost. Keep model settings explicit.
- **Acceptance:** gates in Product and Pilot pass; refusals/schema failures/timeouts recover; prompt/model version recorded; held-out examples remain separate; critical failures documented and repaired.
- **Dependency:** owner-provided staging key and R05. **Do not:** use a premium model by default or claim admissions scoring accuracy from schema validation.

### R08 Physical device and first application journey

- **Scope:** existing interview recording/Studio and application form, with targeted fixes only; 4–8h.
- **Work:** manually resolve outstanding native-date save; test Safari/iPhone, Android Chrome, desktop, denied microphone, interrupted audio, slow network and keyboard-only paths.
- **Acceptance:** real first application persists; record → stop → playback → download works; retry retains the earlier attempt; no silent loss/charge; both themes usable at narrow widths. Provide device/version evidence.
- **Dependency:** R03. **Do not:** repeat the earlier failed date automation endlessly or claim mocked audio tests prove physical capture.

### R09 Catalogue durability and source review

- **Scope:** catalogue service/admin routes, proposed programme/intake/round/revision models and UI badges; 8–14h.
- **Work:** replace mutable container JSON with DB-backed revisions; source/freshness/rights status; draft → review → publish; import seed as unverified until checked.
- **Acceptance:** restart/redeploy preserves changes; wrong-cycle data cannot silently autofill; unpublished/stale records remain visibly unverified; corrections retain history.
- **Dependency:** R02. **Pilot shortcut:** disable factual catalogue editing/autofill and allow manual programme entry until this is complete; do not present seed data as authoritative.

### R10 Pilot instrumentation support and policies

- **Scope:** minimal events, support form/runbook, public privacy/terms/refund/contact drafts and release checklist; 4–8h plus professional review.
- **Work:** event schema/deduplication, route/cohort definitions, no content in telemetry, support request IDs, tested deletion/export route, approved data/rights statements.
- **Acceptance:** a five-question session traces through the funnel once; demo excluded; acquisition tag reaches a test order later; consent and policy match actual behaviour; rights audit resolves uncertain question material before commercial use.
- **Dependency:** R01–R08 as relevant. **Do not:** send marketing messages, publish legal promises or add analytics SDKs without a defined data purpose.

## Supported pilot and first paid release

### R11 Observed pilot and decision record

- **Scope:** no broad code changes; use cohort sheet and pilot script; 10–15h spread over 2–3 weeks.
- **Work:** recruit initial 10 applicants across routes, observe unassisted use, collect specific feedback, follow up on independent repeat use, fix top blockers as separate tickets.
- **Acceptance:** denominators and exclusions recorded; usefulness/repeat gates assessed; every failure assigned a next action; explicit proceed/rework/stop decision.
- **Dependency:** pilot entry gates. **Do not:** count friends' encouragement as purchases or founder-guided sessions as unassisted activation.

### R12 Orders payments and credit ledger

- **Scope:** new billing models/router/service, checkout/account-credit UI and tests; 12–20h.
- **Work:** server-side SKU/price, provider order, verified payment/webhook, append-only credit grants/reservations/consumption/releases, expiry/refund handling and manual adjustment audit.
- **Acceptance:** duplicate/out-of-order webhooks grant once; price/order/user mismatch rejected; concurrent starts cannot overdraw; lost browser callback recovers from webhook; provider timeout cannot double-consume a session; balances reconcile.
- **Dependency:** R02/R04/R05 and product offer defined. **Do not:** trust frontend prices or success redirects.

### R13 Paid session recovery and daily reconciliation

- **Scope:** interview-operation state machine, billing/jobs/admin exceptions; 6–10h.
- **Work:** distinguish failed/delivered/ambiguous outcomes, resume interviews, automatically release eligible reservations, compare provider payments against internal state and present exceptions.
- **Acceptance:** simulated process restart at each payment/session stage yields no duplicate grant/lost entitlement; customer sees accurate credit status; unresolved money differences alert owner.
- **Dependency:** R12. **Evidence:** failure matrix and reconciliation output from test mode.

### R14 Paid beta and price validation

- **Scope:** offer page, ten independent buyer conversations, economics update; 5–8h plus elapsed observation.
- **Work:** owner performs small live payment/refund drill; offer one clear pack; record actual price, cost, objections, repeat purchases, refunds and support time.
- **Acceptance:** ten genuine buyers outside a purely free/friend cohort or a documented offer failure; update calculator from actual settled transactions and measured session allowance.
- **Dependency:** R11–R13. **Do not:** scale ads while payment/quality failures remain.

## High value after launch

| ID | Task and likely scope | Estimate | Acceptance and dependency |
| --- | --- | --- | --- |
| R15 | Server persistence for notes/checklists; workspace storage/API/models | 8–14h | Explicit import of owning browser data, version/conflict handling, cross-device retrieval; R02/R04 |
| R16 | Multiple milestones per application | 8–14h | Separate exam/form/LOR/interview dates, timezone and source; edits do not overwrite unrelated milestones; R02 |
| R17 | Durable jobs, outbox and opted-in reminders | 8–14h | One delivery per key, bounded retries, unsubscribe/bounce support, timezone handling, dead-letter UI; R01/R16 |
| R18 | Improvement action and retry loop | 6–10h | Debrief offers one next action, retry linked to original, progress criteria understandable; R07/R11 |
| R19 | Session comparison | 6–10h | Compare same rubric/version or disclose change; no unsupported improvement percentage; enough repeated sessions |
| R20 | Public content conversion path | 5–8h | Guide/sample CTA preserves target through signup; no private data in URL; R03/R10 |
| R21 | Search deployment and webmaster checks | 4–7h | Crawl/status/canonical matrix, sitemap verification, owner-verified webmaster accounts; R03 |
| R22 | First six original content briefs/pages | 12–24h editorial | Unique value, source/rights review, internal links, relevant CTA; product claims match live state |
| R23 | CRA to Vite build migration | 8–14h | Unit tests/public prerender/route handling/env migration verified; no redesign; R03 routing tests |
| R24 | Application CSV import/export | 6–12h | Preview, validation, duplicates, date formats, partial-error reporting and ownership; R15/R16 |
| R25 | Question feedback/reporting | 4–7h | Flag specific question/feedback without exposing it publicly; review queue and resolution metrics; R10 |
| R26 | Source-change detection | 6–12h | Allowed official-source fetch, diff and reviewer queue; no automatic factual publication; R09 |
| R27 | Referral experiment | 5–9h | Reward after confirmed purchase/refund window, self-referral checks, capped credits and ledger; R12/R14 |
| R28 | Operational dashboard and owner digest | 6–12h | Authoritative finance/events, budget/backup/job exceptions, no résumé body; R10/R13/R17 |

## Conditional expansion

| ID | Experiment | Build only when | First bounded acceptance |
| --- | --- | --- | --- |
| R29 | Realtime voice | Turn-based friction causes observed abandonment/lost purchases | 10 consented sessions; interrupts/reconnect work; cost stays inside a separately priced allowance |
| R30 | Mixed-language practice | A reachable cohort needs it and a bilingual reviewer is available | Transcription and feedback reviewed across the actual language mix; no English-fluency penalty masquerading as readiness |
| R31 | Subject-specific academic practice | Two-year applicants repeatedly need factual subject rehearsal | Small reviewed subject set, source-grounded checking, explicit uncertainty |
| R32 | Mentor sharing | Users request review and a mentor workflow is demonstrated | Applicant-controlled, scoped, expiring/revocable report; no account-wide access |
| R33 | Coach/cohort product | Three independent partners will buy the same recurring workflow | Organisation roles, seat billing/consent, cross-tenant tests and useful cohort summary |
| R34 | Installable web app | Mobile return friction is measurable | Add-to-home experience and safe caching; never cache private transcripts across users |
| R35 | Public programme directory | Verified editorial coverage and freshness operations exist | Useful unique pages for reviewed records; stale/unknown data handled; no bulk thin pages |
| R36 | Essay feedback upgrade | Paying users request it and a distinct rubric can be evaluated | Source-grounded structure/authenticity feedback; no fabricated experiences or admission probability |
| R37 | MiM/international expansion | Current product remains profitable and discovery shows demand | Separate programme taxonomy, country/payment/privacy review and 10-person segment pilot |
| R38 | Job-interview product | Independent customer discovery supports a different business | Separate positioning/rubrics; no silent reuse of MBA advice as employment assessment |

Estimates for conditional expansion should follow a small technical/customer spike, not be invented now. Realtime, multilingual and organisation features can each become a multi-week project.

## Shared completion checklist

For each code ticket: scope named; no unrelated changes; secrets untouched; rollback plan for persistent changes; smallest relevant tests first; actual acceptance evidence; ownership/credit/privacy implications checked where applicable; documentation updated. Use existing tests as regression protection, but do not add tests that merely mirror low-impact styling implementation.

For each growth ticket: actual audience, permissions, budget, offer and stop condition recorded; materials reviewed; no automatic send/publish/spend inferred from a planning task. For each data/content ticket: authoritative source, applicable intake, rights and review date established.

## Copyable future assistant prompt

> Read `docs/future-roadmap/README.md`, the relevant chapter and ticket RXX in `06_IMPLEMENTATION_BACKLOG.md`. Inspect only the listed files and their necessary dependencies first. Confirm current implementation because the roadmap is a plan, not live state. Implement RXX without unrelated redesigns. Preserve existing uncommitted work. Do not read credentials or production settings, reset data, send outreach, purchase services, or deploy without my explicit instruction. Use a disposable environment and synthetic fixtures. Run the smallest meaningful checks against the ticket's acceptance criteria. Stop after three failed attempts on the same blocker and explain the exact unresolved issue. Finish with files changed, evidence, limitations and the next validation step.

Replace RXX with one ticket. Supply a screenshot/error/reproduction when available. Ask the assistant for a small reviewable diff, not “complete the entire roadmap”. Use inexpensive capable models for narrow tasks; reserve more capable reasoning for migration design, billing concurrency, auth review and conflicting evidence. The repository, acceptance criteria and test fixtures should carry the context rather than dependence on any one chat or model.

## Skills and resources to acquire by doing the work

| Learning block | Resource | Practice deliverable |
| --- | --- | --- |
| Python API structure | [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/) | Add one owned endpoint with validation/error handling |
| Transactions and ownership | [SQLAlchemy ORM documentation](https://docs.sqlalchemy.org/en/20/orm/) | Concurrent credit reservation test using PostgreSQL |
| Database migrations | [Alembic tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html) | Baseline → upgrade → verification on a disposable DB |
| PostgreSQL operations | [PostgreSQL backup documentation](https://www.postgresql.org/docs/current/backup.html) | Restore a synthetic database into an isolated target |
| Grounded model output | [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Validate a follow-up schema plus its semantic answer anchor |
| AI quality | [OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Ten annotated difficult cases before changing a prompt |
| Payments | [Razorpay standard integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) | Duplicate webhook/recovery tests in test mode |
| Public discoverability | [Google Search Essentials](https://developers.google.com/search/docs/essentials) | A verified public page with correct status/canonical/content |
| React tooling | [CRA transition guidance](https://react.dev/blog/2025/02/14/sunsetting-create-react-app) | Preserve current behaviour in a modern build pipeline |
| Customer discovery | Pilot script in this pack | Observe five applicants without coaching clicks; record objections verbatim |
| Unit economics | Local calculator and notebook | Replace assumptions with costs from ten real sessions and buyers |

Your Java/backend experience is useful for state machines, transactions, failure handling and contracts. Learn the Python-specific implementation while solving those concrete problems. No model-training course, expensive GPU, fine-tuning dataset or complex agent framework is a prerequisite to the first useful paid product.
