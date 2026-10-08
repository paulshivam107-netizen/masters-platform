# Search and AI visibility implementation

Prepared 8 October 2026. The application now has a small public publishing layer alongside the authenticated React workspace. It builds readable HTML from the same components used in the browser. This makes the public content retrievable without requiring a crawler to execute the application.

Local implementation is complete for the foundation described below. A public name/domain, hosting configuration, verified webmaster accounts, publication and post-deployment checks remain necessary. The local preview cannot appear in public search results.

## Validation completed locally

- Production frontend compilation and the automatic public-page renderer complete successfully.
- Sixteen tests across seven suites pass, including metadata/crawler rules, account-specific browser storage, draft recovery, navigation, theme and exports.
- An isolated indexable build simulation produces five distinct public pages with one main heading, one title, valid JSON-LD and the expected canonical per page. Its sitemap contains exactly those five URLs. Running the renderer twice produces identical files.
- The default preview has an empty sitemap and disabled indexing. Private shells, catalogue and missing pages have no public canonical or structured data.
- Fifteen HTTP routes/assets have the expected status and content type. Private pages return a noindex header; a missing page returns 404; the internal template is inaccessible. HEAD and trailing-slash redirects were also checked.
- Browser checks covered a fresh local signup, first application save, custom-programme draft recovery after reload, interview-note persistence, onboarding completion and an existing account. Public guides/help and interview preparation were visually checked in light/dark modes at desktop or 390-pixel mobile widths; the inspected mobile pages had no horizontal overflow.

These checks use disposable local data and a mock backend. Real email delivery, Google login, production API ownership, physical devices, live model behaviour and public indexing remain unverified. An intermittent earlier preview data-load error cleared on reload and did not recur during the fresh-account flow; check initial load on the eventual host before inviting users.

## What is implemented

