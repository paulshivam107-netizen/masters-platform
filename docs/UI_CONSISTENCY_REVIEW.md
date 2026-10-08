# UI consistency and résumé practice review

Reviewed locally on 8 October 2026. This pass covers applicant-facing screens, first-visit/returning-user states and the new résumé question flow. It is not a claim that every device, network or live AI response has been verified.

## Changes made

| Finding | Implemented change |
| --- | --- |
| Studio and notebook had different spacing/corners despite their shared width | Studio uses the same dashboard-card surface; card padding/radius now come from shared responsive tokens. |
| First-visit steps stopped short of the hero's right edge | Removed the arbitrary content-width cap. |
| Profile nested all cards inside another card | Removed the extra shell; its cards align with the workspace edges. |
| Essay drafting used an extra frame around already framed sections | Each section is now a standard card; school/programme fields share a desktop row and stack on phones. |
| Application detail retained different mobile padding | Uses the same card tokens at the mobile breakpoint. |
| Calendar summary formed an uneven two-plus-one arrangement on phones | Three equal summary columns, plus consistent calendar-card padding. |
| Research heading centred on phones; checklist arrows fell onto separate rows | Left-aligned Research heading; two-column checklist heading/arrow with detail text below. |
| Help/back links centred unexpectedly in otherwise left-aligned layouts | Aligned these links with the content edge. |
| Empty application list still offered a filter | Filter appears only when there are applications or an active query. |
| Interviews expanded the wrong navigation group | Assigned it to Core navigation. |
| New public pages could inherit the prior page's scroll position | New public routes start at the top; hash navigation remains available. |
| Expired access tokens left API-backed panels broken | Shared, single-flight session refresh; one replay after refresh; account-switch and cancellation guards. |
| Intermittent first-load connection failures | One bounded retry for read-only network failures; no automatic retries of saves or paid generation calls. |
| Authentication validation arrays crashed React | Safe, readable field messages; signup minimum/maximum values now match the backend. |
| Save/validation messages disappeared before users could inspect them | Error notices remain until dismissed/replaced and are announced as alerts. Fatal fallback no longer shows minified implementation errors. |
| A second question bank would duplicate element IDs | Per-component IDs support both the shared bank and private résumé graphs. |
| Upload focus was attempted while the form was disabled | Focus moves to editable extracted text after the request completes. |

Both themes retain their existing shared neutral surfaces and semantic colours: green accents in light mode and periwinkle accents in dark mode. No new hard-coded résumé colour palette was introduced. The self-guided warm-up now also contains questions without answering tips.

## Résumé questions

The optional **From your résumé** section supports PDF/DOCX/TXT uploads and pasting, extraction review, explicit processing consent, three opening branches with two follow-ups each, supporting excerpts, private history, export/deletion and starting practice from a selected opening. It reuses the existing server-side OpenAI integration. Upload/extraction works without a key; AI generation remains visibly unavailable until configured.

