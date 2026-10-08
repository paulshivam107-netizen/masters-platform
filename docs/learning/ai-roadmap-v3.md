# AI learning roadmap v3: understand it, build it, judge it

**Updated:** 8 October 2026\
**Starting point:** five years of Java/backend experience; some Python, API, and Git experience to refresh.\
**Primary language:** Python. **Pace:** six focused hours in a normal week, up to ten when useful. Week numbers below mean *active* weeks; a trip, interview week, or difficult week can pause the sequence.\
**Near-term constraint:** executive MBA interviews are expected to finish by 31 October 2026. Protect preparation time until then. There is no February completion deadline.

## What this plan is for

Build enough understanding and evidence to pursue two directions while MBA decisions are pending:

1. **Engineering:** a backend engineer who can design, implement, evaluate, and operate AI features. Applied AI engineering can become a later target if the work and job descriptions point that way. Training foundation models is a separate specialization.
2. **Product management:** a PM who can identify a useful AI opportunity, choose an appropriate solution, work closely with engineers, and measure whether users benefit.

One substantial project should produce **two different stories**: an engineering walkthrough of architecture, tests, evaluations, reliability, and tradeoffs; and a PM case study of user need, alternatives, decisions, measures, and feedback. A small paid pilot is an optional third outcome. Neither an MBA decision nor a calendar date determines when to start exploring jobs.

This is a path to credible *applied* AI skill, not a promise that a fixed number of weeks guarantees a job. Use real job descriptions and interview feedback to choose the next gap to close.

## The weekly routine

- **Six-hour core:** about one hour learning, three hours building, one hour inspecting outputs and tests, and one hour on the PM/user side. Through October, use the PM hour for MBA interview preparation when needed.
- **Optional four hours:** deepen the current build or evaluation (two hours), speak with a user or write a decision note (one hour), and practise an interview or review role descriptions (one hour). Do not add a new framework just because extra time is available.
- **Each session:** write what you expect to happen; run the smallest experiment; inspect one failure; write two or three sentences explaining what changed.
- **Each week:** keep a short learning log: concept in plain language, evidence from a run, an unanswered question, and the next experiment. Review the previous week's log from memory before reading more.

### Use an AI coding assistant without outsourcing understanding

Use one assistant you already have access to. Give it a small task and acceptance criteria. Inspect its diff, run the code and tests, and trace one request from input to output. For each new concept, first implement or explain one minimal example yourself, then let the assistant accelerate the larger version. Ask it to challenge your assumptions and suggest edge cases. You should be able to explain every dependency and important code path in the finished project.

## Setup for a MacBook Air M4, 16 GB RAM, 512 GB storage

**Install only for the current phase:** a supported Python version, Git, an editor, and a Python virtual environment. Add `pytest` in Week 1, an API SDK in Week 2, NumPy in Week 4, and FastAPI in Week 10. Keep a dependency file or lock file so the project can be recreated. Use a private Git repository for learning notes and code; commit synthetic examples, not personal essays, credentials, customer data, or private work documents.

Choose **one** model API provider for the first experiments. Check its current pricing and usage controls, set a spend alert or hard cap where supported, and record tokens and cost from actual runs. Never put an API key in source control. A cloud API is the baseline for learning application behaviour; it avoids making local model performance a prerequisite.

