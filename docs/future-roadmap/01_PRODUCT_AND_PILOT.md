# Product design and pilot plan

[Roadmap index](README.md)

## 1. The product applicants should experience

An applicant arrives with a target programme and résumé, sees what the system understood, completes a realistic short conversation, and leaves knowing what to practise next. Subsequent sessions focus on a prior weakness or a new topic. The workspace provides deadlines and preparation continuity without making the applicant complete an administrative checklist before speaking.

The key distinction from opening a generic chatbot is continuity and trustworthy structure: the right context, targeted probes, a finite interview, evidence-linked feedback, saved practice history and a clear next session. Pilot interviews must test whether people notice that distinction and will pay for it. Do not assume that packaging alone beats an applicant's existing ChatGPT subscription or a human mock.

### Two routes in one product

| Dimension | Two-year MBA applicant | Experienced applicant |
| --- | --- | --- |
| Likely evidence | Coursework, academic projects, internships, clubs, volunteering, sport, family responsibilities | Work decisions, trade-offs, collaboration, influence, failures, business understanding and career direction |
| Important question | Can this person explain their choices, think clearly and learn from experience? | Can this person explain their contribution, judgment, progression and learning needs? |
| Behavioural setting | Offer a choice of college, project, community or work | Work is useful evidence, but permit other meaningful settings |
| Do not assume | Formal employment, direct reports, a prestigious college or a defined post-MBA title | People management, a managerial job title, quantified achievements, a linear career or admission eligibility |
| Feedback emphasis | Explanation, reasoning, reflection and specific contribution | Ownership, consequences, trade-offs, reflection and contribution to peers |
| Relevant modes later | Academic explanation, unfamiliar question, short personal introduction | Résumé deep dive, decision defence, career transition and programme fit |

Programme length, format and eligibility should be separate data fields. A one-year full-time MBA is not automatically an executive/part-time MBA. Entrance exams are programme-specific facts; they must not determine the entire interview persona. The existing `cat` identifier can remain a legacy API value until a versioned migration renames it; public wording should remain programme-based.

## 2. Onboarding specification

1. Public landing page offers “Try a sample interview” and “Practise with my résumé”. The sample uses fictional data and makes no claim to assess the visitor.
2. Ask for the primary programme type. Offer a named target or general practice; no compulsory school catalogue selection.
3. Explain upload purpose, accepted formats and the difference between local extraction, AI transmission and stored profile excerpts. Allow paste and a non-upload general practice route.
4. Show editable extracted text. Let the applicant remove phone number, address or other unnecessary details. Never make optional removal a reason to block progress.
5. With explicit consent, extract evidence-based facts. Candidate confirms/removes facts; introduce editable corrections when extraction failures justify it.
6. Default to a five-question balanced mock, with chat selected if voice capability is unavailable. Advanced settings stay collapsed.
7. Before starting, show approximate length, remaining credits, mode and what happens if the connection fails. No surprise paywall after a person has submitted their last answer.
8. After completion, show one useful summary, two or three priority improvements and links to relevant answer excerpts. Offer “Practise this again” before showing the full transcript.
9. On return, show “Continue interview” or “Work on your last improvement”. Other workspace sections remain accessible, but do not compete with the main action.

**First-visit target hypothesis:** a willing applicant can reach the first personalised question in under five minutes, excluding time spent finding/editing their résumé. Measure both total elapsed time and in-product time. A target is not a current measured result.

### UX acceptance checklist

- Every save has saving/saved/error state; returning to a draft does not create a duplicate application.
- The user can skip résumé upload and still understand the limitation of general practice.
- Error states retain typed answers and make credit status explicit.
- There is one primary action at each step; detailed controls are optional.
- Phone recording survives normal orientation changes; calls/backgrounding/interrupted capture produce a recoverable state.
- Keyboard navigation, focus restoration, clear labels, readable errors, reduced motion and adequate contrast work in both themes.
- First-time and returning-user flows are tested separately, including empty history and an unfinished session.
- No leaderboard, admissions percentile or unexplained readiness score substitutes for useful feedback.

## 3. Interview behaviour worth paying for

The conversation should alternate depth and coverage. A useful chain might be: “You mention an API migration. What did you own?” → “You said latency improved. How was it measured?” → “What alternative did you reject?” → “What would change your decision today?” This is an illustrative original chain, not a question attributed to a school.