Full operating and privacy details: [Interview Studio setup](INTERVIEW_SETUP.md#résumé-based-question-sets-8-october-2026).

## Browser coverage

All browser checks used a disposable local copy with synthetic users/content and no provider key. Viewport checks used 1366×900 and 390×844, with an additional résumé upload/focus check at 360×800. Screenshots and DOM measurements are in [the archived UI evidence folder](validation/2026-10-08). No production environment or credentials were inspected.

| Surface | Coverage |
| --- | --- |
| Today | Returning-user dashboard; new-account welcome and steps; desktop light and phone dark. |
| Applications | Populated/empty lists, filter, add form and application detail; desktop light and phone dark. |
| Essays | Empty/populated library, draft form, saved version/review layout; desktop light/dark and phone dark. |
| Interviews | Empty/populated account, bank disclosure, setup, résumé upload/extraction, disabled generation without key, notebook alignment; desktop and phone, light/dark. |
| Calendar, Requirements, Compare | Desktop light and phone dark; standard card edges, responsive rows and inputs. Final Calendar/Requirements fixes rechecked in phone light mode. |
| Documents, Research, Export & Share | Desktop light and phone dark; controls, field labels and card alignment. Final Research heading/alignment rechecked in phone light mode. |
| Profile, Updates, Settings | Desktop light; Settings also phone dark; profile's extra container removed. |
| Public landing/programmes/guides/article/help | Mobile layouts inspected; both themes represented, guide-to-article theme continuity checked. |
| Sign in/sign up | Phone dark and desktop light; invalid server-side email validation recovers without a UI crash. No registration, reset emails or Google OAuth flow submitted. |

No document-level horizontal overflow, visible unlabelled fields or duplicate DOM IDs were found in the measured views. Intended two/three-column layouts and reading widths remain; consistent UI does not require every content type to have the same size.

### First-application save check: not verified

The automation could display a valid date in the native date control, but the form subsequently submitted an empty date and received HTTP 422. The attempted save did not create an application. This check was stopped after three attempts under the task's stopping rule. The failed draft was preserved in the disposable account. The cause may be the browser automation's event handling; it has not been established as a normal-user application defect. A real click/type/date-picker save must be checked manually before claiming the onboarding flow fully works. No production data was involved.

### Intermittent preview connection issue

Several initial read requests failed in the in-app browser with `net::ERR_FAILED`, despite API-side success logs. Manual retry worked. The client now provides one bounded network retry for GET requests and an explicit retry/error state after that; saves/generation are never blindly retried. The underlying preview transport cause was not established. Validate under the intended HTTPS deployment as well.

## Code inspected and changed

- Shared styling/layout: `frontend/src/index.css`, `App.css`, `App.js`, `app/hooks/useAppEffects.js`.
- Workspace views inspected: Today/Home, Tracker, Essays/Form/Detail, Interviews/Studio/QuestionBank, Deadlines, Requirements, Matrix, Docs, Research, Share, Profile, Notifications and Settings. Targeted component changes: Profile, Tracker, Interviews, Studio, QuestionBank and the new `ResumeQuestionBuilder`.
- Public/auth flows inspected: PublicHeader, Landing, Programs, ResourcePages, AuthPage, Login, Signup, ThemeContext and AuthContext. Changes: Login/Signup validation, AuthContext/session handling, safe `authErrors`, API client recovery and AppErrorBoundary copy.
- Résumé backend: new `resume_schemas.py`, `routers/resume_routes.py`, `services/resume_parser.py`, `services/resume_questions.py`; changes to `models.py`, `main.py`, requirements, migrations and the interview provider/routes/schemas/quota service.
- Regression tests: new résumé API/parser, résumé builder, API client and login tests; existing question-bank/audio/theme suites reused.
- Documentation: README, Interview Studio setup, question-graph notes and this review.

## Checks and remaining validation

- **21 backend tests passed**: actual synthetic PDF/DOCX/TXT extraction; malformed/encrypted/image-only/oversized content; question grounding; ownership; consent; keyless behaviour; idempotency; failure recovery; lease/deletion protection; quotas; selected-branch interviews; existing chat/demo lifecycle.
- **18 frontend tests passed**: session refresh/read retry/account-switch guard; auth validation rendering; upload/review/consent; repeat-request identity; selected private questions; saved-set deletion; graph paths; theme preference; audio lifecycle.
- Production build and public-page prerender passed. Preview indexing remains disabled. Existing Browserslist freshness notices are informational.
- `git diff --check` passed.
- **Not verified:** real OpenAI résumé quality/cost/latency, actual microphone capture, physical Safari/iPhone or Android devices, PostgreSQL/RLS/multiple-worker behaviour and admin-only screens. No deployment, billing or production configuration changes were made.

Recommended next validation: manually save the first application using the native date picker; then connect a key on staging and try one synthetic résumé through review → generate → branch selection → three-question chat/voice practice. Inspect every question's premise and recorded cost before offering paid practice.

## Follow-up: résumé-led interviews and recording review

Implemented and checked locally on 8 October 2026 following the applicant-journey discussion. The earlier coverage and unresolved application-date check above remain separate from this focused pass.

### Changes

- Three setup steps: programme type/target, résumé review, and practice preferences. Removed the extra biography and goals fields. The primary programme type and target are remembered per account in this browser.
- Résumé generation extracts short, grounded profile excerpts alongside possible question branches. Applicants review/select the facts to use; a selected profile can accompany either a private résumé opening or a shared-bank opening.
- Live questions use the latest answer as an explicit follow-up anchor, with repetition and branch-depth checks. Programme type and practice focus determine the coverage plan and feedback criteria. The keyless demo remains fixed and labelled.
- Replaced the timer-only warm-up with opt-in recording, playback, retry, retained in-page attempts and downloads. Audio is never uploaded by this self-review feature; leaving the page discards it unless downloaded. Capture finalisation is guarded against a second recording starting too early.
- Expanded the bank to 95 questions, 22 openings and 77 links. Added original academic/project/internship and work-decision/disagreement branches; specialist technology/product questions are hidden by default. No answering tips were added.

### Verification

- **25 backend tests passed**, covering résumé grounding/ownership, selected profile facts independent of the opening, route/focus planning, answer anchors, depth limits, question repetition and existing session behaviour.
- **15 focused frontend tests passed** across Studio, résumé review, recording/playback/retention/removal, audio finalisation and question-bank paths.
- Production build and public-page prerender passed. `git diff --check` passed.
- Browser checks used the disposable preview and synthetic data: desktop dark and phone light/dark; programme-type focus changes; selecting one profile excerpt and starting a demo; recording entry/question switching; DOCX extraction and focus on the review textarea; target-programme persistence after reload.
- The profile used for positive browser checks was explicitly labelled **Synthetic QA sample — not AI-generated**. No provider call or human microphone capture was made.
- Studio/notebook edges matched: desktop width 1062px, padding 24px, radius 18px; phone width 356px, padding 20px, radius 14px. No document overflow, duplicate IDs or visible unlabelled fields were found in these measured views. Evidence is in [the archived UI evidence folder](validation/2026-10-08), including `resume-led-final-mobile-dark.jpg` and `focused-recording-mobile-light.jpg`.

### Files and remaining checks

Primary changes: `InterviewStudio.js`, `ResumeQuestionBuilder.js`, `InterviewQuestionBank.js`, `InterviewsView.js`, `useInterviewAudio.js`, `InterviewStudio.css`, and new `FocusedPractice.js`; backend résumé/interview schemas, routes and generation services, new `services/interview_plan.py`, question-bank JSON and their targeted tests. Operating details are in [Interview Studio setup](INTERVIEW_SETUP.md).

Still unverified: real provider question/feedback quality, latency and cost; actual microphone capture/playback on physical devices; deployment/database behaviour. Next, use a staging key with one synthetic résumé for a short chat/voice mock, and manually record, replay and download an answer on a laptop and phone. The earlier first-application date-picker save still needs its separate manual check. No commit, deployment or production configuration change was made.
