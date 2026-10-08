# Search visibility acquisition and growth plan

[Roadmap index](README.md)

## 1. What search can and cannot deliver

Build a useful public website that search engines can retrieve and people choose to use. Neither a sitemap nor crawler permission guarantees indexing, rankings or a mention in ChatGPT, Claude or Gemini. Answers produced without web retrieval are outside the site's direct control. There is no universal submission switch that makes all AI assistants recommend a business.

Google's guidance says its AI Search features use the same core SEO requirements; special AI text files or schema are not required. Prioritise original, understandable, accessible content and accurate claims. [Google AI guidance](https://developers.google.com/search/docs/appearance/ai-features)

For this product, search should bring people to a relevant task: understand a preparation method, try an original question sequence, organise an application, or start a sample interview. A visitor who downloads a useful worksheet can be valuable before they create an account. Measure eventual useful practice and paid contribution alongside traffic.

## 2. Positioning and conversion surfaces

### Proposed homepage structure

1. Plain headline about résumé-based MBA interview practice.
2. One sentence explaining adaptive follow-ups and feedback, with no admissions promise.
3. Primary CTA “Try a sample interview”; secondary “Use my résumé”.
4. Short fictional demonstration with a transcript available as text.
5. Two audience cards: two-year MBA and experienced applicants, with concrete differences.
6. Three-step process and what the user receives.
7. Clear price/session limits when paid launch is ready.
8. Privacy summary explaining provider transmission and storage.
9. Genuine pilot evidence/testimonials only with permission; no fabricated ratings or institutional logos implying endorsement.
10. Helpful guide links, limitations, contact and frequently asked questions.

Landing pages must match the deployed mode. A keyless demo is not a live AI assessment. If voice is unavailable or experimental, state that before the CTA rather than burying it in help.

## 3. Technical SEO implementation sequence

The existing source already includes public prerendering and metadata. Retain `frontend/src/seo/*`, shared content and `frontend/scripts/prerender.cjs` behaviour through deployment/build changes. This section describes remaining launch work, not a second SEO rewrite.

### Before publishing

- Choose one canonical HTTPS origin and a stable brand. Configure the existing site URL/name/indexing build variables only for production.
- Preserve existing guide URLs. If any path changes, map each old URL to its closest replacement with a permanent redirect; do not redirect everything to the homepage.
- Serve each public page's generated HTML. Verify title, description, canonical, one main heading, text, links and visible content without JavaScript.
- Serve `/app/*` and `/auth` through the private shell with noindex headers. Authentication and ownership controls protect private data; robots rules do not.
- Serve a genuine 404 for missing pages/assets. Test GET and HEAD, root/trailing-slash variants and preview hostname behaviour.
- Keep preview/staging protected and excluded. A robots disallow alone does not guarantee removal of an already indexed URL; follow engine removal/noindex guidance if that situation occurs.
- Sitemap contains only canonical, public, indexable URLs returning success. Use actual editorial modification dates, not the build timestamp for every article.
- JSON-LD describes visible facts: organisation/site, article, breadcrumbs and software where suitable. No invented reviews, admissions ratings, unsupported prices or hidden FAQ claims.
- Check social preview images, favicon, contact/about page and brand consistency.
- Make the legal/privacy/contact pages easy to find; they are trust content, not keyword landing pages.

### Performance and accessibility

Use responsive images with dimensions, compressed assets, lazy loading below the fold, sensible font loading and deferred nonessential scripts. Avoid autoplaying promotional video, animation that shifts content, or a large chat widget on every page. Keep reduced-motion support and keyboard focus visible.

Target good Core Web Vitals: LCP around ≤2.5s, INP ≤200ms and CLS ≤0.1, evaluated using real-user data when sufficient traffic exists. Lighthouse/lab tests help diagnose but do not prove field performance. [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)

### At launch

1. Verify the domain in Google Search Console and Bing Webmaster Tools using an owner-controlled DNS/verification process.
2. Submit the canonical sitemap and inspect the homepage plus two representative guides.
3. Test actual crawler access through CDN/security rules. Verify bots using vendor guidance rather than trusting a spoofable user-agent string; allow public content without weakening private API security.
4. Record submission date, inspected URL, fetched status and indexing outcome. A successful sitemap submission is not proof of indexing.
5. Check the deployed pages on a real phone over mobile data, including CTA-to-signup-to-practice continuity.
6. After crawl activity appears, review exclusions, duplicate canonicals, indexing errors and query impressions weekly. Avoid repeated resubmission of unchanged pages.

