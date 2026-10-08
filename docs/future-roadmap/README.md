# Masters product and business roadmap

Prepared 8 October 2026 for Shivam. This is the execution plan for turning the current Indian MBA application workspace into a useful, sustainable interview-practice business. It covers the supported pilot, paid launch, infrastructure, acquisition, SEO, product expansion and eventual operation with limited founder time.

**Recommendation:** lead with résumé-based MBA interview practice, keep application organisation as the free supporting workspace, sell bounded practice packs, and use a managed PostgreSQL database with the existing Python backend. Grow through observed customer value and repeatable distribution before expanding the feature surface. Aim eventually for roughly 3–5 hours of routine founder work per week, with additional time for incidents and admission-season changes. That is a design objective, not a promise of passive income.

## Read this pack in this order

| Document | What it lets you do |
| --- | --- |
| [Product and pilot](01_PRODUCT_AND_PILOT.md) | Understand positioning, both applicant journeys, pilot scripts, success gates and features worth building |
| [Architecture and deployment](02_ARCHITECTURE_AND_DEPLOYMENT.md) | Choose hosts and database, migrate safely, configure environments and understand scale triggers |
| [Pricing and economics](03_PRICING_AND_ECONOMICS.md) | Set an initial offer, budget acquisition and calculate infrastructure coverage versus founder income |
| [SEO and growth](04_SEO_AND_GROWTH.md) | Publish discoverable content, recruit the first users and run bounded acquisition experiments |
| [Operations and automation](05_OPERATIONS_AND_AUTOMATION.md) | Operate billing, quality, support, privacy, content and incident handling as volume grows |
| [Implementation backlog](06_IMPLEMENTATION_BACKLOG.md) | Hand individual, scoped tasks to a future coding assistant or developer |
| [Sources and assumptions](SOURCES.md) | Recheck vendor prices, technical guidance and evidence boundaries |
| [Economics calculator](economics-calculator.html) | Change price, costs and buyer counts locally; nothing is uploaded |
| [Reproducible economics notebook](economics.ipynb) | Inspect and rerun the scenario calculations |

You can also open the [executed notebook as an HTML document](economics-notebook.html) without installing Jupyter.

This pack is the forward planning authority. Earlier `FEATURE_BACKLOG.md`, `PILOT_RUNBOOK.md` and `LAUNCH_AND_GROWTH_PLAN.md` remain historical context where they conflict with this plan. `INTERVIEW_SETUP.md` and `UI_CONSISTENCY_REVIEW.md` describe implemented behaviour and validation; planned features here are not shipped features.

## The decisions to make now

1. **Product promise:** “Practise MBA interviews that follow your résumé and what you actually say.” Test this wording with applicants; it is proposed positioning.
2. **First commercial use case:** a short mock interview producing two or three credible, answer-specific improvements. The tracker supports preparation and return visits.
3. **Audience:** support both two-year MBA and experienced-applicant programmes in one system, with one primary journey per user. Recruit approximately equal pilot groups; invest subsequent development where observed demand is strongest.
4. **First paid offer hypothesis:** ₹599 for five capped chat/turn-based voice sessions, valid for 90 days, with clear session limits and failure recovery. Validate willingness to pay; this is not a market-derived price.
5. **Infrastructure:** Cloudflare Pages for static delivery, Railway for FastAPI, Neon for managed PostgreSQL. Use Railway Hobby for the invited pilot if its then-current terms fit; budget Railway Pro for public paid operation. Optional object storage only when a feature genuinely needs durable files. [Hosting rationale](02_ARCHITECTURE_AND_DEPLOYMENT.md).
6. **Model strategy:** keep the current provider interface and benchmark the configured models first. Better prompts, grounding, evaluation and recovery have higher initial value than training a proprietary model.
7. **Brand:** Masters remains a working name. Check available domains and naming conflicts before paying for branding; one recognisable brand and canonical domain are enough.
8. **Budget:** choose a spending envelope from the economics document. No purchase, deployment, outreach or recurring job is authorised by the creation of this plan.

## What exists and what does not

| Area | Current evidence | Next consequence |
| --- | --- | --- |
| Workspace | React/FastAPI application tracking, essays, notes, readiness and admin surfaces | Narrow the default navigation to the applicant's next task; preserve advanced sections behind progressive disclosure |
| Interviews | Résumé review, selected profile excerpts, saved sessions, adaptive provider flow, local recording/playback | Live provider evaluation and physical-device testing still gate paid claims |
| Question bank | 95 questions, 22 openings, 77 links; specialist questions optional | Verify rights/provenance before commercial exposure; expand from observed gaps |
| Search foundations | Five public prerendered pages; metadata, crawl files, private-route exclusions | Real domain, deployment routing, webmaster verification and original content still needed |
| Database | SQLAlchemy supports SQLite/Postgres; migration helper is largely SQLite-specific | Introduce versioned PostgreSQL migrations before accepting important applicant data |
| Delivery | Local preview and tests | No validated production release, revenue, CAC, conversion or retention evidence yet |
| Billing | No orders, payment webhook or credit ledger found in the reviewed model/router scope | Build before self-service paid packs |
| Automation | Reminder preview/test endpoint and admin tooling | Durable scheduler, delivery tracking and reconciliation remain future work |

