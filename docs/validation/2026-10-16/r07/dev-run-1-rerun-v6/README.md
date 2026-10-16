# R07 dev run 1 — v6 rerun of the 4 stuck profiles

Run `20261016T062811855621Z-openai-gpt-4.1-mini`, commit `12889df` (prompt `mba-interview-v6`, plan `resume-led-v2`). Cost ₹3.01.

- cat-06, exp-02 and exp-10 now complete. Follow-ups returned to earlier answers where that helped: cat-06 q6 went back to a4 after a confidential answer, and q7 went back to a3 after an "I don't know".
- exp-12 is still stuck at a4. All 3 attempts quoted "I can't tell you the target…", but the answer says "I **also** can't tell you…". A dropped word is a real misquote, and the strict check is right to reject it.
- exp-12 résumé generation failed all 3 attempts. The model spliced separate résumé lines into one "quote" (for example "Customer Service Officer, same bank (2020-2021). Relationship Manager…"). Correctly rejected.
- exp-10 a2 (recovered on retry): a clarification labelled as being about the vague latest answer quoted a figure that wasn't in it.