| Surface                                   | Behaviour                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/`                                       | Indian MBA positioning, current capabilities, guides, FAQ and signup path                                            |
| `/guides`                                 | Linked index of the two published guides                                                                             |
| `/guides/mba-application-checklist-india` | Practical CAT/GMAT-route planning guide and CSV template                                                             |
| `/guides/mba-interview-story-bank`        | Story preparation method, example and downloadable worksheet                                                         |
| `/help`                                   | Getting started, storage limits, current features and feedback route                                                 |
| `/programs`                               | Rendered catalogue shell with `noindex`; the current data is not ready to become authoritative programme SEO content |
| `/auth`, `/app/*`                         | Authenticated application shell with `noindex`; no user content is pre-rendered                                      |
| Unknown routes                            | A useful not-found screen; the reference server returns HTTP 404                                                     |

The build generates titles, descriptions, canonical URLs, Open Graph tags, Twitter card type, JSON-LD, `robots.txt`, `sitemap.xml`, a branded 1200 × 630 share image and an SVG favicon. JSON-LD uses WebSite, WebPage/Article, SoftwareApplication and article breadcrumbs where appropriate. It contains no invented reviews, star ratings, school endorsements or admission claims. Visible FAQs are included for people; no special FAQ rich-result eligibility is claimed.

Client navigation updates the metadata and removes public canonicals/structured data when moving into private routes. Public canonicals omit query strings. Guide modification dates come from explicit editorial dates, not every build time. Only the five intentional public pages enter the sitemap.

## Files and architecture

- `frontend/src/content/guides.js`: shared guide content, FAQs and explicit modification dates.
- `frontend/src/content/site.js`: public metadata configuration.
- `frontend/src/seo/metadata.js`: one metadata/crawler policy used by the build and browser.
- `frontend/src/seo/Seo.js`: route-aware browser head updates.
- `frontend/src/seo/StaticSite.js`: the public React route tree for static rendering.
- `frontend/scripts/prerender.cjs`: runs automatically as `npm run build`’s postbuild step.
- `frontend/scripts/serve.cjs`: local static reference server with correct document routing and statuses.
- `frontend/public/templates/`: ungated, fictional-data-free templates.

The renderer uses React and Babel already supplied by the current frontend toolchain; it does not launch a browser, read database records or call the API. It preserves a build-local template for repeatable metadata generation. CRA clears the build directory before a fresh build. Do not publish the hidden template as a navigable page; the reference server rejects dotfiles.

Retain this setup while the public site is small. If the catalogue becomes a substantial, frequently updated editorial product, migrate public rendering to a maintained framework with static/server rendering and a content review pipeline. Preserve URLs and metadata during that migration. A whole application rewrite is not a prerequisite for this pilot.

## Build and preview

From `frontend`, use the normal commands:

```sh
npm run build
npm run preview
```

`npm run build` must complete both CRA compilation and the postbuild render. Running `react-scripts build` directly skips the public-page generator unless it is invoked afterwards. The reference preview binds to `127.0.0.1:3181` by default; override `PORT` for another local port. Production hosting and TLS must be configured separately.

Public build variables:

| Variable                   | Purpose                                                                     | Default                      |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| `REACT_APP_SITE_URL`       | Chosen public HTTPS origin, e.g. the domain you own; no path, query or port | Empty                        |
| `REACT_APP_ALLOW_INDEXING` | Explicitly enable indexing for the public deployment                        | False                        |
| `REACT_APP_SITE_NAME`      | Name used in metadata                                                       | Masters                      |
| `REACT_APP_API_URL`        | Existing frontend API destination                                           | Existing application default |

These are public build values, not secrets. Do not put API keys in `REACT_APP_*` values. If the final brand changes, update visible copy, wordmark and `social-preview.png` as well as metadata; the public name is still provisional.

For every preview or staging deployment, leave indexing disabled and restrict access where appropriate. An indexable build requires a valid public HTTPS origin. The default build emits `noindex`, disallows automated crawling and generates an empty sitemap. Enabling indexing without a valid origin fails the build instead of publishing localhost canonicals.

## Hosting requirements

1. Serve the generated file for each public route. `/guides/mba-interview-story-bank` must receive its own `guides/mba-interview-story-bank/index.html`, not the homepage.
2. Serve `app-shell.html` for `/auth`, `/app` and `/app/*`. Apply `X-Robots-Tag: noindex, nofollow` to these responses. Auth and API ownership checks enforce privacy; crawler directives do not.
3. Serve `404.html` with status 404 for unknown URLs and missing files. Do not rewrite every unknown address to a 200 homepage.
4. Choose HTTPS and one canonical hostname. Redirect alternative hostnames and trailing-slash duplicates consistently, preserving useful query parameters.
5. Serve static CSS/JS/images and the text/XML templates with correct content types. Cache hashed assets long-term; keep HTML and crawl files refreshable.
6. Do not challenge legitimate public search crawlers with a blanket bot wall. Check the provider’s verification guidance before configuring any allowlist; do not weaken authenticated/API protections.
7. Keep private account pages out of the sitemap and out of public templates, recordings and screenshots used for promotion.

The included Node server demonstrates these routing behaviours locally. Existing deployment/container configuration was not changed or inspected; copy the behaviour into the selected host during the deployment step. A generic SPA fallback would undo an important part of this SEO implementation.

Google notes that robots.txt alone is not a reliable way to prevent indexing; use `noindex` or authenticated access for that purpose. [Google developer guidance](https://developers.google.com/search/docs/fundamentals/get-started-developers)

## Search and AI crawler policy

| Service                                    | Current launch policy                                  | Meaning and limitation                                                                                         |
| ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Google/Bing and ordinary crawlers          | Public pages allowed when indexing is enabled          | Makes retrieval possible; does not guarantee indexing, rankings or traffic                                     |
| OpenAI OAI-SearchBot                       | Explicitly allowed                                     | Supports ChatGPT search retrieval; separate from GPTBot training access                                        |
| OpenAI GPTBot                              | Disallowed                                             | Requests exclusion from foundation-model training crawls; search remains separately allowed                    |
| Anthropic Claude-SearchBot and Claude-User | Explicitly allowed                                     | Supports search and user-requested retrieval                                                                   |
| Anthropic ClaudeBot                        | Disallowed                                             | Separate training crawler excluded                                                                             |
| Google-Extended                            | Follows the wildcard allow rule in the indexable build | Google’s control covers both Gemini training use and grounding; these purposes are not separated by this token |

OpenAI documents separate settings for its search and training crawlers. Enabling the search crawler is an eligibility step, not a promise of citations or recommendations. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)

Anthropic likewise distinguishes search, user-directed retrieval and model-development bots. [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)

Review the Google-Extended trade-off before public release: disallowing it would restrict the associated Gemini grounding/training uses while leaving Google Search unaffected. The current public-content policy follows the request for Gemini visibility; it does not expose authenticated user records. [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)

Google says its AI search features use the same core SEO requirements and do not require a new AI-specific text file or schema. The main work is useful original content, retrievable pages, sensible internal links and accurate visible claims. This guidance is about Google Search’s AI features, not a blanket guarantee about every Gemini experience. [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features)

There is no verified universal `llms.txt` submission protocol that forces ChatGPT, Claude or Gemini to recommend a site. Do not prioritise it above the readable public pages, factual programme data and real user value implemented/planned here. Likewise, no website configuration controls what a model says when it is answering without web retrieval.

## Public launch checklist

1. Confirm the name, owned domain and hosting provider. Update the visible brand/share image if needed.
2. Finish the product release checks in [the launch plan](LAUNCH_AND_GROWTH_PLAN.md). Public marketing should match the deployed capabilities.
3. Set the public origin and enable indexing only for the production build. Preserve preview/staging exclusions.
4. Deploy and fetch each public URL without executing JavaScript. Confirm a unique title, description, canonical and meaningful body text.
5. Check HTTP 200 for the five public routes, 404 for a nonexistent route, and `noindex` for account/auth/catalogue routes. Check both GET and HEAD.
6. Verify `robots.txt` and the five canonical sitemap URLs on the actual domain. Test one URL as a search crawler and confirm it receives the same substantive content as a visitor.
7. Inspect JSON-LD with a structured-data validator and test relevant markup with Google’s tools. Basic software markup without ratings/offers should not be described as guaranteed rich-result eligibility.
8. Add the site to Google Search Console and Bing Webmaster Tools using owner-controlled verification. Submit the sitemap and inspect the homepage and one guide. Record verification and crawl outcomes, not just submission attempts.
9. Check the share preview in the actual platforms used for outreach, plus mobile performance and accessibility on real devices.
10. Recheck indexing, exclusions, server errors and impressions after deployment. Allow time for crawlers; do not continuously resubmit unchanged URLs.

IndexNow is a later notification option for added, changed or deleted public URLs on participating engines. It requires a site verification key/file and is not a Google indexing guarantee. Add it to publishing only after the public domain is live. No key was created or submission made in this implementation. [IndexNow documentation](https://www.indexnow.org/documentation)

## Content and query plan

| Intent                                       | Initial page or next deliverable                                 | Helpful conversion                               |
| -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Organise Indian MBA applications             | Homepage and application checklist                               | Add first programme                              |
| CAT exam versus school application planning  | Checklist section now; dedicated guide after real user questions | Track a school deadline correctly                |
| GMAT-route application organisation          | Checklist now; verified programme-specific pages later           | Save a draft or readiness item                   |
| MBA interview examples and story preparation | Story-bank guide and blank worksheet                             | Practise and save one useful note                |
| Understand the product and storage           | Help page                                                        | Complete setup with accurate expectations        |
| Named school programme deadlines             | Do not mass-publish yet                                          | Verified catalogue plus evidence before indexing |

Choose keywords from applicant language and later Search Console queries. Do not claim measured search volumes without a dataset. Avoid duplicating the same generic content across dozens of school names. Review guide content monthly and programme facts whenever the source changes; keep intake and last-checked dates separate.

## Measuring progress

Track indexing coverage, relevant queries, organic landing-page visits, template use, signups and activated applicants. Combine Search Console/Bing data with the product cohort definitions. Ranking position is useful context; retained applicants are the product outcome.

For AI visibility, keep a small weekly manual query set such as “how to organise Indian MBA applications”, “MBA application checklist India” and “prepare an MBA interview story bank”. Record service, date, web-search mode, question wording, cited URL and whether the citation actually supported the answer. Results vary with mode, geography and context; do not treat ten prompts as a market-share estimate or repeatedly query to manufacture favourable examples.

Bing’s AI Performance report can show citation activity in supported Microsoft/partner experiences. Its counts describe citations rather than clicks, rankings or causation. Use it alongside referral and activation data, where available. [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)
