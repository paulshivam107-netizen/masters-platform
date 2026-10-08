# Pricing budgets and unit economics

[Roadmap index](README.md) · [Interactive calculator](economics-calculator.html) · [Python calculation](economics.py) · [Notebook](economics.ipynb)

## 1. Initial commercial offer

Keep the tracker, public resources and local recording/playback free. Offer one small, verified-account AI trial when budget allows. Make the paid product a **₹599 five-session practice pack with 90-day validity**, as an initial price hypothesis. Default to five questions, allow the existing bounded lengths, and cap audio/time/output usage explicitly. Show all limits before purchase and again before starting.

This price is chosen to create a testable offer with room for costs, not because buyer research has established it. Offer the first supported pilot free; then ask 10 independent applicants to buy a real, working product. A founder discount can be explicit and time-bounded, but record the actual realised price and never manufacture urgency.

Start with one paid SKU. Add a ₹999/₹1,199 larger pack or a higher-priced human review only after repeat demand and cost evidence. Do not promise lifetime AI, unlimited interviews, guaranteed admissions or an annual subscription to a seasonal need. A text-only lower-price option is a later experiment if price objections and voice costs justify it.

Define a usable session, interruption recovery, credit expiry, refund policy and service failure before taking payment. A customer credit should be restored for a proven service failure; provider charges incurred during a failed operation still belong in internal costs.

## 2. Hosting and setup budgets

Dollar-to-rupee conversion below uses **₹90/USD as a planning assumption**, not a live exchange-rate claim. Add taxes, card FX charges and quote differences at purchase. The MacBook Air is sufficient for app development; no GPU hardware or rented training instance is required for this API-based design.

| Stage | Monthly infrastructure planning range | What changes |
| --- | --- | --- |
| Disposable development | ₹0–₹1,500 excluding coding subscriptions | Local app, synthetic data, small AI evaluation allowance |
| Supported pilot | $15–$45, about ₹1,350–₹4,050 before taxes | Small API, paid/controlled managed PostgreSQL, domain amortisation; email/monitoring free allowances where adequate |
| Public paid beta | $35–$80, about ₹3,150–₹7,200 before taxes | Production plan floor, recoverable database, possible paid email/monitoring, backups |
| Larger operation | Set from measured workloads | Worker capacity, database, media, email, monitoring and support can step up; registered-user count alone does not price this |

AI inference, payment fees, acquisition and founder time are additional. The model's ₹4,000 fixed overhead is a lean base case; test ₹8,000–₹12,000 as a tooling/worker/paid-email stress case. Price checks: [Railway](https://railway.com/pricing), [Neon](https://neon.com/pricing), [Supabase alternative](https://supabase.com/pricing), [Resend](https://resend.com/pricing).

### Proposed 90-day cash envelopes

These are spending ceilings to select, not money to spend immediately. Unused acquisition money stays unspent if product gates fail. Legal/accounting and contractor numbers are allowances to obtain quotes against.

| Category | Lean discovery | Recommended controlled beta | Faster assisted beta |
| --- | ---: | ---: | ---: |
| Domain/basic assets | ₹1,500 | ₹2,000 | ₹3,000 |
| Infrastructure for 3 months | ₹6,000 | ₹12,000 | ₹18,000 |
| AI evaluation/free trials | ₹2,000 | ₹4,000 | ₹6,000 |
| Capped acquisition experiments | ₹1,500 | ₹5,000 | ₹10,000 |
| Expert/accounting/privacy review allowance | ₹2,000 | ₹7,000 | ₹12,000 |
| Contingency | ₹2,000 | ₹5,000 | ₹11,000 |
| **Total ceiling** | **₹15,000** | **₹35,000** | **₹60,000** |

The lean envelope buys discovery, not a guaranteed production launch. If professional review or safe hosting costs more than the remaining allowance, reduce scope, delay charging or revise the envelope. Coding subscriptions, founder living expenses and major contract development are excluded. Keep three months of operating cash plus an unredeemed-credit/refund reserve separate from personal withdrawals.

