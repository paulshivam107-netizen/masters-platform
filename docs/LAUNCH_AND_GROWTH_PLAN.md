# Indian MBA launch and growth plan

For the consolidated forward plan, use the [detailed product and business roadmap](future-roadmap/README.md). It updates positioning toward résumé-led interview practice and adds hosting/database decisions, economics, growth experiments and implementation tickets. This earlier document remains implementation and planning context.

Prepared 8 October 2026. Start with a small, supported pilot for Indian MBA applicants. The product’s useful promise today is organised applications and preparation. Implementation update: the Interview Studio now has a backend for chat and turn-based voice, saved sessions and a question graph. Live provider validation and a consented pilot remain required before marketing a paid AI experience. See [Interview setup](INTERVIEW_SETUP.md).

The first commercial question is whether applicants return to manage real work. A tracker with an attractive interface is easy to replace with a spreadsheet. A reliable preparation workflow, useful guidance, and eventually credible interview feedback give people a stronger reason to stay. Prioritise that evidence before broad paid acquisition.

## The first two audiences

| Audience                                                                      | Immediate problem                                                                    | First useful result                                                        | Initial offer                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Two-year MBA applicants using CAT or another accepted route                   | Exam registration, school forms and selection instructions are scattered             | One target programme with a verified deadline and a saved preparation note | Free application checklist and a simple workspace         |
| Applicants to programmes for experienced professionals, including GMAT routes | Application rounds, essays, recommendations and interview examples compete with work | One tracked application plus an essay draft or interview story             | Free planning workspace and a structured practice routine |

Do not conflate a one-year full-time MBA, an executive MBA, a working-professional programme and a part-time programme. Store exact programme names and formats. Test each school’s admission route independently; do not infer eligibility from the entrance exam or programme label.

Recruit five people from each audience initially. Analyse them separately. Ten people can expose repeated usability problems; they cannot establish market demand or a statistically reliable conversion rate.

## Positioning and offer

Suggested headline: **Your MBA applications. One clear plan.**

Supporting explanation: track programme deadlines, essay drafts and interview preparation for Indian MBA applications. The pilot is free. Documents are readiness checklists; users keep the files themselves. The interview tool provides a linked question bank and saved mock sessions; AI chat and turn-based voice become available when the owner connects the provider. A clearly labelled demo works without a key.

Lead outreach with a specific useful task: “organise your next three application actions” or “build five interview story cards”. Avoid promises of admission, school-specific insider scoring, or better admission odds. Do not present mock AI reviews as an expert evaluation.

Keep the public brand as Masters until a final name is chosen. Before committing to a domain, check name availability and possible conflicts, then use one consistent name across the site, social cards, profiles and outreach. Domain selection and production publication remain open decisions.

## Product work completed in this implementation

- Public homepage now names the Indian MBA application use case.
- Five public pages receive HTML at build time: home, guide index, two practical guides and help.
- Application checklist and interview story templates can be downloaded without an account.
- Help explains the setup path, current feature limits, saved account data and browser-only data.
- The returning dashboard supplies one unfinished setup action, with an essay or interview-note choice. It can be hidden and restored through Settings.
- Local drafts, notes, checklists and setup preferences are keyed to the signed-in account. Old unassigned keys remain untouched and are not silently assigned to another user.
- Opening a new essay/application form recovers the current account’s unfinished draft, including custom programme names.
- Added events for application creation, essay saves, setup actions and completed/started self-guided practice. Payloads do not contain essay text or notes.
- Public metadata, sitemap, crawler rules, share image, canonical URLs and real not-found responses have implementation support. Preview indexing remains disabled.

## Work required before inviting people to rely on the product

These are release checks and remaining work, not claims that the production service has passed them.