The newest UI review records an unresolved native-date application-save check. An older SEO note described a successful save against a mock backend. Use the newer, stricter unresolved status for release planning; do not treat the two checks as equivalent.

## Roadmap by evidence gate

Time ranges assume a solo founder learning while building. At 10 hours/week, two weeks is only 20 hours. Estimates below are planning ranges, not delivery promises; hands-on migration or model issues can extend them. Protect interview preparation through October rather than committing to an arbitrary launch date.

| Phase | Typical elapsed time at 10 h/week | Exit evidence | Spend posture |
| --- | --- | --- | --- |
| A: establish a deployable foundation | 3–5 weeks | HTTPS staging, PostgreSQL migrations/restore, working auth mail, ownership checks, controlled AI spend | Domain plus small paid infrastructure; no ads |
| B: supported product pilot | 3–4 weeks, partly overlaps A after safety gates | 10–20 observed users; helpful feedback demonstrated in both routes; physical voice checks | Capped AI testing and recruitment; founder led |
| C: paid beta | 3–5 weeks | Verified payments/credits/refunds, 10 independent buyers, real unit costs and support minutes | Small, pre-capped acquisition experiment |
| D: repeatable acquisition | 2–3 months after paid beta | One channel produces contribution-positive buyers in two mature cohorts | Reinvest a controlled share of contribution |
| E: operational leverage | 3–6 months after consistent sales | Automation handles routine work; exceptions visible; 4 weeks within founder-hours target | Pay for tools/contractors when time saved exceeds cost |
| F: selective expansion | 6–18+ months, demand dependent | Existing offering remains useful/profitable while new segment succeeds | Fund experiments from a separate capped budget |

A first paid launch is plausibly 10–16 weeks at this pace, with some overlap, and may take longer. At 20 focused hours/week it may compress; user recruitment and cohort observation still take elapsed time. Do not silently treat a 200-hour backlog as a one-month plan.

## The next ten working sessions

Use 90–120 minute blocks. These begin the foundation; they do not complete every release gate.

1. Read the architecture findings and create issue tickets R01–R06. Record the current repository state without overwriting existing changes.
2. Choose a working brand/domain shortlist and a 90-day cash envelope. Prepare deployment accounts and billing alerts; the account owner handles payment/KYC.
3. Fix public-origin auth links and verify the matching frontend routes in a disposable environment.
4. Establish an Alembic baseline and run an empty PostgreSQL migration with synthetic records.
5. Verify application/essay/interview ownership using two accounts under the intended runtime DB role.
6. Deploy private HTTPS staging and check exact public/private routing, health and logging.
7. Exercise one synthetic résumé through a real provider call; inspect every question premise, token use and failure state.
8. Test recording/playback/transcription on a physical phone and laptop. Keep chat available if voice fails.
9. Recruit three applicants for observed sessions using the approved-message templates. Send only when you choose the recipients.
10. Watch those sessions, fix the dominant blocker, and update the decision log. Do not add a feature simply to fill the development calendar.

## How this becomes a defensible product

The LLM alone is not a durable advantage. The potential advantage is the complete practice loop: accurate applicant context, well-timed follow-ups, actionable feedback, evidence of improvement, trusted programme context and convenient repeated practice. A distribution relationship with communities or mentors may be more valuable than a complicated model pipeline.

Build assets that accumulate: a licensed question taxonomy; a diverse, consented evaluation set; versioned rubrics; aggregate failure patterns; trusted content with editorial history; onboarding that requires little help; and a reliable billing/support operation. Keep private applicant records private. A growing pile of résumés is neither a justified training corpus nor a public content asset.

## What to postpone deliberately

- Realtime voice until turn-based voice demonstrably loses useful practice or conversion.
- A native mobile app until mobile web limitations are measured.
- General admissions counselling, scholarship matching and international expansion until the first paid use case works.
- A mentor marketplace until there is a proven supply/demand relationship; curated referrals are simpler.
- Admission probability scores, personality/emotion inference, fabricated school-panel personas and “successful essay” imitation.
- Kubernetes, microservices, a graph database and a dedicated vector database without a measured need.
- Mass-generated school pages, paid backlink packages, scraped outreach lists and automatic ad-budget expansion.

## Rules for future decisions

For every proposed addition, record: whose problem it solves, observed evidence, smallest experiment, cost/time cap, metric, stop condition and owner. A feature gets built when it improves useful practice, conversion, contribution, reliability or founder workload. Treat this plan as a sequence of bets with evidence gates, not an obligation to build everything listed.

Maintain a short monthly decision log: date, observation, decision, expected result, next review date. Recheck vendor pricing and admission facts at the point of use. Revisit this strategy after the first 10 buyers, 50 buyers, and each admission season.
