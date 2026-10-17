# Plan: interview-first Masters for MBA, EMBA and MiM applicants

The previous R07 plan is archived in `docs/plans/r07-plan.md` (R07 v10 shipped).

## Problem statement
How might we let any business-school applicant with a résumé use Masters, without losing what works for Indian applicants (the guides, the CAT-route context, the owner's own network)?

## What the code says today (17 Oct 2026, main @ 48e4552)
| Layer | Today | Global-ready? |
| --- | --- | --- |
| Site copy: hero, header, footer, metadata, guides index, help | "For Indian MBA applicants", CAT examples | No. The first-pass edits on branch `go-global` (uncommitted) fix this |
| Guides content | 1 India-specific checklist; 4 universal guides with a few India words | Mostly. Keep the checklist and file it under "Indian MBA routes" |
| Interview setup (InterviewStudio, ResumeQuestionBuilder) | Routes: `cat` = "Two-year MBA", `experienced` | Partly. The labels need MiM and EMBA; the internal ids can stay |
| **Interviewer instructions** (`backend/services/interview_provider.py`, PROMPT_VERSION mba-interview-v10) | "practice interviews for Indian MBA applicants… two-year CAT-route programme" | **No.** International users get an India-framed interviewer |
| Résumé question generation (`services/resume_questions.py`) | Same framing, to be checked | Unknown |
| Profile defaults | Currency INR, timezone Asia/Kolkata | Fine. These are user-editable |

## Product direction (agreed 17 Oct)
- Interview coach first; the planner stays as a solid secondary feature.
- Pilot success means people come back (3+ interviews, return within 7 days); signups only show reach.
- Global-ready product, India-first channel this cycle, with a low-effort global test (GMAT Club, r/MBA) once the interview is strong.
- Order of work: pilot blockers → memorable interview (dictation, then voice) → reasons to return (progress across sessions) → return-rate measurement.

## Recommended direction
Lead with the format, not the geography: "résumé-led interview practice for business school". Keep India as a strength, not a limit: the India guides stay, with Indian programmes named alongside international ones in examples. The site copy and the interviewer must change together, because a global landing page with an India-only interviewer is worse than either alone.

## Tasks

### Task 1: Site copy goes global (frontend only)
Finish and commit the first-pass edits. Hero, header ("For MBA, EMBA and MiM applicants"), footer, page metadata, the index.html meta tag, the guides index and categories, help, the landing route cards and the illustrative tracker (INSEAD MBA, ISB PGP, HEC Paris MiM).
- **Acceptance:** no "Indian" or "CAT" left in public copy except the India checklist guide and its category; examples mix Indian and international schools; no affiliation claims.
- **Verify:** frontend tests and build; screenshots of home, guides, sign-up and help at 1440 and 390, light and dark.
- **Files:** LandingPage, LandingPanels, SiteHeader, SiteFooter, ResourcePages, metadata.js, guides.js, index.html, HomeView. Size M.

### Task 2: One interview flow; the résumé unlocks the full interview (frontend + backend)
- **Remove the route choice from setup.** `route` becomes optional in `interview_schemas.py`; old sessions keep their stored value. The interviewer infers the stage from the résumé and a one-line intro.
- **One required line, "Where you are and what you're applying to"** (max 160 characters, untrusted), for example "ISB PGP, 6 years in consulting".
- **Without a résumé: the "Why MBA" interview.** A live interviewer covers why an MBA, why now, why this school, goals, and walk me through yourself, with follow-ups quoting the answers. It ends with "Add your résumé so the panel can go deeper."
- **With a reviewed résumé: the full résumé-led interview** (today's flow).
- **The fixed demo stays only as the fallback** when AI is switched off (capabilities `chat: false`).
- **Cost control:** the "Why MBA" taster is 3 questions, once per account, and counts against the AI caps.
- **The interview header names the candidate:** "Candidate: …, preparing for …".
- **Acceptance:**
  - setup has no category step;
  - both paths run to the debrief;
  - old sessions load;
  - the demo appears only when AI is off;
  - AI cost caps are still enforced.
- **Verify:** backend tests on Postgres (schema, validation, both paths); frontend unit tests; both flows end to end on a local backend with mocked AI.
- **Files:** interview_schemas.py, interview_routes.py, interview_provider.py (context), InterviewStudio.js, FocusedPractice.js and tests. Size L, so split it into two PR commits: backend then frontend.

### Checkpoint A
Tests and build pass, and screenshots of setup with and without a résumé are reviewed.

### Task 3: Interviewer instructions go global and stage-aware (backend, AI prompt)
- **Prompt:** replace the "Indian MBA applicants… CAT-route" framing with "MBA, executive MBA and Master in Management candidates in any country". Infer the stage (pre-experience, early career, experienced or executive) from the résumé and the optional target programme. When unsure, ask instead of assuming. Keep every safety rule. Treat the target programme as untrusted text. Apply the same to the résumé question generator.
- **Version:** bump PROMPT_VERSION to mba-interview-v11.
- **Acceptance:** prompt tests updated; the R07 dev split re-run on gpt-4.1-mini meets v10's gates, plus 3 new synthetic profiles (a European MiM fresher, a US MBA, an EMBA in Singapore) with no India or route assumptions and the stage inferred correctly.
- **Verify:** backend suite in CI; R07 report. **OpenAI spend is cents; run after the owner's go.**
- **Size:** M.

### Checkpoint B
R07 report reviewed by the owner before merge.

### Task 2b: Conservative AI spend caps (backend config defaults)
- Lower the defaults in `services/ai_costs.py`: `AI_GLOBAL_DAILY_CAP_PAISE` from 50_000 to 5_000 (₹50/day) and `AI_USER_DAILY_CAP_PAISE` from 5_000 to 500 (₹5/day). The alert stays at 80% of the global cap.
- **Owner:** set the same values in Railway, and a hard monthly limit in the OpenAI dashboard (for example $15).
- **Acceptance:** cap tests updated; the admin economics view shows the new caps.
- **Size:** S.

### Task 3a: Speak to the applicant (frontend copy)
- Make the hero and the in-app language address the MBA applicant ("Your MBA interview, practised before it counts").
- Make "Why MBA" the visible first step on Today for new users.
- **Size:** S. Pairs with Task 1.

### Task 3b: Interview-first navigation (frontend only)
Move Interviews directly under Today in the sidebar and in the phone tab bar order. The planner (Applications, Essays, Calendar and the rest) stays, below it.
- **Acceptance:** nav order is Today, Interviews, Applications, Essays…; active states and the phone "More" sheet still work.
- **Verify:** unit tests; screenshots at 1440 and 390.
- **Size:** S.

### Task 4: Privacy notice and PR wrap-up
The privacy notice needs no change, because the data flow is the same. Open one PR, or two if Task 3 is split out, with a full changelog of every copy change.

## Not doing (and why)
- **Region-specific guides** (US, Europe): later SEO work, once there's evidence of non-Indian traffic.
- **Localisation and multi-currency pricing:** no payments yet.
- **A catalogue of international programmes:** the Programmes page is hidden for the pilot.
- **Renaming the route ids (`cat`) in data:** they're internal, and renaming them needs a migration for nothing user-facing.
- **Optional SOP or extra context for the interviewer:** next step after this lands, reusing the same "context" slot. Kept out to keep this PR reviewable.

## Assumptions to validate
- International applicants will find the site. With indexing off, they can't until `REACT_APP_ALLOW_INDEXING` is turned on (an owner decision).
- Interview formats abroad are résumé-led enough that the same interviewer works. The 3 new eval profiles test this cheaply.
- Indian users don't feel the product moved away from them. The India guides stay prominent.

## Decisions (owner, 17 Oct)
- The prompt change goes in this PR.
- One flow, no identity picker; the résumé is required for live interviews.
- Speak to "MBA, EMBA and MiM candidates" and use the candidate's name in the interview.


## Later phases (separate PRs, in order)

### Phase 2: Reasons to come back (before the pilot invite wave)
Decision (owner, 17 Oct): **a middle ground on scoring.** Show an "Interview readiness" score out of 100, because a number motivates people to come back ("60 → 70", "92 → 95"). The AI never produces the number itself, which keeps it honest and stable.

**Task 2.1: Evidence levels in the debrief** (backend prompt + schema, frontend debrief)
- **Dimensions:** motivation (why MBA, why now), work experience, academics, projects, communication.
- **Levels:** for each one the AI returns a level, missing (0), partial (1) or strong (2), plus a quote from the candidate's own answer as evidence. A dimension the interview didn't cover is "not assessed" and is excluded, not scored 0.
- **Acceptance:**
  - strict JSON schema;
  - every level carries a quote that exists verbatim in the transcript (validated server-side; reuse the existing misquote checks);
  - an R07 dev re-run shows stable levels when the same transcript is scored twice.

**Task 2.2: The "Interview readiness" score** (backend, deterministic)
- **Formula:** score = round(100 × sum of levels ÷ (2 × number of assessed dimensions)). Pure arithmetic, unit-tested, never generated by the AI.
- **On the debrief:** "Interview readiness 60/100", a "How this is calculated" link that lists each dimension's level and quote, and the line "Practice signal, not an admission prediction."
- **Over time:** a trend of the last 5 scores plus the change since the previous interview ("+10: your motivation answer now has a concrete example").
- **Acceptance:** identical levels always give identical scores; a taster (motivation only) shows a "partial readiness" label, so a 3-question taster isn't compared with a full interview.

**Task 2.3: Count and history on Today**
"You've done 4 interviews", the latest score, and a "Practise again" button.

**Task 2.4: Admin metric**
Interviews per user, and the share returning within 7 days.

### Phase 3: School interview pages (indexed before January)

**Scope (owner, 17 Oct): about 60 schools.**
- **US:** top 15, including the M7.
- **Europe:** top 15 (INSEAD, LBS, HEC, IE, IESE, Oxford Saïd, Cambridge Judge and others).
- **India:** top 15 (ISB, the IIMs, XLRI, SPJIMR and others).
- **Asia:** NUS, NTU, HKUST, HKU, CEIBS.

**What each page says** (the goal is to show we've thought about this school, without pretending to be its admissions office):
- programmes offered and their format (for example ISB PGP 1 year, PGPYL; INSEAD 10–12 months; MiM length), intake months and duration;
- the interview format **only where the school states it officially**;
- career-outcome direction from the school's latest employment report (for example "mostly consulting, finance and product roles"), with the report year;
- what interviews for that format tend to probe (motivation, fit, experience), written by us and clearly labelled as general guidance;
- a "Practise for {school}" button that pre-fills the programme and starts an interview.

**Rules:**
- Every fact has a source link and a "checked on" date; the page shows "Facts checked {month year}".
- No names of faculty, no rankings we didn't source, no invented formats, no affiliation claims.
- Refresh once a year: about a day of work, owner-reviewed.

**Slicing (each step is its own PR):**
1. **Template + data model + 3 pilot schools** (ISB, IIMA, INSEAD). The data lives in `frontend/src/content/schools/*.js`, gets prerendered, and is linked from the Guides index. Owner reviews the template and the facts.
2. **India: the other 12.** This audience can be reached now.
3. **US: 15.**
4. **Europe: 15.**
5. **Asia: 5.**

**Research approach:** a cheaper agent gathers facts per school from the official site and the employment report only, and outputs each fact with its URL and date. The owner spot-checks before merge.

**Search indexing, explained**
- Search engines only list pages a site allows them to. Today mockmba.com tells them **not** to: `robots.txt` says "Disallow: /" and every page carries `noindex`. It was switched off deliberately while the site was a half-built pilot, and so the preview copies (`*.pages.dev`) never compete with the real site.
- **Turning it on:** set `REACT_APP_ALLOW_INDEXING=true` in Cloudflare Pages (production only), redeploy, then submit `https://www.mockmba.com/sitemap.xml` in Google Search Console. Previews stay hidden.
- **When:** as soon as PR #26 (privacy) and this PR are live. The home page, guides and privacy page are ready. Google takes weeks to index and rank, which is exactly why it should be on well before the January interview wave. The school pages then join automatically as they ship.
- **Owner action:** a Cloudflare setting plus a Search Console sign-up (free).

### Phase 4: A more real interview
- The dictation button (already proposed as its own session), then a voice-first panel mode: question read aloud, timed answer, no visible chat log while answering.
