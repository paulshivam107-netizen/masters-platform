# R07 provider evaluation — status, 16 Oct 2026

Model `gpt-4.1-mini` (Responses API, strict JSON schema). Harness: `backend/evals/r07/` (see its README). Live spend so far is **₹56.24**.

## Runs (newest last)

| Folder | Prompt | Scope | Cost | Outcome |
| --- | --- | --- | --- | --- |
| `dev-run-1/` | v5 | 24 dev | ₹17.05 | 20/24 completed; 30 failed attempts; AI pre-review in `ai-review.md` |
| `dev-run-1-rerun-v6/` | v6 | 4 stuck | ₹3.01 | 3/4 completed |
| `dev-run-2-v7/` | v7 | 24 dev | ₹17.03 | 24/24 completed; 3 failed of 160 attempts, all recovered; stops handled; contradictions still built on (10/11) |
| `contradictions-v8/` | v8 | 12 (contradiction + injection) | ₹10.16 | contradictions clarified 9/11 (was 1/11); 6 fallbacks caused by an over-strict v8 rule, fixed in v9 |

v9 (`56e5f4c`) has **not been run live**.

## What changed, by prompt version

- **v3:** an exhausted branch is locked to `new_topic` by the schema.
- **v4/v5:** cosmetic quote slips and ellipses are tolerated. Every stored quote is still verbatim.
- **v6:** a follow-up may return to an earlier answer; a clarification must target the latest one.
- **v7:** stop requests are detected on the server. The debrief no longer penalises confidentiality, unknowable figures, disagreement, off-topic remarks or stopping. Suggestions must be concrete.
- **v8:**
  - A `conflict` field comes first in the output schema; a stated conflict forces a clarification.
  - `end_requested` is server-only, so an injected "stop interviewing" can no longer end a session.
- **v9:** one clarification is allowed at the branch limit.

Fallbacks:
- Grounded parts of résumé drafts and debriefs are kept.
- The third try of an answer uses a fixed question at no cost.

## Open before R07 can close

1. **One v9 run on the dev split, then one on held-out (about ₹22).** Needs the owner's go-ahead.
2. **Human review** of the latest run's CSVs. `ai-review.md` is an AI pre-review, not the gate.
3. **AI-review items not yet measured after v7:**
   - debrief fairness on confidential, disagree and stop answers;
   - whether suggestions are actionable;
   - near-repeat questions. The automatic check only catches near-identical text.
4. **Replace the R05 placeholder prices.** Measured cost is about ₹0.6–0.85 per 5–8-answer text session at the builtin `gpt-4.1-mini` price, which should be checked against OpenAI's pricing page. Reservations are about 3× actual input, so they are conservative.
