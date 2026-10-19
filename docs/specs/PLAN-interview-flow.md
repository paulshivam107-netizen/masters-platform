# Plan: a frictionless first interview (implements SPEC-interview-flow.md)

Approved by the owner on 19 Oct 2026, with these decisions:
- no-résumé interviews are repeatable within the daily AI cap;
- the verification email is still sent, but nothing is gated on it, and a banner reminds the user;
- the résumé build starts automatically after upload.

Three tasks with disjoint files, built in parallel, then one integration and verification pass.

## T1: Backend (API contract the frontend relies on)
- **No résumé:** `POST /interviews/sessions` with `provider=openai`, `kind=full` and no `profile_set_id`/`question_set_id` creates a general (motivation-led) live interview using the plan the taster uses, honouring `question_limit`. It's repeatable, limited only by the existing AI caps.
- **Legacy taster:** `kind=taster` stays accepted for older clients, unchanged, including its once-per-account rule and migration 0008's index.
- **Contact stripping:** résumé text has emails, phone numbers (Indian and international formats) and profile URLs (linkedin, github, any http/www URL) removed before any AI call. The response reports `contact_details_removed: <count>`.
- Files: `backend/routers/interview_routes.py`, `backend/routers/resume_routes.py` and/or `backend/services/resume_questions.py`, plus tests.
- Verify with `python -m unittest` on the touched suites.

## T2: Sign-up, landing and first screen
- Signed-out links to the app use `next=/app/interviews`; signed-in users go to `/app/interviews`.
- Sign-up drops Confirm password and gains a show/hide toggle; Google stays first.
- After sign-up, users land on Interviews. A dismissible "Verify your email" banner shows in the workspace while the email is unverified.
- Today's first-visit view: one primary "Start your first mock interview" card; the tracker content becomes secondary, below.
- Files: `Signup.js`, `AuthPage.js`, `LandingPage.js`, `SiteHeader.js`, `HomeView.js`, the workspace banner location, and tests.

## T3: Interview setup, résumé card and debrief
- **One Start button, always visible.** No step numbers, no taster or demo wording in production.
- **Optional fields:** programme as one optional field; a visible Chat/Voice toggle. Length, focus and notes go under More options, and the question bank moves below the setup.
- **Résumé:** Upload or Paste. Upload shows a compact card, auto-builds with a progress message, auto-applies all highlights, keeps "Check extracted text" and "Review what the interviewer will know" collapsed, shows one privacy line, and opens paste on extraction failure.
- **Debrief:** "Practise again" is primary; "Add your résumé" is secondary when there's no résumé.
- Files: `InterviewStudio.js`, `ResumeQuestionBuilder.js`, `InterviewsView.js`, their CSS and tests.

## T4: Integration and verification (owner's success criteria)
- Playwright at 390px as a new user, with AI mocked:
  - (a) with a PDF résumé, ≤ 3 actions after sign-up to the first question;
  - (b) without one, ≤ 1.
- The full résumé text isn't shown after upload.
- Frontend and backend suites pass, and the build is clean, in light and dark themes.
