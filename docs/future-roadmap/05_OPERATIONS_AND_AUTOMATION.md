# Operating model automation and trust

[Roadmap index](README.md)

## 1. A realistic definition of autopilot

The goal is an application that serves routine customers, collects payments, delivers practice, handles predictable failures and tells you when attention is needed. Expect judgment to remain necessary for AI quality, admissions facts, complaints, unusual refunds, incidents and changes in the market. Automation reduces recurring effort after the process is understood; it does not establish product-market fit.

Stage the operating model:

1. **Supported pilot:** personally inspect each failure and a consented sample of sessions; perform daily checks.
2. **Paid beta:** automate cost limits, payment reconciliation, failed-operation visibility and support intake. Review exceptions daily.
3. **Steady operation:** automate routine reminders, retention jobs, reports and content-change detection. Sample quality weekly.
4. **Reduced founder workload:** a contracted support/content reviewer handles a documented scope; founder approves consequential changes and reviews business health.

Do not call the product unattended until four consecutive weeks meet the workload target without hiding unresolved customer issues or skipping quality checks.

## 2. Proposed automation register

These are future product/operations jobs. No recurring jobs have been created by this roadmap.

| Automation | Trigger and action | Safeguard and escalation |
| --- | --- | --- |
| Service health | Frequent lightweight API/DB checks; alert after repeated failure | Avoid an AI call per uptime probe; distinguish deploy maintenance; escalate persistent outage |
| AI budget control | Reserve cost before each operation, reconcile actual usage | Hard product allowance, concurrency ceiling, approved models; graceful “temporarily unavailable” state |
| Stuck sessions | Expired operation lease detected by worker | Mark recoverable/unknown outcome; do not blindly rebill or resend; surface ambiguous provider billing |
| Payment reconciliation | Daily comparison of captured/refunded payments with orders/credits | Idempotent correction for clear cases; discrepancies reviewed, every change audited |
| Notification delivery | Due opted-in reminder or lifecycle event | Unique send key, timezone, quiet hours, bounce/unsubscribe suppression; dead-letter after bounded retries |
| Programme freshness | Scheduled fetch/diff of allowed official sources | Queue proposed change for human approval; never auto-publish deadline/eligibility changes |
| Retention and deletion | Published retention deadline or verified deletion request | Legal/financial exceptions separated, scoped deletion manifest, retries/audit, no hidden content backups indefinitely |
| Backups | Managed recovery plus encrypted export policy | Alert on missed backup; isolated restore test; no backup secrets/content in notification |
| Dependency updates | Weekly advisory/patch check and CI branch | Tests/evals before merge; human approval for auth, billing, schema and provider changes |
| Quality regression | Before model/prompt release and periodic canary | Synthetic cases by default; no real-user training/inspection without appropriate permission |
| Support triage | Incoming ticket classified and linked to request ID | Draft replies from approved knowledge; no private-data disclosure, billing changes or invented commitments |
| Weekly owner digest | Counts, contribution, exceptions, hours and 3 proposed actions | Read-only summary; show data gaps; notify only actionable issues outside the scheduled review |

Every job has an owner, unique deduplication key, maximum attempts, backoff, timeout, lease, next-run time, last successful run and dead-letter state. Use a transactional outbox when a database change must cause an external side effect: write both in one transaction, then deliver asynchronously. A process-level scheduler in every web replica will duplicate work.

## 3. Minimum operations dashboard

Show five panels, not a wall of vanity metrics:

- **Customer impact:** failed paid sessions, authentication failures, unresolved critical tickets.
- **Money:** settled collections, refunds, outstanding credit allowance, provider spend, contribution estimate and budget headroom.
- **Product value:** completed live mocks, feedback viewed/action chosen, repeat practice, segmented by route and cohort age.
- **System health:** API error/latency, job age/failures, DB connections/storage, last backup and last restore test.
- **Owner work:** support minutes, content approvals waiting, review tasks and unresolved decisions.