**Optional local experiment, after Week 3:** use Ollama with one quantized model of roughly 3–4 billion parameters, then compare its output and speed with the API baseline. The [Ollama model library](https://ollama.com/library/qwen3/tags) lists a 4B option with a roughly 2.5 GB download; runtime memory also depends on context length and other open apps. Start small and monitor your laptop. You do not need Postgres, Redis, Qdrant, containers, or local fine-tuning to begin. A tiny model or attention calculation for learning is different from training a competitive LLM.

**Data rule:** use public or synthetic material for portfolio demos. Keep MBA essays and interview notes private; decide deliberately before sending any personal text to an external API. If you cannot test with real users or permitted data, label product validation as pending.

**Budget:** the listed tutorials, Python tools, and local exercises are free. Plan for a small pay-as-you-go API budget from Week 2; check live prices and choose your own monthly ceiling before calling a model. An AI coding assistant subscription, the reference book, and hosting are optional. Record actual spend instead of assuming that a fixed rupee amount will cover every model or experiment.

## Weekly plan

### Weeks 1–3: regain momentum during MBA interview season

**Week 1 — Python bridge and a tiny working program**

- Learn Python's functions, dictionaries, lists, type hints, exceptions, file I/O, virtual environments, and package installation. Map each to what you already know from Java. Read only the matching sections of [R1].
- Build a command-line program that reads a small JSON file of *synthetic* interview questions, filters by topic, and writes a practice-session result to JSON. Add three `pytest` tests: normal input, missing field, and empty input. Use [R2].
- Write down the input schema, expected output, and failure behaviour before asking an AI assistant to help. Review every generated change.
- **Done when:** you can run the program and tests from a clean virtual environment and explain the main path without opening the code.

**Week 2 — what an LLM actually does**

- Watch [R3] in parts. Explain tokens, next-token prediction, context, sampling, pretraining, and post-training in your own words. Use [R4] for a visual explanation of embeddings and attention; skip detailed calculus for now.
- Write a tiny word- or character-level *bigram* predictor from counts in a short public text. Generate a few tokens. Note why it is much weaker than an LLM, while sharing the next-token idea.
- Make one API call using [R5]. Run the same prompt more than once; vary one input or generation setting at a time. Save the model identifier, inputs, outputs, latency, and usage. Do not commit secrets or personal material.
- **Done when:** you can sketch `text → tokens → model → next-token probabilities → sampled output` and describe why the same prompt can yield different answers.

**Week 3 — structured output and a useful small tool**

- Learn the difference between a prompt asking for JSON and a schema-constrained response using [R6]. Add a function that generates one follow-up practice question and returns a typed result. Your program should reject or safely handle an invalid result.
- Make 10 sample inputs and inspect the outputs yourself. Note at least three failure modes: irrelevant follow-up, repeated question, unsupported assumption, or malformed result.
- Use the tool for a short practice session if helpful, then complete one concrete MBA preparation task such as rehearsing a career story aloud. Keep the tool small; do not build a full application platform this month.
- **Done when:** the tool handles the 10 cases predictably enough for your own use, and you can describe its limits honestly.

### Weeks 4–6: concepts and problem selection

**Week 4 — ML literacy and transformer mental model**

- Read the classification and overfitting sections of [R7]. Classify 20–30 synthetic support messages with a simple rule or small model; calculate a confusion matrix, precision, and recall yourself. Change the decision rule and describe the tradeoff.
- Revisit [R4]. With NumPy, compute a small dot product and softmax over three toy vectors to see how attention weights arise. The goal is to understand the flow, not to train a transformer.
- Write one page explaining training versus inference, embeddings versus generation, and why a held-out example matters.
- PM lens: explain how a false positive and a false negative would affect a user differently in the chosen support example.
- **Done when:** you can explain those ideas to a non-engineer and calculate precision and recall from four counts.

**Week 5 — choose one flagship user problem**

- List three candidate problems: for example, public-document Q&A, synthetic support-ticket triage, or a narrow CSV validation and explanation tool. Score each for user access, frequency and cost of the problem, permission to use data, verifiability, and portfolio value.
- Speak with three people who encounter the problem, if accessible. Ask them to show the current workflow and a recent example. Record their words and the existing non-AI alternative; avoid pitching a solution first. Read the user-needs part of [R8].
- Write a one-page opportunity brief: user, task, existing approach, where it fails, a simple non-AI baseline, proposed AI role, success measure, and failure cost. If conversations are unavailable, choose a learning problem and mark market validation pending.
- Stretch task: scan five current role descriptions across backend-with-AI and AI PM. Note which skills recur; repeat the scan more broadly in Week 15.
- **Done when:** you can explain why this problem warrants an AI experiment and what evidence would make you stop.

**Week 6 — embeddings and search from scratch**

- Read [R9]. Create about 50 public or synthetic short documents. Implement a keyword baseline, then get embeddings and rank documents by cosine similarity with NumPy. Store source ID and text alongside each vector. A vector database is unnecessary at this scale.
- Write 15 realistic questions with a relevant source document for each. Compare top-three retrieval for keyword and semantic search; inspect misses instead of declaring a winner from a few examples.
- Write a short PM note: which user questions improve, which get worse, and whether search itself solves the task.
- **Done when:** you can explain an embedding, cosine similarity, and one case where semantic search fails.

### Weeks 7–10: build and measure one AI feature

**Week 7 — minimal RAG, only if the problem needs retrieved context**

- Split documents into sensible passages with stable source IDs. Retrieve a few passages, give them to a model, and ask for an answer with source references. Include an explicit “cannot answer from these sources” outcome. Keep the direct prompts and responses visible; consult [R10] as a reference.
- Test questions with an answer, no answer, ambiguous wording, and conflicting documents. Record whether a bad answer came from retrieval or generation.
- If the chosen problem is structured CSV validation, build the deterministic validator first and use the model only for explanations. Document why RAG was unnecessary.
- PM lens: decide what the user should see when sources disagree or the system cannot answer.
- **Done when:** you can trace each answer to its input and source, or explain why it had no source.

**Week 8 — improve the specific failures you found**

- Try one change at a time: passage boundaries, metadata filtering, keyword plus semantic search, or reranking. Keep the earlier version for comparison. Do not add every technique by default.
- Increase the question set to 20–25, including observed failures. Keep several examples aside while tuning. For each change, record quality, latency, and API usage.
- Make a short engineering note: the change, the hypothesis, the measured result, and an example it still gets wrong.
- PM lens: ask whether the observed improvement matters enough to justify added latency and cost.
- **Done when:** you can show a specific improvement or a justified decision to revert.

**Week 9 — evaluation and error analysis**

- Grow toward 30–50 varied examples as time permits: common tasks, edge cases, ambiguous requests, unsupported requests, and adversarial content. Label expected sources and acceptable outcomes where possible. Review actual outputs before automating judgments. Use [R11] and [R12].
- Report retrieval hit or recall at a chosen `k` **where retrieval exists**, answer correctness or task success from human review, unsupported-claim rate, abstention behaviour, latency, and cost per *successful* task. Keep retrieval and answer metrics separate.
- Add code checks for conditions a program can verify. If using an LLM judge, compare its decisions with your own labels before trusting its score.
- PM lens: propose a tentative quality and failure threshold based on the user's task, then revisit it after user testing.
- **Done when:** the test set and failure notes reveal what to fix next, and you can explain the limits of each metric.

**Week 10 — make it a small service**

- Use the first steps of [R13] to expose one FastAPI endpoint. Define request and response schemas, validate inputs, return useful errors, and add tests for the endpoint and one upstream API failure.
- Record model identifier, prompt version, source IDs, usage, and latency per request. Avoid logging private text by default.
- Draw the request path from client to retrieval or tool, model call, validation, and response. Explain where time and money are spent.
- PM lens: sketch the response the user sees, including source evidence, correction, and a clear failure state.
- **Done when:** another developer can run the service locally from the README and reproduce a sample request.

### Weeks 11–14: product evidence, reliability, and controlled autonomy

**Week 11 — test the user experience and PM case**

- Ask three to five representative people to attempt a real task with the prototype, if available. Observe where they hesitate and how they check an answer. Read feedback, control, and error-handling sections of [R8].
- Measure task completion and time or effort compared with the existing approach. Note the cost of a wrong answer and offer a clear correction or fallback path.
- Write a one-page PRD or decision memo: user problem, alternatives considered, chosen design, success and guardrail metrics, results so far, and what remains unverified.
- **Done when:** you can separate decisions supported by observed users from hypotheses that still need a trial.

**Week 12 — reliability, privacy, and cost**

- Add bounded retries, timeouts, input limits, safe error messages, and a way to stop unexpectedly expensive calls. If hosting or sharing, add appropriate access control and rate limits. Read [R14].
- Test one malicious or misleading passage that tries to change the model's instructions. Keep retrieved content as data; give tools only the permissions they need. Use [R15].
- Compare two sensible model or prompt configurations on the same held-out cases. Record the quality, latency, and cost tradeoff. Keep the cheaper choice only if it meets the user's task.
- PM lens: document what data the product needs, what it stores, and what a user can correct or remove.
- **Done when:** the README states data handling, known failure modes, a cost estimate based on measured runs, and how to recover from API failure.

**Week 13 — tool calls, workflows, and agents**

- Read [R16]. Implement one narrow *read-only* tool, such as looking up a public source or retrieving a synthetic ticket. First call it through a fixed workflow; then let a model choose when to call it. Inspect the tool arguments and trace.
- Set a maximum step count, time budget, and explicit stop or human-review condition. Test 10–15 tasks including a bad tool result and an instruction hidden in retrieved text. Compare task success and cost with the fixed workflow.
- Add an MCP server only if you want to learn the integration protocol or a useful client needs it; use [R17]. Keep the underlying tool's behaviour separately testable.
- PM lens: specify when the workflow asks a person to review an action or an uncertain answer.
- **Done when:** you can explain when the model-controlled loop helped, when it hurt, and what authority the tool has.

**Week 14 — share a controlled beta**

- Deploy only with public or synthetic demo data. Add a simple access boundary, rate limits or quotas, a visible feedback path, and usage monitoring. If those are not ready, share a local recorded demo and keep deployment as the next milestone.
- Ask a few users to complete a task without your help. Record failures and one improvement you will make. Update the eval set with useful new cases.
- **Done when:** another person can try the feature safely and you can observe whether it helps. A URL alone is not the outcome.

### Weeks 15–16: turn the work into career evidence

**Week 15 — two portfolio narratives**

- Engineering: write a README and a short architecture walkthrough covering model choice, data flow, retrieval or tool design, evaluations, tests, cost, reliability, security, and remaining limitations. Practise explaining one failed experiment.
- PM: write a case study covering user problem, non-AI alternative, discovery, success measure, tradeoffs, observed use, and the decision you made. A polished feature demo without user evidence should be labelled a prototype.
- Review 10–15 current job descriptions across backend-with-AI, applied-AI, and technical/AI PM roles. Mark common requirements, evidence you already have, and two gaps to work on next. Do not choose a role based only on a title.
- **Done when:** you can tell both stories in five minutes each and show the code, results, and decisions behind them.

**Week 16 — interview practice and next gate**

- Practise three engineering discussions: design the system, diagnose a failed answer, and explain an eval or cost tradeoff. Practise two PM cases: choose whether AI belongs in a workflow and decide whether to launch after mixed results.
- Re-run the held-out examples, check the demo and README, and list the exact claims the project supports. Start targeted applications or informational conversations when the evidence is credible; an MBA decision is not a technical readiness test.
- Set the next six-week focus from the role scan and actual feedback: deeper Python/backend reliability, applied-AI evaluation, product discovery, or a second domain. If admitted, adjust the pace; if not, increase job-search activity as circumstances allow.
- **Done when:** you have a clear next skill gap and a portfolio story you can defend under questioning.

## Optional side-income experiment

Start when the flagship feature works and you can reach potential users. Ask two or three people about one repetitive, costly task; make a narrowly scoped demo with permitted data; propose a small paid pilot only if someone wants to use it. A CSV check with AI explanations or a support workflow may be easier to verify than a general chatbot. Define the deliverable, data permissions, human review, price, and support boundary before accepting work. Treat revenue as a hypothesis, not a graduation requirement for this roadmap.

## Progress gates

- **After Week 4:** explain token prediction, attention at a high level, training versus inference, precision/recall, and the request path of a Python model call. If one is unclear, repeat a small experiment before advancing.
- **After Week 9:** demonstrate a baseline, a changed system, and inspected examples that reveal what improved or regressed. If the problem is not evaluable, narrow it.
- **After Week 14:** a representative user can attempt a task, and you can describe safety, cost, quality, and limits. If not, keep it a prototype and improve the missing piece.
- **After Week 16:** test your story against real job requirements and interview questions. Extend or change direction based on the evidence.

## Resources: open only when the week calls for them

**Foundations**

- **R1 — [The Python Tutorial](https://docs.python.org/3/tutorial/)**: sections on control flow, data structures, modules, errors, and virtual environments. Written for people who already know programming.
- **R2 — [pytest: Get Started](https://docs.pytest.org/en/stable/getting-started.html)**: enough to write and run a few meaningful tests.
- **R3 — [Andrej Karpathy, Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g)**: first conceptual overview. Pause to draw the process yourself.
- **R4 — [3Blue1Brown, Neural Networks and Transformers](https://www.3blue1brown.com/topics/neural-networks)**: watch the LLM, transformer, and attention lessons selectively. For a deeper optional treatment later, use [Karpathy's Deep Dive](https://www.youtube.com/watch?v=7xTGNNLPyMI).
- **R7 — [Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course)**: classification metrics and overfitting sections, with exercises.

**Building**

- **R5 — [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)**: one example provider for a direct Python model call; verify its current models and pricing when you start. Equivalent provider documentation is fine.
- **R6 — [Structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)**: compare schema-constrained output with a plain request for JSON.
- **R9 — [Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)**: vectors and cosine similarity; use the concepts with any suitable provider.
- **R10 — [Retrieval guide](https://developers.openai.com/api/docs/guides/retrieval)**: reference for retrieval and grounded answers. Read it after building simple search yourself.
- **R13 — [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)**: first steps, request/response models, and error handling.

**Measuring, product, and shipping**

- **R8 — [Google People + AI Guidebook](https://pair.withgoogle.com/guidebook-v2/chapters)**: user needs, feedback/control, and graceful failure. Use its questions on your own product rather than reading it all at once.
- **R11 — [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)**: task-specific examples, human review, and continuous improvement. The concepts apply even if you build a local harness rather than using a hosted eval product.
- **R12 — [Hamel Husain and Shreya Shankar, AI Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)**: practical error analysis and judge validation. Read the minimum-viable-eval and relevant failure-mode questions first.
- **R14 — [Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)**: API key handling, usage controls, rate limits, and operational checks; confirm controls with your chosen provider.
- **R15 — [OWASP prompt injection guidance](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)**: threat examples and mitigations for retrieved content and tools.
- **R16 — [Anthropic, Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)**: conceptual difference between fixed workflows and model-directed agents. The article notes that some tooling details have changed since publication.
- **R17 — [MCP Python SDK: Get Started](https://py.sdk.modelcontextprotocol.io/get-started/)**: optional hands-on protocol exercise once a useful tool exists.

**Reference book, optional:** Chip Huyen, *AI Engineering* (O'Reilly). Read the chapter matching the current problem rather than reading cover to cover. The free resources above are sufficient to start.

## Success checklist

- [ ] Explain LLM generation, attention, embeddings, training versus inference, and model limitations in plain language.
- [ ] Write Python scripts and tests without relying on an agent to define the expected behaviour.
- [ ] Build and compare a non-AI baseline, semantic search, and an AI feature where appropriate.
- [ ] Keep real examples, failure notes, and an eval set; demonstrate a measured change and its tradeoffs.
- [ ] Show API error handling, cost tracking, access controls appropriate to the demo, and a safe failure path.
- [ ] Explain a fixed workflow and a tool-using agent, including when the extra autonomy helped.
- [ ] Produce an engineering walkthrough and a PM case study from the same project.
- [ ] Test with representative users where possible; label any untested product claims.
- [ ] Map the portfolio against current job descriptions and practise role-specific interviews.
