# Interview Studio: setup and operating notes

Implemented 8 October 2026. The backend supports saved mock interviews, typed chat, turn-based voice and an answer-based debrief. The question bank works without a provider key. This is independent practice, not a school interview or admissions prediction.

## Connect AI

In an already configured installation, the only new required setting is the **backend** `OPENAI_API_KEY`. Add your own funded OpenAI project key through your server's environment/secret manager, then restart the backend. Do not add it to React, a `REACT_APP_*` variable, a source file or Git. No key was read or added during implementation.

Sign in and open Interviews. When the connection is configured, Chat and Voice become available and the consent notice appears. Capability detection checks configuration, not provider billing/model access. Complete one short live session to verify those. A valid key with API billing and access to the configured models is required; a ChatGPT subscription alone is insufficient.

If the site owner has deliberately paused AI via the existing admin `ai_enabled` switch or `INTERVIEW_LIVE_ENABLED=false`, AI remains paused. The essay provider selector does not select the interview provider. The keyless demo is clearly marked, makes no AI requests, and saves typed answers to the account.

The app still needs its existing database, authentication, CORS and hosting configuration. Interview tables are created by the existing startup schema path; the PostgreSQL RLS migration includes them. Run this path on staging before deploying. Nothing was deployed or changed in production.

The browser review at `127.0.0.1:3181` uses a disposable copy with a synthetic SQLite backend on port 8181. It intentionally has no key and does not read the repository's real environment settings. To activate your own instance later, start the repository backend with your configured environment; updating the repository's environment will not automatically change this isolated preview.

## Applicant experience

1. Pick the CAT/two-year route or the experienced-applicant route. Select an owned application or use general practice.
2. Optionally add a brief background and practice goal. Explore the question bank and select an opening, or accept the default.
3. Pick 3, 5 or 8 questions and choose Chat or Voice.
4. With AI enabled, consent to sending the supplied context and answers to OpenAI.
5. Chat: type and send. Voice: press **Hear question**, **Record answer**, stop, review/edit the transcription, then send. Microphone capture starts only on an explicit click. The voice is disclosed as AI-generated.
6. The interviewer asks an adaptive follow-up. The selected bank branch is optional context, not a rigid script.
7. Finish for a short debrief that cites exact excerpts from saved answers. Resume, export or delete sessions from the same account.

