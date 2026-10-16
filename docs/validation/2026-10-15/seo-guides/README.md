# Priority-1 SEO pages: validation, 15 October 2026

Status: **drafted — founder review before publishing.** Nothing has been deployed.

## Pages

| Route | Title | Structured data |
| --- | --- | --- |
| `/mba-interview-practice` | MBA interview practice that follows your résumé | WebSite, WebPage |
| `/guides/mba-interview-from-resume` | MBA interview questions from your résumé: one line, three follow-ups | WebSite, Article, BreadcrumbList |
| `/guides/mba-interview-for-freshers` | MBA interview preparation for freshers and early-career applicants | WebSite, Article, BreadcrumbList |
| `/guides/mba-interview-work-experience` | MBA interview preparation for experienced applicants | WebSite, Article, BreadcrumbList |

Each page has a unique title and description, a direct answer at the top, one CTA, related links and an editorial date of 2026-10-15. Linked from the footer, the guides index (all guides plus a practice link), the homepage guide section and related-reading lists.

## Editorial note

- All named people and résumé lines are fictional and labelled as such.
- Avoided: prices, testimonials, statistics, logos, admission predictions, readiness scores, school-specific deadlines, fees, formats or cut-offs. WAT/GD is mentioned only as something some programmes include, with the interview letter named as the authority.
- Privacy wording matches `backend/models.py` (`ResumeQuestionSet`: original file and reviewed résumé text are not persisted) and `backend/resume_schemas.py` (consent required; three branches of opening, follow-up and deeper follow-up, each with an evidence excerpt). Stored: generated questions and short résumé excerpts.
- The landing page does not promise a résumé-free practice route or voice mode, because neither was verified in this branch.
- The roadmap table asked for a "clear price" on the landing page; this was left out as instructed. Add it once pricing is decided.
- For founder review: confirm the AI provider wording, whether "free during the pilot" (existing guide footer copy) should stay, and the tone of the fictional examples.

## Checks

- `CI=true npx react-scripts test --watchAll=false`: 19 suites, 72 tests passed (metadata test extended for the new pages).
- Indexable build (`REACT_APP_SITE_URL=https://www.masters-preview.in`, indexing on): 9 public pages rendered; sitemap has 9 URLs with `lastmod`.
- `npm run check:routes -- http://127.0.0.1:3701`: all 20 checks passed, including the four new routes (200, index, canonical).
- Built HTML: one `h1`, correct title, description, canonical and parseable JSON-LD for each page.
- Screenshots at 390 px and 1280 px (`*-390.png`, `*-1280.png`); no horizontal overflow at either width.