Finance uses server records and provider reconciliation; analytics events alone cannot establish revenue. Do not expose applicant content on the default admin dashboard. A request ID and operation status should diagnose most issues without opening a résumé.

### Proposed events

`signup_completed`, `programme_selected`, `resume_extract_completed`, `profile_review_confirmed`, `interview_started`, `answer_saved`, `interview_completed`, `feedback_viewed`, `practice_action_saved`, `checkout_started`, `payment_captured`, `credit_released`, `refund_recorded`, `support_opened`.

Properties: schema version, event ID, timestamp, pseudonymous user/session/order ID where appropriate, route, mode, source/campaign, experiment assignment and outcome code. Never send names, email, résumé text, answer text, filenames containing names, API keys or free-form support messages to general analytics. Server events are authoritative for successful payments/completions. Deduplicate and distinguish test/admin/demo traffic.

## 4. Reliability and support policies

| Severity | Examples | Operating response |
| --- | --- | --- |
| Critical | Cross-account exposure, unrecoverable data loss, systemic duplicate charge | Pause affected capability, preserve minimal evidence, notify owner immediately; follow incident/legal advice where applicable |
| High | Paid sessions failing broadly, login/reset broken, payment captured without entitlement | Acknowledge within published support coverage, work before feature development; stop acquisition if customers cannot be served |
| Medium | Some device/mode fails with a usable fallback | Offer chat/local practice, restore eligible credit, prioritise based on affected count |
| Low | Cosmetic defect or enhancement | Batch into scheduled maintenance |

Publish a support address/form, hours and realistic response expectations. Do not offer 24/7 live support as a solo founder. Auto-acknowledge receipt without claiming the issue is resolved. Ask for browser, time and request ID; never request passwords or a full résumé when a redacted reproduction suffices.

### Incident runbook

1. Identify impact, affected capability/cohort and when it started.
2. Freeze unrelated deploys. Disable new paid starts or the affected model if necessary; preserve read/export access where safe.
3. Inspect redacted logs, release changes and provider status. Reproduce with synthetic data.
4. Decide rollback versus forward fix. Database changes must follow the migration recovery plan.
5. Reconcile credits/payments and notify affected users accurately through an approved process.
6. Verify the repaired journey from a fresh and returning account.
7. Record cause, duration, users affected, money impact and one prevention action. Do not publish personal incident evidence.

## 5. Privacy and retention design

Map each type of data to purpose, storage location, provider transfer, access, retention and deletion. Account deletion must address session copies of profile facts as well as the original résumé-derived set. Separate a product export from a complete account export; both need ownership checks.

| Data | Proposed policy to finalise before launch |
| --- | --- |
| Original résumé file | Preserve the current transient-extraction design; do not retain by default |
| Reviewed raw résumé text | Send only with explicit generation consent; avoid full-text persistence/logging |
| Selected profile excerpts | Private account data with provenance/version; user can replace/delete |
| Transcript/feedback | Private, exportable/deletable; propose 180 days after last activity with advance notice and an extension/export option |
| Local self-review audio | Current behaviour remains page-only and downloadable; no cloud recording promise |
| Optional future cloud audio | Separate opt-in, short default retention such as 30 days, private bucket and expiring access; do not enable until required |
| Operational logs | Redacted, short retention such as 30 days; security/legal exceptions documented |
| Analytics | Minimal event fields; raw-event retention such as 90 days, longer aggregate trends |
| Billing evidence | Retain only what applicable accounting/payment obligations require; separate it from interview content |
| Backups | Time-limited encrypted retention; deletion may age out of backups rather than immediate granular removal; explain actual behaviour |

These periods are proposed product defaults, not claims that they are implemented or legally sufficient. Obtain an Indian privacy/accounting review of notices, consent, children, grievance process, processor contracts, cross-border handling, breach response and retention obligations. Use current official DPDP material and commencement provisions when doing that review; this plan does not determine legal applicability. [MeitY framework entry](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit)