### AI retrieval controls

| Service | Intended public-content policy | Important distinction |
| --- | --- | --- |
| Google/Bing | Permit verified public crawls | Private routes remain protected; content quality and eligibility still matter |
| OpenAI | Allow OAI-SearchBot; keep GPTBot training choice separate | Search discovery and training are independently controlled. ChatGPT-User is user-directed retrieval, not the search indexing control. [OpenAI bots](https://developers.openai.com/api/docs/bots) |
| Anthropic | Allow Claude-SearchBot and Claude-User; separately choose ClaudeBot training policy | Review documented robots behaviour and retrieval scope. [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Gemini-related uses | Review Google-Extended deliberately | It covers specified training and grounding uses, and does not control ordinary Google Search inclusion/ranking. [Google crawler control](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |

The current site policy allows search retrieval while excluding some training crawlers. Preserve the explicit Google-Extended trade-off in the release decision. Do not promise that robots directives cover every user-initiated fetch. Never put applicant résumés, transcripts or private exports in indexable paths.

`llms.txt` may be a small optional public-content index later, but it is not an access-control mechanism or ranking guarantee. IndexNow can notify participating engines of changed public URLs; implement domain verification and actual change-driven submission after launch, without claiming Google coverage. [IndexNow](https://www.indexnow.org/documentation)

## 4. Content roadmap

Search themes below are hypotheses, not measured search volumes. Validate with applicant wording, Search Console queries and a small manual review of current results. Keep substantive content in public HTML, with direct answers near headings and supporting examples/tables. This helps readers and retrievers without writing for an imaginary algorithm.

| Priority | Topic and proposed path | Original value | Next action |
| --- | --- | --- | --- |
| Existing | `/guides/mba-application-checklist-india` | Distinguishes exam, school application and supporting work; useful template | Add a target programme |
| Existing | `/guides/mba-interview-story-bank` | Reflection worksheet and a practical method | Record one answer |
| 1 | `/mba-interview-practice` | Product demonstration, limits, privacy and clear price | Try a fictional sample |
| 1 | `/guides/mba-interview-from-resume` | Original example showing three levels of follow-up from one claim | Use a reviewed résumé |
| 1 | `/guides/mba-interview-for-freshers` | Examples across coursework, clubs, internships and family responsibility | Choose two-year practice |
| 1 | `/guides/mba-interview-work-experience` | Explain ownership, alternatives and outcomes with fictional examples | Choose experienced practice |
| 2 | `/guides/review-your-mock-interview` | A replay checklist and annotated fictional transcript | Record and review |
| 2 | `/guides/mba-interview-why-now` | Reflection questions for distinct career stages, without canned answers | Start motivation practice |
| 2 | `/guides/mba-application-deadlines` | Explain milestones, source checks and timezones rather than unverified dates | Track milestones once available |
| 2 | `/guides/ai-vs-human-mba-mock` | Honest comparison and limitations; where a mentor adds value | Choose an appropriate practice mode |
| Later | Verified programme pages | Exact programme/intake/round sources with review date and correction history | Save the correct target |
| Later | Transparent evaluation/methodology page | How grounding and feedback are tested, including limitations | Understand and report an issue |

The first six new pages should earn their existence through distinct questions. Do not create 100 near-identical pages by swapping school/city names. Google identifies scaled content made primarily to manipulate rankings as spam, whether generated automatically or otherwise. [Spam policy](https://developers.google.com/search/docs/essentials/spam-policies)

### Editorial brief template

- Reader, programme type and stage.
- Specific question and intent; proposed title/path; existing page it might duplicate.
- Direct opening answer, three to five useful sections, original example/tool and one relevant CTA.
- Claims needing official programme sources; date/intake/round; source owner and review deadline.
- Author/reviewer identity described accurately; no invented credentials.
- Rights status for question/example/image; no raw handbook copying.
- Internal links: parent guide, related next step, relevant product surface.
- Accessible image alt text, mobile table behaviour, share image and metadata.
- Publication criteria, correction contact and next review date.

### School fact workflow

Use an official programme page or prospectus as the authority for that programme/intake. Store the URL, retrieval/check date, applicable cycle, field and reviewer. An LLM may propose a change summary, but a human approves deadlines, fees, eligibility and format changes. When sources conflict, show “verification pending” and link the official source rather than silently selecting a plausible date. After a cycle ends, archive clearly and create/update the next cycle with appropriate links.

## 5. SEO and AI visibility measurement

Weekly: indexed pages, qualified search queries, landing-page visitors, sample starts, first useful live practice, attributed buyers and contribution. Compare page/cohort age; a guide published yesterday is not comparable with a six-month-old page. Track brand and non-brand queries separately. Content success can include workshop/partner use, not only search ranking.

For AI visibility, keep a small fixed prompt panel: “MBA interview practice from my résumé”, “how to practise for a first MBA interview”, “one-year MBA work experience mock interview”, “Indian MBA application checklist” and a programme-specific query only when its page is verified. Record service, date, search mode, location/context where known, exact prompt, cited URL, factual support and resulting referral data. Test on a consistent cadence; do not cherry-pick favourable reruns. This panel is directional observation, not market share.

Bing provides AI citation reporting for supported experiences; use the account's available reports and definitions, alongside referrals/conversions. It is not a measurement of every ChatGPT/Claude/Gemini answer. [Microsoft explanation](https://about.ads.microsoft.com/en/blog/post/march-2026/the-ai-performance-dashboard-your-view-into-where-your-brand-appears-across-the-ai-web)

## 6. Getting the first users without an existing buyer group

### Build a reachable list

Create a restricted list of 30 relevant opportunities: 10 applicants/introduction paths, 10 mentors/coaches/community organisers and 10 communities or college clubs that publicly permit relevant engagement. These are targets for research, not permission to scrape member contacts. Record why each is relevant, community rules, contact method, consent/status, last contact and next step.

Spend the first week learning which places contain applicants with a near-term interview, not merely exam aspirants. A CAT preparation group months before shortlists may be good for a free checklist but poor for selling interview packs now. Verify actual admission calendars; do not assign one universal season to every programme.

### Channel order

| Channel | First experiment | Budget/control | Success evidence |
| --- | --- | --- | --- |
| Personal preparation network and introductions | 10 individual invitations to a supported pilot | Founder time; no bulk sending | Observed useful sessions and introductions to others |
| Community organisers | Ask 3–5 organisers to host/share a short practice workshop | Explicit permission; useful takeaway | Attendees voluntarily complete practice and some return |
| Independent mentors/coaches | Demo with fictional data; offer limited pilot seats | No commitment to a custom dashboard initially | Mentor uses it between human sessions and requests a repeat cohort |
| LinkedIn founder posts | Two useful posts/week with one concrete example | Time cap; no engagement automation | Relevant replies, qualified visits and actual sessions |
| Search content | One strong article every 1–2 weeks at a 10h/week founder budget | Reuse original examples and worksheets | Qualified organic entrants that activate |
| Small creator collaboration | One audience-matched demonstration with clear sponsorship disclosure | Fixed cap or tracked post-refund referral reward | Paid users and contribution, not views alone |
| Paid search | One intent cluster after paid beta gates | ₹1,500–₹3,000 initial test cap | Mature cohort CAC within allowed margin |
| Broad social ads | Later creative/message experiment | Separate capped hypothesis | Purchase contribution and low refund/support burden |

### Outreach drafts to customise and send yourself

**Applicant invitation**

“I'm preparing for MBA interviews and building a tool that asks follow-up questions from your résumé and answers. I'm looking for a few applicants with interviews coming up to try a short mock and tell me where it feels useful or unrealistic. The pilot is free; a redacted résumé is fine. Would you be interested in a 20–30 minute session?”

**Community organiser**

“I'm building an MBA interview-practice tool and would like to run a small session on practising follow-up questions. Participants would leave with a free worksheet and could optionally try the pilot. I won't collect member contacts or post promotions without permission. Would this fit your community's rules?”

**Mentor/coach**

“I'm testing résumé-based practice between human mock sessions. The tool keeps a transcript and highlights a few answer-specific improvements; it doesn't claim to predict admissions. Could I show you a fictional five-minute example and get your view on where it would help or mislead applicants?”

**Single follow-up after a reasonable interval**

“Following up once on the interview-practice pilot. Happy to share the worksheet even if trying the tool isn't useful right now. No worries if the timing doesn't fit.”

Stop after a decline or nonresponse to the follow-up. Do not imply a relationship, endorsement or outcome you do not have. These are drafts, not sent messages.

## 7. First twelve weeks of distribution work

Calendar starts when the required product gate is ready; it is not a promise to advertise within twelve weeks from today.

| Window | Work | Deliverable and decision |
| --- | --- | --- |
| Weeks 1–2 | Research 30 reachable opportunities; speak with 5 people; prepare fictional demo and worksheet | Refine message from actual objections; no ads |
| Weeks 3–4 | Supported 10-person pilot, 3 organiser approaches, first two high-intent guides | Fix repeated confusion; choose the strongest problem/channel |
| Weeks 5–6 | Invite second cohort; test real paid offer only after payment gates | First independent buyers, reasons for not buying, measured support/cost |
| Weeks 7–8 | One workshop or partner cohort; referral experiment for satisfied users | Repeatable source of qualified applicants; no custom enterprise promises |
| Weeks 9–10 | One small paid-search/creator test if economics allow; publish two more guides | CAC by source and mature conversion window; stop uneconomic spend |
| Weeks 11–12 | Repeat the winning experiment; review content queries and support load | Decide to increase modestly, improve product, or pause the channel |

A 10-hour week cannot support extensive engineering, daily content and many calls simultaneously. Use 5h build/quality, 2h customer conversations, 2h distribution/content and 1h operations as a starting allocation. During a pilot, temporarily shift from feature work to observation/fixes. Hire a reviewer/editor only when that bottleneck is real and the budget supports it.

## 8. Paid experiment protocol

Write a one-page experiment before spending: audience, need, offer, landing URL, message, attribution tag, spend ceiling, start/stop dates, target CAC, conversion window and cancellation rule. Use one channel/intent cluster at a time at low volume. Keep query match targeting narrow initially; review actual search terms and exclude irrelevant job/recruitment/free-download traffic where appropriate.

The ₹1,500–₹3,000 first cap buys information, not a statistically reliable CAC. Pause on broken tracking, payment failure, severe complaints or spend exceeding the cap. If a mature cohort has zero buyers, CAC is undefined/infinite, not zero. Diagnose targeting, offer and funnel before repeating. Scale only after at least two mature cohorts show acceptable contribution and support load; do not allow a script to raise budgets automatically.

Capture acquisition tags without personal data, store first/last attributable touch with a defined policy, and deduplicate purchases using server order IDs. Ad platforms optimise for their events; your database remains the authority for paid orders and refunds. Avoid retargeting or sharing audience lists built from sensitive interview content.

## 9. Referrals and partnerships

Test a bounded reward after a referred purchase is confirmed and its refund window passes. No self-referral, repeated-device abuse or infinite free voice credits. Put reward cost inside CAC and cap it below contribution. Start with a single referral code and ledger entries; do not build a complex affiliate portal first.

For coaches, propose practice between human sessions, with the applicant controlling whether a report is shared. Begin with manual purchase/seat allocation for one small cohort, clearly priced and documented. Build organisation roles, seat expiry, reporting and consent only after three partners request the same workflow. Never give a coach default access to an applicant's private résumé/history simply because they referred them.

## 10. Sustainable growth loop

A useful session leads to a specific next practice action; a returning applicant sees improvement; a satisfied applicant may share a public resource or invite a peer; the peer gets a relevant sample; paid usage funds the service. Keep sharing optional and privacy-preserving. Do not force public score cards or embarrass applicants into referrals.

The growth system should eventually automate attribution, scheduled content checks, opted-in lifecycle reminders and a weekly funnel digest. The founder still approves claims, paid spend, partnerships and publication of school facts. SEO compounds slowly and unevenly; maintain runway without assuming search will cover costs in the first three months.