| Priority | Work                                                                               | Acceptance check                                                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Deploy to a chosen HTTPS domain with isolated production data and durable backups  | A restore drill works in a separate environment; credentials and debug tokens are absent from responses                                                                             |
| P0       | Verify signup, email verification, password reset, login, refresh and logout       | Fresh email and Google users can complete the supported path; an email delivery error never masquerades as failed account creation                                                  |
| P0       | Verify API ownership rules independently of frontend storage                       | Account A cannot read, change, review or export account B’s records by changing IDs                                                                                                 |
| P0       | Publish owner-reviewed privacy, terms, deletion/export and support information     | The wording matches actual storage, model-provider transmission, retention and deletion behaviour; a real contact channel works                                                     |
| P0       | Remove or clearly label all mock AI output in the deployed pilot                   | Users can tell whether feedback is mock or model-generated before relying on it; AI cost caps exist before enabling paid inference                                                  |
| P0       | Audit the programme catalogue before exposing it as factual Indian admissions data | Every published record has programme, intake, round, official source, checked date and review owner; stale entries cannot auto-fill trusted deadlines                               |
| P0       | Test physical phones and unreliable connections                                    | Signup, first save, draft recovery, exports and navigation work on iPhone Safari and Android Chrome                                                                                 |
| P1       | Give notes and checklists server persistence, with explicit migration              | Local-only data can be transferred to the owning account and retrieved on another device; conflicting edits have defined behaviour                                                  |
| P1       | Support multiple milestones per application                                        | Exam registration, application, recommendation, scholarship and interview dates remain distinct; date, time and timezone are preserved                                              |
| P1       | Better save and recovery feedback                                                  | Show saved/saving/error state; prevent an edited existing application from being restored as a new application without context; recover important work after quota/network failures |
| P1       | Catalogue selection that actually starts a matching application                    | Selecting a public programme preserves it through signup and pre-fills a verified form; an unavailable catalogue does not substitute fictional fees                                 |
| P1       | Central anonymous acquisition and activation measurement                           | A consent-aware measurement decision is made; the same definitions apply across signups and cohorts                                                                                 |
| P2       | CSV import and bulk planning                                                       | Preview imported rows, report invalid dates and duplicates, and confirm before writing                                                                                              |
| P2       | Reliable reminders and weekly return prompt                                        | User opts in, preferences and unsubscribe work, retries do not duplicate mail, and delivery can be audited                                                                          |

The current application has only one main deadline per programme. A CAT applicant may need several distinct milestones; the guide explains a calendar workaround, but a proper milestone model is the next substantial product improvement.

## First fourteen days

Use a ten-hour weekly budget initially. If available time changes, preserve observed user sessions and fixes before content volume.

### Days one and two

1. Confirm the brand, domain and private-pilot deployment destination.
2. Complete the P0 checks above using two disposable accounts. Do not use real applicant documents as test fixtures.
3. Prepare one two-minute recording using fictional data: add a programme, save a draft/note, return to Today.
4. Review both public guides for accuracy and voice. Keep school-specific dates out until they are verified for the right intake.
5. Create a simple recruitment log with segment, source, permission/contact status, session date, task completed, obstacle, next action and follow-up date. Do not store passwords, essays or unnecessary personal details.

### Days three to five

1. Identify ten warm or reasonably reachable applicants, split across the two audiences. Start with people from your own preparation process, peers and introductions; no scraped contact lists.
2. Ask three relevant community organisers or mentors whether they permit a small pilot or checklist workshop.
3. Offer a fifteen-minute setup session and the free template, rather than asking someone to explore an empty product unaided.
4. Conduct three observed sessions. Let the participant operate the product. Ask them to add one real target and save a non-sensitive example; do not take over to make the flow look successful.
5. Fix the most repeated blocking problem before recruiting more people.

### Days six and seven

1. Ask participants what they returned to do and what they still kept in a spreadsheet.
2. Record task time, help needed, failed saves and what they expected the next button to do.
3. Review the week’s evidence separately for CAT-route and experienced applicants.
4. Publish a short founder update about one problem you learned from and the change made. Use a consented or fictional example.

### Week two

1. Reach a total of ten observed pilot participants, ideally five per segment.
2. Run one small “organise your applications” session with an organiser’s permission. Spend most of it on the participant’s planning problem.
3. Send one personal follow-up to opted-in participants after two or three days. A single unanswered follow-up is enough.
4. Review whether they return within seven days and take another meaningful action.
5. Fix the two biggest barriers. Do not launch a broad campaign while account access, saving or deadlines remain unreliable.

Suggested weekly allocation: four hours product work and validation, two hours user sessions, two hours outreach and follow-up, one hour useful content, one hour measurement and triage.

## A first user session

Allow about twenty minutes. Explain that you are testing the product, not the applicant.

1. Ask how they currently track deadlines and preparation. Let them show their method if comfortable; do not request private documents.
2. Open the homepage. Ask what they think the product does and whether anything sounds misleading.
3. Ask them to create an account and add one programme without instructions from you.
4. For a CAT-route applicant, ask them to distinguish exam registration from a school application. For an experienced applicant, ask them to identify the right programme and round.
5. Ask them to save an essay paragraph or interview note, leave the page, and find it again.
6. Ask what is stored with their account and what remains in this browser. Their answer checks whether the help is clear.
7. Ask what would make this worth returning to next week and what they would be unwilling to entrust to it.
8. Record obstacles with screen/step, expected behaviour and outcome. Request explicit consent before recording the session or quoting them publicly.