Store a topic and a verifiable answer anchor for each follow-up. If the applicant says they do not know, has no relevant example, disputes the premise, or asks for clarification, the interviewer should respond naturally and move on when appropriate. “Dig deeper” should never mean demanding invented metrics or repeating the same accusation.

### Feedback contract

Each substantive finding includes the answer/turn reference, observed issue, why it made the answer harder to understand, and one suggested practice action. Separate “not demonstrated in this answer” from “you do not possess this skill”. A rubric may assess specificity, reasoning and reflection; it must not assert how an actual school would score the applicant.

Keep model answers and answering tips out of the shared question bank, respecting the current product decision. Feedback on a completed answer is a separate feature. Any future worked-answer library should be an explicit later product choice using fictional or properly consented examples.

Do not claim academic correctness when the system lacks a reliable reference. A separate factual-check mode needs sourced subject material and its own evaluation. Accent, native fluency, employer prestige, caste, religion, disability or inferred personality should not determine readiness feedback. Let users report a false assumption directly on the question or feedback item.

## 4. AI quality evaluation before pilot

Create a versioned evaluation folder with at least 30 synthetic profiles, approximately 15 per route. Include commerce, engineering, arts, science, non-metro education, nontechnical work, individual contributors, career breaks, family business, short résumés and applicants who cannot share confidential metrics. Do not include identifiable real applicants without separate permission.

For each profile, supply answer sequences that test: clear specifics, vague claims, contradiction, uncertainty, disagreement with the question, confidential detail, a request to stop, irrelevant text and instructions attempting to change the interviewer. Preserve a held-out subset for prompt/model changes.

| Check | Release gate proposed for the curated set |
| --- | --- |
| Invented résumé or answer facts | Zero critical invented premises in the release set; manually inspect every failure |
| Grounded follow-ups | At least 90% of eligible probes judged relevant by a human reviewer; report numerator/denominator |
| Repetition | No immediate repeat or stuck branch in tested sequences |
| Feedback evidence | Every critical finding references an actual answer; unsupported claims fail the case |
| Route fit | No requirement for workplace/manager stories from a fresher; no automatic managerial assumption for experienced users |
| Usefulness | Reviewer can name a specific practice action for each priority finding |
| Reliability | Schema errors/timeouts/refusals recover without losing an answer or silently consuming a customer credit |

These are internal release gates, not statistically established accuracy rates. Use at least one external reviewer with relevant MBA interview experience for a subset; do not label that person a school admissions authority unless they are one. Keep self-rated confidence, reviewer preference and factual grounding as distinct measures.

Log provider/model, prompt/rubric versions, evaluation version, latency, token/audio usage and reviewer notes. Compare model candidates on the same cases and total session cost. Do not switch every week because a leaderboard changed. A fallback provider is ready only after passing the same contracts and quality set.

## 5. Supported pilot design

### Entry gate

Complete infrastructure/auth/ownership/backup controls, applicant deletion/export path, reviewed privacy copy, AI spend limits and real provider checks. Manually resolve the outstanding application date-picker save. Run actual recording/playback on iPhone Safari and Android Chrome, or explicitly restrict the supported pilot mode until those checks pass. Both applicants and organisers must know the pilot's limitations.

### Recruitment

Recruit 10 initial people, roughly five per route; expand to 20 if patterns remain unclear. Include at least three people you do not know well and some who already use a competing workflow. Near-term interview intent matters more than a large signup list. A “qualified pilot applicant” has a real target and expects to prepare for an interview within roughly eight weeks; record actual timing rather than inferring it from CAT/GMAT.

Start with your preparation network, alumni introductions and community organisers who permit an invitation. You currently have no established buyer group, so a lead-list and outreach habit are genuine work items. Give access in return for candid feedback, never in exchange for a positive testimonial. Incentives, if used, should reward time and be disclosed.

### Observed session script

**Before the call:** explain what will be observed, whether anything is recorded, where notes are stored and how to opt out. Screen recording is optional and separately consented. Do not collect a full résumé into your recruitment spreadsheet.

**Minutes 0–5:** “What are you preparing for? When is your interview? What did you use last time? What have you paid for, if anything?” Ask about actual behaviour before showing the product.

**Minutes 5–15:** ask the person to set up and begin practice without coaching their clicks. Note time, hesitation, unclear wording, help requests, abandoned steps and recovery. Use a redacted résumé if preferred.

**Minutes 15–25:** let them complete a short mock. Ask them to identify one useful feedback item and one incorrect/unhelpful item. Record the exact product output with permission, not your interpretation alone.

