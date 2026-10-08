# Sources assumptions and validation record

[Roadmap index](README.md)

## Evidence boundary

Prepared 8 October 2026 from the user's goals, the current local source and primary vendor documentation. This is a planning pack, not a report of an operating business. No live customer metrics, payment history, production capacity benchmark or market-search-volume dataset was supplied. Revenue, conversion, CAC, budget, timelines and staffing figures are explicitly proposed assumptions/scenarios.

No deployment, database migration, provider purchase, outreach or recurring automation was performed. Application code was inspected read-only. Credentials, original environment files and production settings were not accessed. Local roadmap files and mathematical companions are the deliverables.

## Current implementation sources

| Local source | What it establishes |
| --- | --- |
| [Interview setup](../INTERVIEW_SETUP.md), [UI review](../UI_CONSISTENCY_REVIEW.md) | Current feature behaviour, recent checks and unverified live/device paths |
| [Main API](../../backend/main.py), [DB helper](../../backend/database.py), [migration helper](../../backend/services/migrations.py), [migration script](../../scripts/db_migrate.py) | Startup DDL, SQLAlchemy connectivity and dialect/security migration design |
| [Models](../../backend/models.py), backend router/function inventory | Implemented persistence domains and absence of a reviewed billing domain |
| [Auth email service](../../backend/services/auth_flows.py), [AuthContext](../../frontend/src/contexts/AuthContext.js) | Localhost mail URLs and browser token persistence |
| [Catalogue service](../../backend/services/program_catalog.py), [rate limiter](../../backend/services/rate_limit.py), [reminder router](../../backend/routers/reminder_routes.py) | Mutable JSON catalogue, memory throttling and preview/test reminder actions |
| [Interview provider](../../backend/services/interview_provider.py), [operation service](../../backend/services/interviews.py) | Model defaults, count quotas, operation metadata, leases and idempotency |
| [Frontend package](../../frontend/package.json), [frontend Dockerfile](../../frontend/Dockerfile), [backend requirements](../../backend/requirements.txt) | Toolchain/dependency baseline requiring production review |
| [SEO implementation](../SEO_IMPLEMENTATION.md), [earlier launch plan](../LAUNCH_AND_GROWTH_PLAN.md) | Existing public rendering and previous product plan; current pack supersedes forward priorities |

The newer UI review's unresolved real-backend date-save check takes precedence over the older mock-backed onboarding success note. No additional application test run is claimed for this planning turn.

## Primary external references

Sources were accessed during this planning pass unless marked as a learning pointer. Vendor rates and rules can change; recheck at purchase/release. Small quoted rate figures are used as model inputs; the recommendations and scenarios are our own analysis.

