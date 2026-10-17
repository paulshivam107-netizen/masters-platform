# Interview-first plan: task list

Details and acceptance criteria are in [plan.md](plan.md).

## Phase 1: this PR (branch `go-global`)
- [x] Task 1: Site copy for MBA, EMBA and MiM applicants
- [ ] Task 3a: Speak to the applicant: hero, in-app language, "Why MBA" as the first step
- [x] Task 3b: Interview-first navigation (Today, then Interviews)
- [x] Task 2b: Conservative AI caps (₹50/day global, ₹5/day per user) + owner sets the OpenAI hard limit
- [ ] Checkpoint A: tests, build, screenshots
- [ ] Task 2: One flow. The résumé unlocks the full interview; without one, a 3-question "Why MBA" taster, once per account. Demo only when AI is off
- [ ] Task 3: Global, stage-aware interviewer prompt v11 + R07 dev re-run + 3 non-Indian profiles (cents, owner OK'd)
- [ ] Checkpoint B: owner reviews the R07 report
- [ ] Open one PR (don't merge)

## Phase 2: reasons to come back
- [ ] 2.1 Evidence levels per dimension in the debrief (quote-backed, verbatim-checked). Backend done (prompt v12); debrief UI and live re-score pending
- [ ] 2.2 "Interview readiness" /100, computed by fixed arithmetic + trend + "how it's calculated". Score in API (3+ assessed areas, else "partial"); UI pending
- [ ] 2.3 Interview count, latest score and history on Today
- [ ] 2.4 Admin metric: interviews per user, 7-day return. In /admin/overview; admin UI pending

## Phase 3: school interview pages (indexed before January)
- [ ] Owner: turn on indexing (Cloudflare `REACT_APP_ALLOW_INDEXING=true`) + Search Console, once PR #26 and this PR are live
- [ ] 3.1 Template + data model + ISB, IIMA, INSEAD (owner reviews)
- [ ] 3.2 India: the other 12
- [ ] 3.3 US: top 15 incl. the M7
- [ ] 3.4 Europe: top 15
- [ ] 3.5 Asia: NUS, NTU, HKUST, HKU, CEIBS

## Phase 4: a more real interview
- [ ] Dictation button (being built now)
- [ ] Voice-first panel mode