For the initial pilot, choose an 18+ policy and a proportionate age attestation, not collection of identity documents. Do not advertise India-only data storage with overseas services. Review provider data controls: `store:false` for Responses does not mean every provider retention mechanism is disabled; endpoint/account controls matter. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

No training on customer résumés/answers by default. Any future voluntary research/evaluation programme needs a separate, revocable permission process and appropriate de-identification. Normal product consent is not permission to publish a testimonial, share an interview with a coach, or build a public success-story dataset.

## 6. Content rights and trust

Audit question provenance before commercial launch. Some material was drawn from private interview-preparation handbooks; access to a handbook does not establish commercial reuse rights. Catalogue each item as original, licensed, permission granted, public fact/reference, or uncertain. Remove/rewrite through independent editorial work or obtain permission where rights are unresolved; superficial paraphrasing is not a universal rights clearance.

Keep original editorial questions distinguishable from applicant-reported experiences and school-published guidance. Never claim a question is an official school question or an actual admissions criterion without a reliable source. Record corrections and remove misleading content promptly. Testimonials require consent, truthful attribution and a clear description of what the user experienced.

## 7. Security and abuse controls

Before accepting real records, verify ownership across list/detail/edit/delete/export endpoints, admin role boundaries, secure token lifecycle, no debug tokens, safe error messages, file-size/type limits and parser isolation. Treat résumé/answer text as untrusted model input; it cannot grant tools, change system instructions or access other users' records.

Use parameterised queries, restricted database roles and provider secrets held only by the backend. Add appropriate CSP/security headers, safe rendering of generated text and upload parsing limits. Avoid rendering model HTML directly. Scrub prompts/tokens from logs and crash tools. Rate-limit login, reset, upload, generation, speech and export independently, with a global spending ceiling.

Before adding sharing, build unguessable scoped links with expiry/revocation, explicit consent and noindex, plus a real authorisation model. Before adding organisations, add tenant boundaries and tests; a UI filter is not isolation. A penetration/security review should focus on the actual deployed auth, uploads, ownership, billing and admin surfaces rather than producing a generic badge.

## 8. Founder cadence and hiring triggers

### Supported pilot

Allow daily support/quality checks and 2–3 observed sessions per week. This stage will not run on autopilot. Keep a small cohort so learning does not overwhelm interview preparation or development.

### Stable operation target

- 15 minutes each weekday for support/alerts: 75 minutes.
- 45 minutes weekly for AI quality sample and regression exceptions.
- 30 minutes for programme/content approvals.
- 45 minutes for growth and customer learning.
- 20 minutes for finances/credit reconciliation.
- 20 minutes for dependency, backup and operations review.

Total roughly **235 minutes/week**, excluding development, major incidents, seasonal updates and professional reviews. The target depends on measured ticket volume; do not assume it at 250 buyers because a spreadsheet keeps founder hours constant.

Hire a limited-scope reviewer/support contractor when repetitive support/content work exceeds roughly three hours/week for four weeks and contribution can pay for it. Give least-privilege access, a reviewed knowledge base, confidentiality terms and escalation rules. Hire engineering help for a bounded security/migration bottleneck before commissioning a redesign.

## 9. Scale and stop decisions

Increase capacity when measured queue/latency/DB limits threaten the user promise. Increase acquisition only when unit contribution and support capacity remain healthy. Add a partner dashboard only when repeat partner revenue can justify tenant/support complexity.

Pause new paid starts when reliable fulfilment is in doubt. Pause a channel when mature CAC exceeds available contribution. Pause a feature when its support cost overwhelms usage. If founder hours remain high despite routine automation, either simplify the product, raise prices, buy help or limit growth. Serving fewer customers well can be a better side business than operating an unprofitable broad platform.