## 3. AI cost calculation

The current source defaults to `gpt-4.1-mini` for text, `gpt-transcribe` for transcription and `gpt-4o-mini-tts` for speech. Verify model availability in the actual project before enabling it. Pricing is checked against the current official pages; do not assume a future replacement has the same economics.

| Component | Published rate used | Illustrative session workload | Calculated USD |
| --- | --- | --- | ---: |
| Questions and feedback text | $0.40/M input and $1.60/M output tokens | 30,000 aggregate input, 3,000 output over all calls | $0.0168 |
| Transcription | `gpt-transcribe` estimated $0.0045/minute | 12 candidate audio minutes | $0.0540 |
| Speech | $0.60/M text input and $12/M audio output tokens | 1,000 input and 10,000 audio output tokens | $0.1206 |
| **Total** | | Workload assumptions, not measured usage | **$0.1914** |

Sources: [text model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [transcription pricing](https://developers.openai.com/api/docs/pricing), [speech model](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts). Audio-token workload is an assumption, not a claimed fixed tokens-per-minute conversion. Text input is the aggregate across requests, including repeated context. Cached-input discounts are not assumed.

At ₹90/USD with a 25% buffer this example is **₹21.53/session**. Use **₹25 per included session** as the initial fulfilment reserve, including a share of résumé generation, retries and overhead. This is a budgeting placeholder; replace it with measured p50/p95 and worst permitted-session cost before finalising a paid allowance. Live realtime voice needs a separate cost model and cap.

Implement measured cost per operation: text tokens, speech tokens where exposed, audio duration, model/version, effective price version, retries and unknown billing outcomes. Reserve conservative cost before dispatch, reconcile after completion, and cap ongoing sessions predictably. Provider dashboard alerts alone are insufficient to enforce your product's budget.

## 4. Per-pack calculation

Base assumptions: ₹599 customer price; 18% sales-tax-inclusive scenario; 3% refund allowance; 2.36% gateway fee on gross collections; 5 × ₹25 full-session reserve; ₹20 external support/tool provision; ₹100 acquisition cost per pack.

**The 18% sales-tax scenario is not a determination of your registration requirement or service classification.** Confirm actual tax, invoicing, refunds and business setup with an Indian accountant. Do not confuse GST on the gateway's fee with tax on your own sale. The gateway base assumption uses standard domestic pricing and excludes temporary promotions and premium payment-method rates. [Razorpay pricing](https://razorpay.com/pricing/), [fee explanation](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)

```text
net sales after refund allowance = price × (1 − refund rate) ÷ (1 + applicable sales tax)
gateway cost = gross price × gateway rate
full fulfilment reserve = included sessions × reserved cost per session
contribution before acquisition = net sales − gateway − fulfilment reserve − support provision
contribution after acquisition = contribution before acquisition − acquisition cost
monthly planning surplus = paid packs × contribution − fixed overhead − free-trial budget
break-even packs = ceiling((fixed overhead + free-trial budget) / positive contribution)
```

Base result: net sales ₹492.40; gateway ₹14.14; fulfilment ₹125; support ₹20; contribution before acquisition **₹333.26**, after ₹100 acquisition **₹233.26**. Gateway charges are conservatively retained on refunded purchases and full allowance is reserved even if not all sessions are used. Actual settlement/refund contracts may differ.

## 5. What income could require

All rows are scenarios with **one pack per buyer in the month**, ₹4,000 fixed overhead and ₹1,000 free-trial budget. They are not forecasts, measured conversion rates or accounting statements. Surplus reserves the whole pack's future fulfilment; it excludes income tax and one-time setup spending.

| Monthly pack buyers | Gross collections | Planning surplus before founder time | After valuing 20 founder hours at ₹750/hour |
| --- | ---: | ---: | ---: |
| 10 | ₹5,990 | −₹2,667 | −₹17,667 |
| 25 | ₹14,975 | ₹832 | −₹14,168 |
| 50 | ₹29,950 | ₹6,663 | −₹8,337 |
| 100 | ₹59,900 | ₹18,326 | ₹3,326 |
| 250 | ₹1,49,750 | ₹53,315 | ₹38,315 |

Base break-even is **22 packs/month**. A ₹25,000 monthly surplus before founder time/income tax requires **129 packs/month** under these assumptions. The 250-buyer row keeps the same overhead/hours to isolate volume; it does not prove those costs remain flat. Increase them when support, email or capacity steps up. If you personally provide the support represented by the ₹20 provision, avoid double-counting: replace that cash provision with measured founder hours.

### Acquisition sensitivity

| Acquisition cost per pack | Contribution per pack | Break-even packs | Packs for ₹25,000 target |
| --- | ---: | ---: | ---: |
| ₹0 | ₹333.26 | 16 | 91 |
| ₹100 | ₹233.26 | 22 | 129 |
| ₹250 | ₹83.26 | 61 | 361 |
| ₹400 | −₹66.74 | No positive break-even | Raising volume increases losses |

₹0 cash acquisition does not mean founder outreach/content is free; account for its hours. Do not forecast repeat purchases or multi-year lifetime value without observing them. For seasonal admission preparation, seek first-pack payback.

## 6. Free usage and advertising limits

Keep local self-review and static resources free: they do not require inference. A proposed AI trial budget of ₹1,000/month might fund 200 trials at ₹5 each; this is an illustrative allocation, not verified trial cost. If demand exceeds the allowance, offer local practice and a transparent waitlist or paid pack. Never let one viral post create unlimited provider liability.

Require verified accounts for subsidised inference, enforce per-account and global allowances server-side, limit concurrent sessions, and watch legitimate-user impact before adding intrusive friction. A new account should not receive an unbounded resettable monthly trial.

Maximum affordable click cost is contribution available for acquisition × visitor-to-paid conversion. At a target ₹100 CAC and 2% conversion, the allowable average CPC is only **₹2**. At ₹10 CPC and 2% conversion, CAC is **₹500**, which loses money in the base pack model. Conversion and CPC are illustrative; measure them. This is why community/partner distribution should precede broad paid search.

Use channel-specific CAC from actual spend and attributed first-time buyers over a mature conversion window. Do not count organic buyers against ad spend to make paid CAC look lower. A blended figure may be shown separately. Include discounts, referral rewards and creative/contractor costs; avoid subtracting the same acquisition budget again as fixed overhead in the calculator.

## 7. Payment implementation requirements

Create server-priced orders in integer paise, launch hosted checkout, verify the order/payment/signature server-side and process signed webhooks idempotently. Browser redirects alone never grant credits. Handle capture, delayed confirmation, duplicate/out-of-order events, refunds and disputes. Keep a unique provider-event ID and a durable transaction audit trail. [Razorpay integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)

Use append-only credit events: grant, reserve, consume, release, expire, refund adjustment. Reserve once when a live session begins, finalise on a defined delivered outcome, and release on a provable service failure. Retried AI operations must not consume a second customer session. Record ambiguous provider outcomes for reconciliation. Finance reconciliation runs daily; discrepancies go to a human queue.

Before public payment: finish KYC, owner-approved terms/refund rules, invoices/receipts, support contact, test-to-live separation and an actual small-value payment/refund drill performed by the owner. Do not collect card details yourself. Do not add automatic renewals until there is a customer need and a clear cancellation workflow.

## 8. Pricing review cadence

After 10 buyers: inspect objections, refunds, support and full-session cost. After 50: compare routes and acquisition sources with counts. After two mature cohorts: consider one price/pack experiment. Keep existing purchases' promised credits and validity intact when prices change. Review monthly during the season and before model/provider changes.

Withdraw income only after actual settled cash, tax/refund provision, unredeemed credit reserve and operating runway are covered. An unused prepaid session is an obligation to serve the customer, not an invitation to spend the entire balance.