| Reference | Use |
| --- | --- |
| [Railway pricing](https://railway.com/pricing) | Plan minimums and metered hosting comparison |
| [Railway cost controls](https://docs.railway.com/pricing/cost-control) | Budget/availability trade-off |
| [Railway regions](https://docs.railway.com/deployments/regions) | Singapore option; does not establish Neon region availability |
| [Neon pricing](https://neon.com/pricing) | Compute/storage/restore costs; current public Markdown fetched directly because the web reader rejected its content type |
| [Supabase pricing](https://supabase.com/pricing) | Alternative managed DB package; free/paid recovery distinctions |
| [Supabase inactivity policy](https://supabase.com/docs/guides/platform/free-project-pausing) | Free-tier operational caveat |
| [Render pricing](https://render.com/pricing) | Alternative host; exact current compute quote could not be established from the exposed table, so no precise rate is asserted |
| [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/) | Static versus function billing |
| [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Optional later object-storage evaluation; operations and retention still need budgeting |
| [Vercel Hobby policy](https://vercel.com/docs/plans/hobby) | Commercial-use limitation |
| [Resend pricing](https://resend.com/pricing) | Transactional email allowance and upgrade considerations |
| [React CRA announcement](https://react.dev/blog/2025/02/14/sunsetting-create-react-app) | Maintained-toolchain migration rationale |
| [OpenAI text model](https://developers.openai.com/api/docs/models/gpt-4.1-mini) | Text price input |
| [OpenAI pricing](https://developers.openai.com/api/docs/pricing) | Current transcription rate input |
| [OpenAI speech model](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts) | Text/audio token rate input; no fixed minute conversion assumed |
| [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) | Endpoint/account-specific retention caveat |
| [Razorpay pricing](https://razorpay.com/pricing/), [explanation](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/) | Standard domestic fee assumption; promotional terms are excluded from the model |
| [Razorpay integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) | Server orders and verified payment workflow |
| [Google AI Search](https://developers.google.com/search/docs/appearance/ai-features) | Search foundations and no guaranteed AI inclusion |
| [Google spam policy](https://developers.google.com/search/docs/essentials/spam-policies) | Avoid scaled low-value publishing |
| [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) | Performance targets and measurement distinction |
| [OpenAI crawlers](https://developers.openai.com/api/docs/bots) | Separate search/training controls |
| [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) | Search/user/training distinctions |
| [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) | Google-Extended scope |
| [IndexNow](https://www.indexnow.org/documentation) | Participating-engine URL change notification |
| [Microsoft AI reporting explanation](https://about.ads.microsoft.com/en/blog/post/march-2026/the-ai-performance-dashboard-your-view-into-where-your-brand-appears-across-the-ai-web) | Directional citation reporting; not all-assistant coverage |
| [MeitY DPDP entry](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit) | Starting point for professional applicability review; full legal provisions were not analysed here |

Technical learning links in the backlog are reference pointers, not claims of completion or endorsements of paid courses. No paid course is required by this plan.

## Economics methodology

`economics.py` is the canonical calculation. `economics.ipynb` imports it, records all assumptions and displays scenarios. `economics-calculator.html` independently implements the same formulas for convenient local exploration. The base calculation reserves the complete included session allowance rather than counting unused credits as free margin. It has no customer data or network calls.

The 18% sales-tax scenario, ₹90/USD conversion, refund allowance, buyer counts, support provision, CAC and founder hourly value are assumptions. The actual legal/tax position and realised conversion must be established separately. Cash settlement timing, input-tax credits, chargebacks, corporate tax, capital expenditure and working-capital timing are not a full accounting forecast; treat the result as conservative operating planning with a fulfilment reserve.

## Planning decisions to revisit

- Brand/domain and acceptable 90-day cash envelope.
- Hosted region pair and actual latency from India.
- Auth hardening versus deliberate managed-auth migration.
- Programme/content rights and editorial reviewer.
- Actual session cost and feedback quality under the configured model.
- Willingness to pay for the proposed pack, by route and timing.
- Ability to support the business alongside an MBA/job.
- Professional review of tax, privacy, refunds and processor agreements.

The next recommended validation is the foundation release gate followed by the supported 10-person pilot. More detailed revenue projections would be less useful than replacing the largest assumptions with those observations.

## Deliverable validation on 8 October 2026

- All local Markdown file links in this roadmap pack resolve. The pack contains 38 distinct implementation ticket IDs.
- The standard-library calculator passed five boundary/reconciliation checks. The executed notebook also reconciles the published INR 233.26 contribution, 22-pack break-even and 129-pack income-target scenarios.
- All four notebook code cells executed and were retained with outputs; notebook schema validation passed. The plot was visually inspected. The local sandbox emitted font-cache and kernel-shutdown process-inspection warnings after computation; no notebook cell failed.
- The independent browser calculator displayed the same base values, correctly handled INR 400 acquisition cost as unviable, showed INR -5,000 at zero buyers, cleared stale results for empty input, and restored the base case on reset.
- Calculator layout was inspected at desktop and 390px phone width; the phone document had no horizontal overflow. This is responsive browser validation, not a physical-device test.
- `git diff --check` passed. Application code, credentials and deployed settings were not changed for this roadmap task. No new application test or live-provider validation is implied by these document checks.