**Minutes 25–30:** “What would you do next? What would make you use this again? Which current tool would this replace? If this five-session pack cost ₹599, what would stop you buying?” Hypothetical agreement is not a purchase.

**48–72 hours later:** check whether they returned without a live walkthrough. Ask what triggered the return or prevented it. Count founder-reminded returns separately from self-initiated ones.

### Cohort decision sheet

One row per participant: pseudonymous ID, programme type, interview timing, acquisition source, session dates, onboarding completion, help minutes, first mock completion, usefulness response, false-assumption count, independent repeat, paid offer/purchase/refund, support minutes, next action. Keep contact information in a restricted recruitment list, separate from analysis.

### Exit and stop gates

- At least 8/10 can begin practice without the founder operating the UI.
- At least 7/10 complete the intended short mock; reasons for abandoning are recorded.
- At least 7/10 identify a concrete useful improvement, with the full response denominator shown.
- At least 4/10 return independently within seven days when their interview is still upcoming. Exclude people whose actual interview already finished from the repeat-use denominator and report that exclusion.
- No unresolved data loss, cross-account exposure, double charge or critical misleading feedback.
- Inspect every small-cohort failure. Report two-year and experienced results separately; do not hide one route's failure in an overall rate.

If usefulness fails, improve the interview/feedback loop before payments. If usefulness passes but repeat use fails, investigate timing, value per session and reminders. If purchases fail, test offer and distribution before adding unrelated features. If two consecutive 10–20-person cohorts cannot show a credible valued use case, stop acquisition spend and reconsider positioning.

## 6. Feature roadmap by applicant value

| Priority | Feature and reason | Earliest evidence gate |
| --- | --- | --- |
| Launch | Reliable résumé grounding, clear limitations, recoverable sessions, usable debrief | Existing code validated against real provider and phones |
| Launch | Self-review playback/download and transparent local storage | Physical recording check |
| Launch | Paid credits, usage visibility, refunds and export/deletion | Before taking self-service payment |
| Next | Saved improvement actions and retry of a weak answer | Users struggle to decide what to practise next |
| Next | Server-saved preparation notes and checklists | People switch between laptop and phone |
| Next | Multiple application milestones and opted-in reminders | Users miss/distinguish exam, form, recommendation or interview dates |
| Next | Reliable programme content review/versioning | Named-target demand and editorial capacity |
| Next | Session comparison using the same rubric | Repeated users request evidence of progress |
| Later | Academic topic practice with reviewed references | Two-year applicants show repeated subject-specific need |
| Later | Work-decision and cohort-contribution modules | Experienced users find generic probing insufficient |
| Later | Hindi/English or mixed-language practice | A defined language cohort and suitable human QA available |
| Later | Realtime voice with interruption and silence handling | Turn-based delays materially harm completion or willingness to pay |
| Later | Mentor review through revocable, limited sharing | Applicants explicitly request human review and supply exists |
| Later | Coach/cohort dashboard with seat credits | At least three partners request and will pay for a repeatable workflow |
| Optional | Calendar export/import, accessible installable web app, CSV import | Measured workflow friction |
| Separate bet | MiM, international MBA, scholarships or job interviews | Existing product profitable plus dedicated discovery for the new segment |

“Later” is not a commitment. Require five independent requests or observed repeated friction, a small experiment and a cost estimate. Adapt navigation by the primary journey without maintaining two entirely separate products.

## 7. Three primary business measures

1. **Useful completed practice per active preparation user per week.** Count completed live mocks where feedback is viewed and the applicant records an action or usefulness response. This is a proxy for preparation value, not evidence of admission success. Keep demo completions separate and show survey response coverage.
2. **Contribution after acquisition per paid pack.** Net sales excluding applicable sales tax and refunds, less payment fees, full included AI allowance, support provision and acquisition. It answers whether more buyers improve the business.
3. **Founder operating hours per week.** Support, content review, incidents, billing and routine quality checks; feature development reported separately. It answers whether the product is becoming manageable alongside an MBA/job.

Diagnostics: signup-to-first-live-mock activation within seven days; eligible seven-day repeat practice; median/p95 session cost; failed paid sessions; refund rate; support minutes per buyer. Weekly report shows counts and denominators, route, cohort age and interview timing. No DAU target is required for an episodic admissions product.

Initial thresholds are operating hypotheses. Recalibrate after the first 50 eligible applicants and 20 buyers, without retroactively changing metric definitions to make results look better.