Voice is a transcription → text reasoning → speech workflow. It does not offer simultaneous conversation, interruptions, video, accent scoring or delivery analysis. OpenAI also exposes speech-to-speech APIs; those are a possible later upgrade. See [voice architectures](https://developers.openai.com/api/docs/guides/voice-agents).

## Provider defaults

| Purpose | API | Default model | Optional server override |
| --- | --- | --- | --- |
| Follow-ups and debrief | Responses, strict JSON schema, `store: false` | `gpt-4.1-mini` | `INTERVIEW_TEXT_MODEL` |
| Recorded answer transcription | Audio transcriptions | `gpt-transcribe` | `INTERVIEW_TRANSCRIBE_MODEL` |
| Question speech | Audio speech, coral voice, MP3 | `gpt-4o-mini-tts` | `INTERVIEW_SPEECH_MODEL` |

Defaults were checked against the official guides on 8 October 2026: [structured output](https://developers.openai.com/api/docs/guides/structured-outputs), [transcription](https://developers.openai.com/api/docs/guides/speech-to-text), [speech generation](https://developers.openai.com/api/docs/guides/text-to-speech). Model access and lifetime remain provider-controlled. In particular, the [deprecation notice](https://developers.openai.com/api/docs/deprecations) schedules the listed `gpt-4o-mini-tts` snapshots for removal on 6 January 2027. The speech guide still recommends the alias used here. Plan and test the speech adapter migration before that date; a Realtime model is not a drop-in replacement for this HTTP speech payload.

## Persistence and failure behaviour

- `InterviewSession` stores a context snapshot, turns, debrief, content/prompt versions and optimistic version number. Deleting the original application does not destroy the session snapshot.
- `InterviewOperation` stores request fingerprints, result/usage metadata and operation status. Replaying a successful text or transcription request does not repeat a provider call. Reusing an ID with different input fails.
- A database lease serialises mutations. Stale tabs receive a conflict and can reload; provider failures preserve the prior saved transcript. Unsent typed drafts are scoped to the signed-in account in browser storage.
- No automatic paid retries. Failed attempts count against daily limits. Question speech is cached in the browser for the current turn; server-side audio is not retained, so generating it again after reload incurs another call.
- AI feedback must pass schema validation and exact quote/turn matching. This prevents fabricated citations; it does **not** establish that an AI judgement is correct or helpful. Human evaluation remains required.

## Boundaries and costs

Defaults: 8 sessions per account per UTC day; 40 provider attempts per account and 200 globally per UTC day. The database counters work across API processes. Overrides: `INTERVIEW_USER_DAILY_CALLS`, `INTERVIEW_GLOBAL_DAILY_CALLS` (bounded integers). `INTERVIEW_LIVE_ENABLED=false` pauses live interviews.

Answers: 3,000 characters. Background: 2,000. Practice goal: 1,000. Question length: 650. Recordings: 120 seconds in the browser; the server independently limits uploads to 3 MiB and checks supported file signatures. It does not independently measure clip duration. Provider HTTP calls have a 45-second timeout and 5-second connection timeout.

These are request/size limits, **not a currency budget**. Billing includes speech and transcription as well as text. Track actual provider spend before selling interview packs. No payments, entitlements or subscriptions were added.

## Data handling

All endpoints require the existing account authentication and verify session/application ownership. Successful private responses use `Cache-Control: no-store`. Context and submitted answers are sent to OpenAI only for live sessions; only the chosen programme, explicitly selected résumé profile excerpts and deliberately supplied background/goal are used, not the whole account or essay library.

The app stores transcripts, debriefs and transcription text used for retry recovery. Raw audio stays in request/browser memory and is not written to app files or database. OpenAI's own retention controls are separate; `store: false` on Responses is not a promise of zero provider retention. Session deletion removes its operations and transcript from the app database; aggregate quota counters remain. Existing database backups may retain deleted data according to host policy. No provider data-retention settings were accessed or changed.

Microphone recording requires HTTPS in deployment (localhost works during development) and browser permission. Users can always type instead. Browser support and audio quality need device testing.

## API surface

All paths start with `/interviews`:

- `GET /capabilities`, `GET /questions`
- `GET /sessions?offset=0`, `POST /sessions`
- `GET /sessions/{id}`, `DELETE /sessions/{id}`, `GET /sessions/{id}/export`
- `POST /sessions/{id}/answers`, `/finish`, `/speech`
- `POST /sessions/{id}/transcribe?request_id=UUID&expected_version=N` with a bounded raw audio body

Session writes use a client-generated UUID `request_id`; follow-up operations also require the saved `expected_version`. The create endpoint accepts an optional validated bank `question_id`. The complete browser integration is in `InterviewStudio.js`.

## Verification and next validation

Implementation checks on 8 October 2026: **15 backend tests and 6 frontend tests passed**, the production frontend build and public-page prerender passed, and `git diff --check` was clean. In the isolated browser preview, a three-question bank-led demo completed; an unsent answer survived reload; saved answers/debrief reopened from history; bank search restored the question path; and selecting an opening returned focus to session setup. Light and dark views were inspected at phone and desktop widths, with no horizontal overflow at 390px. No real provider request or microphone recording was made.

The isolated test suite uses temporary SQLite and mocked provider responses, never a real key. Run `python -m unittest tests.test_interviews -v` from a test-configured backend. Frontend tests cover microphone denial, cancellation, duplicate clicks, stream cleanup, recording limits and question-path navigation. The production frontend build must also pass.

Next, add a key in staging and complete one three-question chat session and one voice session with synthetic answers. Check transcription of Indian names/programme abbreviations, follow-up relevance, quote grounding, latency and billed cost. Repeat recording on Safari/iPhone and Chrome/Android, then test PostgreSQL startup/RLS and concurrent requests with two API processes. Real OpenAI responses, microphone quality on physical phones and PostgreSQL behaviour were not verified during keyless implementation.

## Résumé-based question sets (8 October 2026)

**Interviews → From your résumé** accepts PDF, DOCX, UTF-8 TXT or pasted text. Uploading extracts text without an AI call. The applicant reviews and edits it, removes unnecessary personal details, chooses a route and consents before generation. The existing server-side OpenAI key and text model are reused; no separate résumé service or model training is required. Install the updated backend requirements when deploying.

Generation extracts up to 12 categorised profile excerpts and produces three opening questions, each with a second- and third-order follow-up. Every node includes an exact supporting excerpt from the reviewed résumé. Schema, uniqueness and substring checks reject malformed or ungrounded citations; these checks do not prove that a question's interpretation is accurate. The applicant can inspect the source excerpt, explore the branch and start a chat/voice practice session from its opening. No answering tips are generated. Private sets can be reopened, exported as JSON and deleted.

Without a key, upload, extraction, editing and viewing previously saved sets still work. Generation is visibly disabled. No tailored AI output was generated using a live provider during implementation.

### Storage and limits

- Raw uploads and full reviewed text are held in request/browser memory, not saved as files, database columns or browser-storage values. The form clears reviewed text after successful generation. Leaving the page also discards it.
- `ResumeQuestionSet` stores account ownership, a hashed request fingerprint, programme/route snapshot, extracted profile facts, generated questions, short supporting excerpts, usage and a concurrency lease. These records are private authenticated API data, not public SEO content. Provider retention and database backups remain subject to their respective policies.
- A practice session copies its chosen question/follow-ups. Deleting a source question set leaves existing sessions intact; the deletion notice explains that those sessions must be deleted separately.
- Maximum upload: 5 MiB. PDFs: 10 pages. Reviewed text: 80–20,000 characters. No OCR. Password-protected PDFs are rejected. DOCX extraction rejects DTDs/entities/external XML references and bounds ZIP expansion.
- Extraction runs in a separate process with a 12-second parent timeout, 8-second CPU limit and a 768 MiB address-space limit where supported by the OS. No API credentials are inherited. Production upload/body/concurrency limits still belong at the hosting layer too.
- 20 extraction attempts/account/day, 200 globally/day; 5 new question sets/account/day. Generation also consumes the shared AI-attempt quota. UTC reset; no automatic paid retries. A repeated successful request ID returns the existing set.

### Added endpoints

- `POST /interviews/resume/extract?format=pdf|docx|txt` — bounded raw body.
- `GET /interviews/resume/question-sets?offset=0` — owned sets, 20 at a time.
- `POST /interviews/resume/question-sets` — request UUID, route, reviewed text, consent, optional owned application or typed programme name.
- `DELETE /interviews/resume/question-sets/{id}` — owned set, protected from deletion during generation.
- `POST /interviews/sessions` additionally accepts a private `question_set_id` plus its root `question_id`.

### Updated validation

The combined interview/résumé backend suite passed **21 tests** using temporary SQLite and mocked provider responses. The selected frontend regression suite passed **18 tests** covering session recovery, bounded read retry, auth validation rendering, theme preferences, résumé consent/retry/deletion, bank navigation and audio lifecycle. Production build and public-page prerender passed. See [UI consistency review](UI_CONSISTENCY_REVIEW.md) for browser coverage and remaining validation.


## Résumé-led journey and focused recording (8 October 2026)

The workspace now has three steps: programme, résumé, practice. It remembers the primary programme type and typed programme label in account-scoped browser preferences. There is no dual-journey workspace. A résumé upload extracts text without AI; the existing generation call then produces a small profile and optional question branches. Applicants review the text before sending it and select which extracted facts to use in a mock. A biography or separate work-history form is not required. Users may still start general practice without a résumé.

`POST /interviews/sessions` accepts `programme_name`, `practice_focus` (`balanced`, `resume`, `behavioural`, `motivation`, `academics`, `work`), `profile_set_id` and `profile_fact_ids`. These are independent of an optional bank opening (`question_id` / `question_set_id`). The server checks ownership, route, completion and every selected fact ID before copying the selected excerpts into that session. Deleting a source profile does not delete copies already attached to saved sessions; delete those sessions separately. The full file/text is still not retained. Existing question-only sets continue to work; regenerate from a résumé to obtain a profile.

The model uses the actual answers to propose second-/third-order questions, with a validated quote from the latest answer. A versioned plan controls focus, branch depth and programme-appropriate feedback criteria. No new provider/model service or training is required. The [Responses structured-output contract](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) is used for facts, questions and debriefs. Source-quote checks do not establish whether the AI's interpretation is correct; live quality evaluation is still required.

### Practise one question

This replaces the timer-only warm-up. Microphone capture starts only after **Record answer**, stops explicitly or at two minutes, and releases the microphone before playback. **Stop & listen back** produces a native audio player, downloadable audio, optional reflection and downloadable question/notes. Earlier attempts survive retries and question changes. Six attempts (maximum 3 MiB each) may be kept in page memory. Removal requires an explicit confirmation. Object URLs and streams are released on removal/unmount. A second capture is blocked while the prior recording's final chunk is assembling.

No key or network upload is used for this local practice. Recordings are not transcribed or scored. Download attempts before leaving Interviews/reloading; these are not durable account records. The page warns on browser reload/close when recordings have not been downloaded. Entering a mock hides and stops local capture while keeping completed attempts in the mounted page. The existing AI voice mock remains a separate, consented transcription flow.

### Verification for this change

- 25 backend tests passed: ownership, selected profile facts, shared/private opening integration, grounded adaptive follow-ups, depth transitions and existing session/parser contracts.
- 15 focused frontend tests passed: recording/replay UI, retained attempts, removal, permission denial, final-chunk race, reviewed facts, session payload, bank navigation and microphone lifecycle. All audio/provider responses in automated tests are synthetic.
- No real API call or human microphone capture was made. Physical-device audio quality, real AI relevance/cost and production database behaviour need staging validation.