A recommended pilot gate is eight of ten participants completing the core task without founder rescue, no unresolved data-loss/account-isolation issue, and at least four returning to perform useful work within seven days. These are decision thresholds to test, not industry benchmarks or promised outcomes.

## Outreach channels and implementation

| Channel                                    | Initial action                                                        | Useful offer                                      | What to measure                                          |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| Your MBA preparation network               | Ask ten people individually about their current planning workflow     | A short setup session and blank checklist         | Replies, completed sessions, activated applicants        |
| LinkedIn founder posts                     | Share two specific lessons per week; state that you built the product | A short example and a link to the relevant guide  | Qualified conversations and returning users, not likes   |
| CAT preparation communities                | Ask an organiser about a checklist session or permitted resource post | Application planning without exam coaching claims | Attendees who finish setup and return                    |
| GMAT and experienced-applicant communities | Ask moderators/organisers about a permitted pilot invitation          | Essay and interview story workflow                | Segment-specific activation and weekly use               |
| Independent mentors and counsellors        | Speak with three about repeated administrative/preparation pain       | Help a few applicants organise their own work     | Referred applicants completing the core workflow         |
| Public search guides                       | Improve one useful guide per week from real questions                 | Downloadable tools with clear examples            | Relevant queries, engaged visits and assisted activation |

