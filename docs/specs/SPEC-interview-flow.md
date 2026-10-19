# Spec: a frictionless first interview

Status: draft for owner approval (19 Oct 2026). Source: owner request + code audit + new-user walkthrough at 390px.

## Objective
The MVP is the mock interview. Success is a new visitor reaching their **first interview question in as few actions as possible**, finishing it, and coming back for a second.

Today, after sign-up:
- **(a) User with a PDF résumé:** about 8 actions, 2 AI waits and 3 screens before the first question.
  - The path: land on Today → taster button → "Add your résumé instead" → choose file → read a textarea holding the whole résumé → Build → review facts → Use profile → Start.
- **(b) User without a résumé:** 2 clicks to a 3-question taster that can only be used once per account. Their second interview is blocked behind the résumé path.

**Target:**
- **(a)** sign up → choose file → **Start interview**. That's 2 actions; the AI wait gets a progress indicator.
- **(b)** sign up → **Start interview**. That's 1 action, and it's repeatable.

## What changes (by stage)

### 1. Landing → sign-up
- Every "Start a mock interview" link for signed-out users signs up with `next=/app/interviews`, not `/app`.
- Sign-up form:
  - drop **Confirm password**, and add a show/hide toggle on the password field instead;
  - Google sign-in stays the first, most visible option;
  - Full name stays (it's used for "Welcome, Riya").
- The verification email still goes out, but nothing is gated on it. A small dismissible "Verify your email" banner in the workspace replaces the message that currently flashes past during the redirect.

### 2. First screen after sign-up
- New users land on **Interviews**, not Today.
- Today's first-visit view gets one primary card ("Start your first mock interview" → Interviews). The tracker card and the 3-step tracker list move below, as secondary.

### 3. Interview setup (one card, one button)
- **One primary button, "Start interview", always visible** when AI is available. No step numbers.
- **Résumé is optional and changes the interview:**
  - with a résumé → résumé-led questions;
  - without → a general interview: motivation, goals, "walk me through your background".
  - The "taster" concept disappears from the UI.
- **Programme:** one optional text field ("Preparing for… e.g. IIMA PGPX"), placed above Start. The tracked-programme dropdown shows only if the user has tracked applications.
- **Voice or chat:** a visible two-option toggle (Chat / Voice) next to Start. Length (3/5/8) and focus stay under "More options", collapsed.
- **Removed from the pre-start screen:** "Add SOP/notes", which moves under More options; "Explore the question bank", which moves below recent sessions; and the preparation-notebook empty state.

### 4. Résumé: upload → confirmation card (no text wall)
- **Two clear options:** **Upload résumé** (PDF/DOCX/TXT) or **Paste text instead** (opens a textarea).
- **After upload, a compact card:** "Shivam_Paul_Resume.pdf · read ✓". Then "Building your interview from your résumé… usually 20–30 seconds", with a spinner.
  - Generation starts automatically; there's no "Build" button.
  - **Check extracted text** (collapsed) lets the user fix and rebuild.
- **On success:** all facts are pre-selected and the profile is applied automatically. The card shows "Ready: N highlights from your résumé", plus a collapsed **Review what the interviewer will know**, where facts can be unticked.
- **Contact details are removed before sending.** The backend strips email addresses, phone numbers and LinkedIn or other profile URLs from résumé text before the AI call. The card says "Contact details removed before sending".
- **Scanned PDF or extraction failure** opens the paste area automatically, with one line explaining why.
- **The text is kept until the user leaves**, so "Check extracted text → fix → rebuild" works without re-uploading.

### 5. During the interview
No structural change. Waiting for each next question shows a clear "Thinking…" state; this is to be checked during build.

### 6. Debrief → coming back
- The primary action is **Practise again** (same settings, one click).
- Without a résumé: a secondary "Add your résumé for sharper, personal questions".

### 7. Copy and fine print
- **One privacy line** at the upload card: "Sent to OpenAI to build your questions. We keep the highlights, not the file. Privacy notice". Remove the repeated notices.
- **Plain words:**
  - "profile facts" → "highlights from your résumé";
  - "question set/openings" → "interview topics";
  - no "route", "taster" or "demo" in user-facing copy;
  - in production, demo mode shows a plain "AI is temporarily unavailable" message.
- **Errors offer the action that fits the failure:** retry for an AI failure, paste for an extraction failure.

## Boundaries
- **Always:** keep AI cost caps and per-user limits; keep data-deletion paths; tests, a build and a Playwright walkthrough before calling anything done; light and dark themes; 390px phone width.
- **Ask first:** anything that raises AI spend per user beyond the existing caps; removing the email verification email altogether; schema migrations.
- **Never:** store the uploaded file or the full résumé text; send contact details to the AI; merge without the owner.

## Technical notes
- **Frontend:** `InterviewStudio.js`, `ResumeQuestionBuilder.js`, `HomeView.js`, `Signup.js`, `LandingPage.js`, `SiteHeader.js`, `AuthPage.js`, and the workspace landing route.
- **Backend:**
  - contact-detail stripping in the résumé-questions service, applied before the AI call, with unit tests;
  - full interviews allowed without a reviewed résumé, falling back to the general plan already used by the taster;
  - the "once per account" taster rule retired (see Open questions).
- **Stack:** React CRA (`npm --prefix frontend run test`, `run build`), FastAPI (`python -m unittest`, Postgres in CI), Playwright (`frontend/e2e`).

## Success criteria
1. In a Playwright walkthrough at 390px as a new user, with the AI mocked:
   - (a) sign-up → first question takes **≤ 3 actions** after sign-up;
   - (b) it takes **≤ 1 action**.
2. After a PDF upload, the page never shows the full résumé text unless the user opens "Check extracted text".
3. Text sent to the AI contains no email address, phone number or profile URL, shown by unit tests with Indian and international formats.
4. A no-résumé user can start a second interview the same day, within the daily cap.
5. The setup screen shows exactly one primary button. No step numbers, no "taster", "route" or "demo" wording, and the OpenAI notice appears once.
6. All existing frontend and backend tests pass, after updating those that encode the old flow. The build is clean, and both themes are checked.

## Open questions (owner decisions)
1. **Retire "taster once per account"?** I recommend yes: no-résumé users get repeatable 5-question general interviews, bounded by the existing ₹5/day per-user cap. The alternative keeps one free no-résumé interview and then requires a résumé.
2. **Email verification:** keep sending, but ungated with a banner (recommended), or stop sending it at sign-up?
3. **Auto-build after upload:** this spends an AI call as soon as a file is chosen, even if the user abandons. I recommend yes: it's cheap, and it's the conversion moment.
