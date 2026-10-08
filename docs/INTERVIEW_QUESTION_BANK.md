# MBA interview question graph

Content version: `2026-10-08.2`. Initial 80-question bank curated on 8 October 2026 from four user-owned Notion preparation pages read through Edge. Notion was not edited.

## Coverage

95 questions; 22 entry points; 77 directed connections. The additional 15 original practice questions cover academic understanding, academic projects, internships, workplace decisions and disagreement; they are labelled `practice-editorial`, not attributed to Notion or schools. The first pass covers motivation, programme fit, career goals, projects, leadership, setbacks, self-awareness, business, AI, side projects, reapplications, interests, values, contribution and closing questions.

Sources reviewed:

| ID | Notion page | Question sections used |
| --- | --- | --- |
| `iima` | IIMA PGPX Interview — Handbook (2 Oct 2026) | Opening, MBA/now, goals, project and behaviour probes, industry, closing |
| `iimk` | IIMK PGP-BL Interview — Handbook (11 Oct 2026) | Motivation, goals, leadership, personal questions, contribution, closing |
| `faq` | Mock Interview FAQs — 2026 Rewrite | Pillars 1–3, explicit cross-questions, follow-ups on claims, industry/product questions |
| `projects` | Side Projects — Likely Qs & How to Answer | Question headings for the review-analysis project and master's tracker |

Only question prompts were adapted. No personal answers, coaching instructions, private contacts, compensation details or private Notion URLs are included. Project/employer-specific prompts were generalised. The bank does not certify that questions were actually asked by a school, or that school-specific claims elsewhere in the source notes are accurate.

This is a first curated pass, not an exhaustive export of the Notion workspace. The material is strongest for experienced applicants. Broad questions also support CAT applicants; degree-specific academic reference material and current-affairs coverage remain content gaps. There is no claimed dedicated IIMC, IIML or ISB coverage yet. Do not label it a complete school-specific bank.

## Graph contract

Canonical content: `backend/content/interview_questions.json`. The authenticated `/interviews/questions` endpoint serves this same source of truth to the UI. The backend can also provide a selected branch to the interviewer.

- **Node:** stable ID, question text, topic, applicable routes, source IDs, optional `specialist` flag. No answer, hint, scoring or coaching fields.
- **Root:** an opening/first-order question. It can start a mock session.
- **Edge:** parent → possible follow-up. `source_follow_up` means the source explicitly places the question as a follow-up/probe; `editorial_connection` means the link was inferred while organising existing questions.
- **Order:** calculated from the current path. A shared question may be second-order on one branch and third-order on another. The underlying graph supports deeper branches too; it is not a fixed script.
- Source wording is adapted; even explicit links are examples of possible questioning, not predictions of actual interviews.

Examples:

1. Why MBA now? → Is an MBA necessary? → Why not try product management first?
2. What is your industry outlook? → How would you assess expansion alongside staff cuts? → What would concern you as a board adviser?
3. How is AI changing your role? → What if the tool produces an incorrect result? → How did you verify an AI-generated query?

The browser shows eight openings at a time, searchable across questions, with a topic filter and one expanded branch. Ancestors remain visible as a vertical path; users can go back or start practice from that path's opening. Source details and connection provenance are available without adding answer tips.

## Maintenance

1. Read a specific source page and extract its question prompts only.
2. Remove personal details and check for duplicates; attach the source ID.
3. Set route applicability from the wording. Do not presume work experience for CAT applicants.
4. Add edges only when meaningful. Use `editorial_connection` unless there is explicit source evidence of a follow-up.
5. Increment the content version. Keep old node IDs stable so saved sessions remain intelligible.
6. Run the question-bank/API tests. The loader checks missing endpoints, orphan questions and cycles; tests also check references, duplicate edges, allowed content fields and route selection.

Before expanding claims of school coverage, review the remaining handbooks and add a curated CAT academic/current-affairs set. Keep time-sensitive facts outside question wording unless the question is explicitly a hypothetical.

## Private résumé graphs

Applicants can now generate a separate, account-owned graph from reviewed résumé text. These private sets are separate from the curated bank and its Notion provenance. Each private graph has three roots, nine nodes and six `ai_connection` edges; nodes add `evidence_quote`, validated as an exact substring of the supplied résumé. `resume-v2` adds up to 12 categorised profile excerpts, each matched exactly to the reviewed text. Applicants select facts before using them in a session. Old `resume-v1` question sets remain readable without a profile. AI connections are explicitly labelled and sources remain inspectable. A selected private root can start a saved practice session. See [setup and privacy details](INTERVIEW_SETUP.md#résumé-based-question-sets-8-october-2026).

## Live interviews and specialist questions

The general bank hides specialist technology/product prompts by default; applicants can deliberately include them. Résumé-derived questions use the actual uploaded background. Programme type is the primary UI choice; `cat` is the legacy API identifier for two-year preparation, not an exam-eligibility rule.

`mba-interview-v2` uses a versioned practice plan plus the transcript. Live follow-ups are generated from the latest answer, with an exact quote and turn reference checked server-side. Repeated questions and invalid anchors are rejected; these checks establish provenance, not semantic quality. Balanced interviews allow two follow-ups in a branch before moving on; focused practice allows four. The model may move sooner after uncertainty or an exhausted topic. The demo remains explicitly fixed.
