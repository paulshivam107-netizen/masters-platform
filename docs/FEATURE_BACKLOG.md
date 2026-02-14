# Feature Backlog (Pilot to Post-Pilot)

## Build Now (Feasible This Week)

1. Essay assist from student skeleton points
- Status: Added backend API (`POST /essays/assist/outline`)
- Value: Gives structure help without full ghostwriting.
- Effort: Small (done).

2. Program data starter catalog (manual import)
- Scope: Seed top 20-50 schools/programs with deadlines/fees/source URL.
- Status: Starter backend catalog endpoint added with seed entries (`GET /programs`, `GET /programs/{id}`).
- Value: Reduces manual user entry immediately.
- Effort: Small to medium.

3. Application autofill from program catalog
- Scope: When selecting a known school/program, prefill fee/deadline fields.
- Status: Added tracker catalog selector + autofill wiring in UI.
- Value: Fast UX win and fewer data entry errors.
- Effort: Medium.

4. Source + freshness badge on school/program data
- Scope: Show `source_url` + `last_updated_at` in tracker form.
- Status: Added source/freshness metadata display in tracker form and cards when catalog match exists.
- Value: Trust and transparency for pilot users.
- Effort: Small.

## Must-Have Before Larger External Pilot

1. AI provider abstraction (OpenAI + Anthropic adapters)
- Value: Switch providers with env vars; avoids lock-in.
- Effort: Medium.

2. Quotas and billing guardrails for AI actions
- Scope: Per-user monthly review caps + admin visibility.
- Value: Prevents runaway costs.
- Effort: Medium.

3. Program data review queue
- Scope: Ingest changes into pending state; admin approves publish.
- Value: Avoids bad scraped data reaching users.
- Effort: Medium to large.

4. Explicit migration command for pilot/prod deploys
- Value: Safer schema change rollout.
- Effort: Medium.

## Post-Pilot (Phase 2)

1. Essay generation flow (opt-in)
- Scope: User provides skeleton + constraints; app generates first draft.
- Guardrail: Keep warning banner and user-attestation before export.
- Effort: Medium to large.

2. Automated school/program ingestion pipelines
- Scope: Scheduled fetchers, diffing, normalization, confidence score.
- Effort: Large.

3. Financial aid/scholarship dataset and recommendation surface
- Effort: Large.

4. Personalized strategy assistant (timeline + school mix suggestions)
- Effort: Large.