Recheck each community’s current rules before posting. In particular, GMAT Club’s official rules say AI/LLM-generated posts are not permitted from July 2026. Do not paste the drafts below there; write any permitted contribution yourself and confirm promotional rules with moderators. Partnership enquiries have a separate route. [GMAT Club rules](https://gmatclub.com/forum/gmat-club-rules-209864.html)

Do not purchase lists, mass-message group members, impersonate satisfied users, buy reviews or manufacture admission-success stories. If a user likes the tool, ask whether they want to share its public guide with a friend. Never put their application data into a referral link.

## Outreach drafts

These are drafts for individual, authorised use. No messages have been sent.

### Invitation to an applicant

Hi [name] — I’m applying to MBA programmes too and have been building a small workspace to keep applications, deadlines, essays and interview notes together.

I’m looking for a few Indian MBA applicants to try a fifteen-minute setup session and tell me where it gets confusing. The pilot is free; you can explore the interview question bank and demo flow. AI practice will be included in the opt-in pilot after live validation.

Would this be useful for where you are in your process? I can send the blank checklist first if you prefer.

### Request to a community organiser

Hi [name] — I’m building an application-planning tool for Indian MBA applicants, covering CAT-route programmes and applications for experienced professionals.

I have a free checklist and could run a short session on organising school deadlines and preparation. Would a resource post or small pilot invitation fit your community’s rules? I’ll disclose that I built the tool and keep any promotion within the format you permit.

### Follow up after an opted in trial

Thanks for trying the workspace. Were you able to find your saved [draft/note] again, and was there anything you still preferred doing in your spreadsheet?

I’m deciding what to improve next. One specific frustration would be useful; there’s no need for a polished review.

### Request for an introduction after demonstrated value

You mentioned [specific useful outcome]. If someone in your preparation group has the same problem, you’re welcome to share [public guide link]. I’d be happy to help them set up. There’s no need to share your own workspace or application details.

## Measurement and experiments

**Activation definition:** within seven days of signup, create an application with a valid deadline and save either an essay draft or a preparation note. A timer completion alone is engagement, not proof of a useful saved outcome.

**Weekly retained applicant:** an activated user who returns in a later week and saves/updates preparation or application work. Exclude founder accounts, disposable tests and mere page refreshes. Interpret retention against the admissions cycle: someone who submitted everything may have completed the job rather than abandoned the product.

| Measure                      | Calculation and use                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| First application conversion | New users with at least one saved application / new users in the cohort                                        |
| Seven day activation         | Activated users / signups whose seven-day observation window has elapsed                                       |
| Time to first saved work     | Median and slower-quartile time from signup to the first valid application plus draft/note                     |
| Next week retention          | Eligible activated users with a meaningful action in the following seven-day window / eligible activated users |
| Cost per activated applicant | Channel spend / new activated applicants attributed to that channel; report founder hours separately           |
| Support burden               | Founder minutes spent per activated applicant                                                                  |
| Reliability                  | Failed save attempts / save attempts; record failures and duplicates separately                                |
| Referral value               | Invited friends who activate / invitations the participating users chose to share                              |

Existing public telemetry is only buffered in the browser when signed out; it is not a complete central acquisition funnel. New `application_created`, `essay_saved`, `onboarding_step_opened`, `interview_practice_started` and `interview_practice_completed` events use the existing authenticated ingestion path. Anonymous traffic, source-to-signup attribution and a deduplicated note-save event still need implementation. Do not report a conversion rate until its numerator and denominator are actually captured.

Use simple channel tags such as `utm_source=linkedin&utm_medium=founder_post&utm_campaign=indian_mba_pilot`. Never put an email, school applicant ID or private group name in URLs. Implement an explicit analytics/consent decision before adding third-party tracking. A weekly manual cohort sheet is sufficient for the first ten users.

Initial experiments, one at a time:

1. **Guided setup versus a link alone.** Try five permitted invitations of each type and compare completion, time and support need. Small numbers are directional.
2. **Application checklist versus interview story offer.** Keep the audience segment explicit and compare activated users, not download totals.
3. **Second-visit prompt.** With consent, ask users to finish one already-started task; compare returns with the first week’s baseline. Stop if it feels intrusive or produces no useful action.
4. **Mentor referrals.** Help one mentor’s small group. Continue only if applicants use it themselves and the mentor does not become a manual support bottleneck.

## Search and AI visibility work

The technical instructions are in [SEO implementation and launch checks](SEO_IMPLEMENTATION.md). There is no submission that guarantees recommendations from ChatGPT, Claude, Gemini or every search engine. Search-enabled answers depend on retrieval and selection; answers without web retrieval may not use current site content at all.

Build a small library of original, maintained resources. Start with the two guides shipped here. Next candidates are a source-verified school application checklist, a guide distinguishing exam and application milestones, and a preparation worksheet tailored to early-career examples. Do not create dozens of thin pages by swapping school names.

For programme pages, require exact programme identity, admission cycle, source URL, source checked date and a human review owner. Link to official instructions, distinguish facts from your own planning advice, and make stale data visible. Publish examples from real use only with consent. Add author information only for a real person who accepts responsibility for that content.

Each useful guide should have one clear intent, an answer near the top, descriptive headings, an example, a usable template or method, relevant internal links and a natural next action. Content written from observed applicant problems is more defensible than generic lists of MBA interview questions.

## Weeks three to twelve

| Period     | Focus                                                                                                       | Decision gate                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Weeks 3–4  | Fix the repeated pilot obstacles; build milestones and dependable persistence before adding surface area    | Core tasks work without founder rescue and users return for actual work                               |
| Weeks 5–6  | Test one community or mentor channel; maintain source-backed content and examine search indexing            | The channel produces activated applicants at sustainable support cost                                 |
| Weeks 7–8  | Evaluate the implemented AI interview experience with opt-in transcripts and a fixed evaluation set | Follow-ups are relevant, feedback cites the applicant’s actual answer, and failures/costs are bounded |
| Weeks 9–12 | Run an opt-in interview beta and test willingness to pay for a specific completed experience                | Users choose to repeat, can identify useful feedback, and actual paid demand supports costs           |

This sequence is conditional, not a promise that a ten-hour-per-week founder will finish every phase in twelve weeks. Reduce feature scope if validation or reliability work takes longer.

## Interview feature and revenue path

Prototype one clear session: choose a programme/application context, answer an opening question, receive a relevant follow-up, finish, and get a short evidence-based debrief with one retry exercise. Cover early-career and experienced examples without assuming employment history for everyone.

Keep the interview state, question selection, transcript, evaluation rubric and provider adapter separate. Version the prompts and rubric. Start with a small set of consented or synthetic transcripts, score feedback usefulness and factual grounding, then add realtime voice only when the underlying experience works. Do not train a model on scraped successful essays or infer admissions probabilities.

Before charging, implement authentication, usage limits, cancellation, failed-session handling, cost accounting, deletion and an understandable data policy. A feedback report should quote the relevant answer, explain the issue, and offer a specific improvement. Use at most a few priority findings instead of an intimidating multi-score dashboard.

Keep the tracker free during discovery. Test a clearly bounded interview pack later; use interviews to learn what applicants value before selecting a rupee price. Separate provider cost, infrastructure, payment fees, refunds and support time when calculating contribution margin. Do not sell an annual subscription simply because the app can support one; admissions preparation is often seasonal.

Suggested spending: no paid acquisition in the first two weeks. Consider a small capped experiment only after activation and reliability gates pass. Record a hypothesis and stop condition before spending; do not use ad traffic to compensate for weak retention.

## The next launch decision

After the first ten users, choose the next two weeks based on evidence: improve the CAT milestone workflow, deepen the experienced-applicant preparation workflow, or fix a shared reliability problem. Keep both audiences welcome while investing in the clearest demonstrated need. The next external step is a private, supported pilot after the release checks, not an unqualified public launch.
