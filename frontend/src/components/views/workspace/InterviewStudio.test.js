import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InterviewStudio from "./InterviewStudio";
import * as api from "../../../api/interviewsApi";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 99, name: "Asha Rao" } }),
}));
jest.mock("../../../app/workspaceStorage", () => ({
  readUserValue: jest.fn((_user, _key, fallback) => fallback),
  writeUserValue: jest.fn(() => true),
}));
jest.mock("../../../api/interviewsApi", () => ({
  getInterviewCapabilities: jest.fn(),
  listInterviews: jest.fn(),
  createInterview: jest.fn(),
  getInterview: jest.fn(),
  answerInterview: jest.fn(),
  interviewError: jest.fn(),
}));
jest.mock(
  "./ResumeQuestionBuilder",
  () =>
    function Builder({ onUseProfile }) {
      return (
        <button
          onClick={() =>
            onUseProfile({
              id: "private-profile",
              route: "experienced",
              facts: [
                {
                  id: "fact-1",
                  evidence_quote: "Built monitoring",
                  category: "experience",
                },
              ],
            })
          }
        >
          Use reviewed profile
        </button>
      );
    },
);
jest.mock(
  "./InterviewQuestionBank",
  () =>
    function Bank({ onChoose }) {
      return (
        <button
          onClick={() =>
            onChoose({
              id: "story",
              routes: ["cat", "experienced"],
              text: "Tell me about yourself.",
            })
          }
        >
          Use shared opening
        </button>
      );
    },
);
jest.mock("./FocusedPractice", () => () => null);
let root, container;
const button = (text) =>
  [...container.querySelectorAll("button")].find((item) =>
    item.textContent.includes(text),
  );
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => "test-request-id" },
  });
  jest.clearAllMocks();
  readUserValue.mockImplementation((_u, _k, f) => f);
  api.getInterviewCapabilities.mockResolvedValue({
    chat: true,
    voice: true,
    message: "Connected",
  });
  api.listInterviews.mockResolvedValue({ items: [], has_more: false });
  api.createInterview.mockResolvedValue({
    id: "session-one",
    provider: "openai",
    mode: "chat",
    status: "active",
    version: 1,
    answer_count: 0,
    question_limit: 5,
    context: { school: "Test School", programme: "MBA", route: "experienced" },
    transcript: [
      { id: "q1", role: "assistant", text: "Tell me about yourself." },
    ],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("a reviewed resume and common opening combine without turning the common question into a private question", async () => {
  await act(async () =>
    root.render(
      <InterviewStudio
        applications={[
          { id: 42, school_name: "Test School", program_name: "MBA" },
        ]}
        selectedApplicationId={42}
      />,
    ),
  );
  await act(async () => button("Use reviewed profile").click());
  await act(async () => button("Use shared opening").click());
  const focus = container.querySelector("#studio-focus");
  await act(async () => {
    focus.value = "resume";
    focus.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () =>
    container
      .querySelector("#studio-start-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(api.createInterview).toHaveBeenCalledWith(
    expect.objectContaining({
      profile_set_id: "private-profile",
      profile_fact_ids: ["fact-1"],
      question_id: "story",
      question_set_id: null,
      route: "auto",
      kind: "full",
      practice_focus: "resume",
      application_id: 42,
    }),
    expect.any(AbortSignal),
  );
  expect(container.textContent).toContain("Tell me about yourself.");
  expect(writeUserValue).toHaveBeenCalledWith(
    99,
    "interview_preferences",
    expect.not.objectContaining({ route: expect.anything() }),
  );
});

const render = (props = {}) =>
  act(async () =>
    root.render(<InterviewStudio applications={[]} {...props} />),
  );
const submitForm = () =>
  act(async () =>
    container
      .querySelector("#studio-start-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
const tick = (fn) => act(async () => fn());
const choose = (value) =>
  tick(() =>
    container
      .querySelector(`input[name="studio-path"][value="${value}"]`)
      .click(),
  );

test("Start interview is visible without a résumé and creates a general full interview", async () => {
  await render();
  await choose("general");
  expect(container.textContent).not.toMatch(/taster|Why MBA interview|demo/i);
  expect(container.querySelector('[data-testid="resume-cta"]')).toBeNull();
  await tick(() => button("Start interview").click());
  const sent = api.createInterview.mock.calls[0][0];
  expect(sent).toEqual(
    expect.objectContaining({
      kind: "full",
      provider: "openai",
      profile_set_id: null,
      question_set_id: null,
    }),
  );
  expect(container.textContent).toContain("Tell me about yourself.");
});

test("Chat/Voice toggle sets the mode and voice is hidden when unavailable", async () => {
  await render();
  await choose("general");
  await tick(() => button("Voice").click());
  await tick(() => button("Start interview").click());
  expect(api.createInterview.mock.calls[0][0].mode).toBe("voice");
  await act(async () => root.render(null));
  api.getInterviewCapabilities.mockResolvedValue({ chat: true, voice: false });
  await render();
  expect(button("Voice")).toBeUndefined();
});

test("when live AI is off only a plain fallback is offered", async () => {
  api.getInterviewCapabilities.mockResolvedValue({
    chat: false,
    voice: false,
    message: "AI practice is not connected yet.",
  });
  await render();
  expect(
    container.querySelector('[data-testid="demo-notice"]').textContent,
  ).toContain("AI interviews are temporarily unavailable");
  expect(button("Start practice")).toBeDefined();
  await submitForm();
  expect(api.createInterview).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "demo", kind: "full", route: "auto" }),
    expect.any(AbortSignal),
  );
});

test("extra context is optional, capped at 4000 characters, counted and sent", async () => {
  await render();
  const box = container.querySelector("#studio-background");
  expect(box.maxLength).toBe(4000);
  expect(container.textContent).toContain("SOP or notes (optional)");
  await tick(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(box, "My SOP says I want to lead operations.");
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(container.textContent).toContain("38/4,000 characters");
  await tick(() => button("Use reviewed profile").click());
  await submitForm();
  expect(api.createInterview).toHaveBeenCalledWith(
    expect.objectContaining({
      background: "My SOP says I want to lead operations.",
      kind: "full",
    }),
    expect.any(AbortSignal),
  );
});

test("the interview header names the candidate; the debrief offers Practise again and a résumé nudge", async () => {
  api.createInterview.mockResolvedValue({
    id: "general-one",
    provider: "openai",
    mode: "chat",
    status: "completed",
    version: 4,
    answer_count: 3,
    question_limit: 3,
    context: {
      school: "General MBA practice",
      programme: "INSEAD MBA",
      route: "auto",
    },
    transcript: [
      { id: "q1", role: "assistant", text: "Walk me through yourself." },
    ],
    feedback: {
      summary: "Short.",
      strengths: [{ turn_id: "a1", quote: "q", observation: "o" }],
      improvements: [
        { turn_id: "a1", quote: "q", observation: "o", suggestion: "s" },
      ],
      next_exercise: "Retell it.",
    },
  });
  await render();
  await choose("general");
  await tick(() => button("Start interview").click());
  expect(
    container.querySelector('[data-testid="interview-header"]').textContent,
  ).toBe("Candidate: Asha Rao · preparing for INSEAD MBA");
  expect(
    button("Add your résumé for sharper, personal questions"),
  ).toBeDefined();
  api.createInterview.mockClear();
  await tick(() => button("Practise again").click());
  expect(api.createInterview).toHaveBeenCalledTimes(1);
  expect(api.createInterview.mock.calls[0][0]).toEqual(
    expect.objectContaining({ kind: "full", profile_set_id: null }),
  );
});

test("with a reviewed résumé Practise again keeps it and no résumé nudge shows", async () => {
  api.createInterview.mockResolvedValue(debrief(null));
  await render();
  await tick(() => button("Use reviewed profile").click());
  await tick(() => button("Start interview").click());
  expect(button("Add your résumé for sharper")).toBeUndefined();
  api.createInterview.mockClear();
  await tick(() => button("Practise again").click());
  expect(api.createInterview.mock.calls[0][0]).toEqual(
    expect.objectContaining({ profile_set_id: "private-profile" }),
  );
});

test("an old session with a stored route still reads sensibly", async () => {
  api.createInterview.mockResolvedValue({
    id: "old",
    provider: "openai",
    mode: "chat",
    status: "active",
    version: 1,
    answer_count: 0,
    question_limit: 5,
    context: { school: "General MBA practice", programme: "MBA", route: "cat" },
    transcript: [
      { id: "q1", role: "assistant", text: "Tell me about yourself." },
    ],
  });
  await render();
  await tick(() => button("Use reviewed profile").click());
  await submitForm();
  expect(
    container.querySelector('[data-testid="interview-header"]').textContent,
  ).toBe("Candidate: Asha Rao");
});

test("?programme= prefills the programme field only, trimmed and capped, and never starts", async () => {
  window.history.pushState({}, "", "/app/interviews?programme=%20ISB%20PGP%20");
  await render({
    applications: [{ id: 42, school_name: "X", program_name: "Y" }],
    selectedApplicationId: 42,
  });
  expect(container.querySelector("#studio-programme-name").value).toBe(
    "ISB PGP",
  );
  expect(api.createInterview).not.toHaveBeenCalled();
  await act(async () => root.render(null));
  window.history.pushState(
    {},
    "",
    "/app/interviews?programme=" + "p".repeat(300),
  );
  await render();
  expect(container.querySelector("#studio-programme-name").value).toHaveLength(
    160,
  );
  window.history.pushState({}, "", "/");
});

const debrief = (readiness) => ({
  id: "r-one",
  provider: "openai",
  mode: "chat",
  status: "completed",
  version: 4,
  answer_count: 3,
  question_limit: 3,
  created_at: "2026-02-01T00:00:00Z",
  context: { school: "Test School", programme: "MBA", route: "experienced" },
  transcript: [{ id: "q1", role: "assistant", text: "Hi." }],
  readiness,
  feedback: {
    summary: "Fine.",
    strengths: [{ turn_id: "a1", quote: "q", observation: "o" }],
    improvements: [
      { turn_id: "a1", quote: "q", observation: "o", suggestion: "s" },
    ],
    next_exercise: "Retell it.",
    dimensions: [
      {
        dimension: "motivation",
        turn_id: "a2",
        quote: "I want to lead",
        level: "strong",
      },
    ],
  },
});
const openDebrief = async (readiness) => {
  api.createInterview.mockResolvedValue(debrief(readiness));
  await render();
  await choose("general");
  await tick(() => button("Start interview").click());
};

test("a full debrief shows the score and how it is calculated", async () => {
  await openDebrief({ status: "full", score: 83, assessed: 3, levels: {} });
  const text = container.textContent;
  expect(text).toContain("83/100");
  expect(text).toContain("Based on 3 of 5 areas");
  expect(text).toContain("How this is calculated");
  expect(text).toContain("I want to lead");
});

test("a partial debrief shows no number", async () => {
  await openDebrief({
    status: "partial",
    score: null,
    assessed: 2,
    levels: {},
  });
  expect(container.textContent).toContain("Partial readiness");
  expect(container.textContent).not.toContain("/100");
});

test("a debrief without readiness shows neither", async () => {
  await openDebrief(null);
  expect(container.textContent).not.toContain("Partial readiness");
  expect(container.textContent).not.toContain("How this is calculated");
});

const activeSession = (transcript, answer_count = 0) => ({
  id: "s-act",
  provider: "openai",
  mode: "chat",
  status: "active",
  version: 2,
  answer_count,
  question_limit: 5,
  context: { school: "Test School", programme: "MBA", route: "experienced" },
  transcript,
});
const resumeStored = () =>
  readUserValue.mockImplementation((_u, key, fallback) =>
    key === "interview_active_id" ? "s-act" : fallback,
  );

test("setup shows before history resolves", async () => {
  api.listInterviews.mockReturnValue(new Promise(() => {}));
  await render();
  expect(button("Start interview")).toBeDefined();
  expect(container.textContent).not.toContain("Opening your interview");
});

test("a stored active session shows a resume notice that opens it", async () => {
  resumeStored();
  api.getInterview.mockResolvedValue(
    activeSession([{ id: "q1", role: "assistant", text: "Resume me?" }]),
  );
  await render();
  expect(button("Start interview")).toBeDefined();
  await tick(() => button("Resume your interview").click());
  expect(container.textContent).toContain("Resume me?");
});

test("a not_an_answer 422 keeps the text and shows the message inline", async () => {
  resumeStored();
  api.getInterview.mockResolvedValue(
    activeSession([{ id: "q1", role: "assistant", text: "Why MBA?" }]),
  );
  api.answerInterview.mockRejectedValue({
    response: {
      status: 422,
      data: { detail: { code: "not_an_answer", message: "Not an answer." } },
    },
  });
  await render();
  await tick(() => button("Resume your interview").click());
  const box = container.querySelector("#studio-answer");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set.call(box, "asdf");
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await tick(() => button("Send answer").click());
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    "Not an answer.",
  );
  expect(container.querySelector("#studio-answer").value).toBe("asdf");
  expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
  expect(api.interviewError).not.toHaveBeenCalled();
});

test("the question counter ignores off_topic user turns", async () => {
  resumeStored();
  api.getInterview.mockResolvedValue(
    activeSession(
      [
        { id: "q1", role: "assistant", text: "Why MBA?" },
        { id: "a1", role: "user", text: "pizza", off_topic: true },
        { id: "q2", role: "assistant", kind: "off_topic", text: "Why MBA?" },
      ],
      1,
    ),
  );
  await render();
  await tick(() => button("Resume your interview").click());
  expect(container.textContent).toContain("Question 1 of 5");
});

test("the résumé path asks for a résumé instead of starting, and the general path starts at once", async () => {
  await render();
  expect(
    container.querySelector('input[name="studio-path"][value="resume"]')
      .checked,
  ).toBe(true);
  await tick(() => button("Start interview").click());
  expect(api.createInterview).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain(
    "Add your résumé above, or switch to general questions.",
  );
  await choose("general");
  expect(
    container.querySelector("#studio-resume-heading").closest("[hidden]"),
  ).toBeTruthy();
  await tick(() => button("Start interview").click());
  expect(api.createInterview).toHaveBeenCalledTimes(1);
  expect(api.createInterview.mock.calls[0][0].profile_set_id).toBeNull();
});

test("a reviewed résumé is ignored on the general path and the last path is remembered", async () => {
  await render();
  await tick(() => button("Use reviewed profile").click());
  await choose("general");
  await tick(() => button("Start interview").click());
  expect(api.createInterview.mock.calls[0][0].profile_set_id).toBeNull();
  expect(writeUserValue).toHaveBeenCalledWith(
    99,
    "interview_preferences",
    expect.objectContaining({ path: "general" }),
  );
});

// A try saved before sign-up (see app/tryHandoff.js). The browser only reads the text back.
const STASH = "mockmba:try_handoff";
const ANSWER = "I led a team of six engineers and want to move into strategy.";
const FOLLOW_UP =
  "You led six engineers. What exactly did you decide yourself?";
const tokenFor = (claims = {}) =>
  `${Buffer.from(
    JSON.stringify({
      answer: ANSWER,
      follow_up: FOLLOW_UP,
      v: 1,
      exp: Math.floor(Date.now() / 1000) + 86400,
      ...claims,
    }),
  ).toString("base64url")}.sig`;
const stash = (claims, savedAt = Date.now()) =>
  localStorage.setItem(
    STASH,
    JSON.stringify({ handoff: tokenFor(claims), savedAt }),
  );
const card = () => container.querySelector('[data-testid="try-handoff"]');
const seeded = {
  id: "seeded",
  provider: "openai",
  mode: "chat",
  status: "active",
  version: 0,
  answer_count: 1,
  question_limit: 3,
  context: { school: "General MBA practice", programme: "MBA", kind: "taster" },
  transcript: [
    { id: "q1", role: "assistant", text: "Walk me through yourself." },
    { id: "a1", role: "user", text: ANSWER },
    { id: "q2", role: "assistant", text: FOLLOW_UP, kind: "follow_up" },
  ],
};
const failure = (status, detail) =>
  Object.assign(new Error("failed"), {
    response: { status, data: { detail } },
  });

test("a saved try shows above the two ways to start, with the answer and the follow-up as text", async () => {
  stash({ answer: `${ANSWER} <img src=x onerror=alert(1)>` });
  await render();
  expect(card().textContent).toContain("Pick up where you left off");
  expect(card().textContent).toContain(FOLLOW_UP);
  expect(card().textContent).toContain("<img src=x onerror=alert(1)>");
  expect(card().querySelector("img")).toBeNull();
  expect(button("Continue with this follow-up")).toBeDefined();
  expect(button("Start fresh instead")).toBeDefined();
  const paths = container.querySelector(".studio-paths");
  expect(
    card().compareDocumentPosition(paths) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(container.textContent).not.toMatch(/—/);
});

test("a long answer is shortened in the card", async () => {
  stash({ answer: "word ".repeat(200) });
  await render();
  const shown = card().querySelector("blockquote").textContent;
  expect(shown.length).toBeLessThanOrEqual(240);
  expect(shown.endsWith("…")).toBe(true);
});

test("no card without a saved try", async () => {
  await render();
  expect(card()).toBeNull();
  expect(button("Start interview")).toBeDefined();
});

test.each([
  ["older than 24 hours", () => stash({}, Date.now() - 25 * 60 * 60 * 1000)],
  [
    "with an expired token",
    () => stash({ exp: Math.floor(Date.now() / 1000) - 60 }),
  ],
  ["malformed", () => localStorage.setItem(STASH, "{not json")],
  [
    "missing the follow-up",
    () =>
      localStorage.setItem(
        STASH,
        JSON.stringify({ handoff: "x.y", savedAt: Date.now() }),
      ),
  ],
])("a saved try %s is not offered and is removed", async (_name, plant) => {
  plant();
  await render();
  expect(card()).toBeNull();
  expect(localStorage.getItem(STASH)).toBeNull();
  expect(button("Start interview")).toBeDefined();
});

test("a saved try is not offered, and is removed, once the taster is used", async () => {
  stash();
  api.getInterviewCapabilities.mockResolvedValue({
    chat: true,
    voice: true,
    taster_used: true,
  });
  await render();
  expect(card()).toBeNull();
  expect(localStorage.getItem(STASH)).toBeNull();
});

test("a saved try is kept but not shown while live AI is off", async () => {
  stash();
  api.getInterviewCapabilities.mockResolvedValue({ chat: false, voice: false });
  await render();
  expect(card()).toBeNull();
  expect(localStorage.getItem(STASH)).not.toBeNull();
});

test("blocked browser storage leaves the normal first screen", async () => {
  stash();
  const blocked = jest
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation(() => {
      throw new Error("blocked");
    });
  readUserValue.mockImplementation((_u, _k, f) => f);
  await render();
  blocked.mockRestore();
  expect(card()).toBeNull();
  expect(button("Start interview")).toBeDefined();
});

test("Start fresh instead removes the saved try and the normal start still works", async () => {
  stash();
  await render();
  await tick(() => button("Start fresh instead").click());
  expect(card()).toBeNull();
  expect(localStorage.getItem(STASH)).toBeNull();
  expect(api.createInterview).not.toHaveBeenCalled();
  expect(document.activeElement.name).toBe("studio-path");
  await choose("general");
  await tick(() => button("Start interview").click());
  const sent = api.createInterview.mock.calls[0][0];
  expect(sent).toEqual(expect.objectContaining({ kind: "full" }));
  expect(sent).not.toHaveProperty("handoff");
});

test("Continue creates the Why MBA interview from the saved try, then clears it and opens the session", async () => {
  stash();
  const handoff = JSON.parse(localStorage.getItem(STASH)).handoff;
  api.createInterview.mockResolvedValue(seeded);
  await render();
  await tick(() => button("Continue with this follow-up").click());
  expect(api.createInterview).toHaveBeenCalledTimes(1);
  expect(api.createInterview.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      kind: "taster",
      provider: "openai",
      route: "auto",
      handoff,
      request_id: "test-request-id",
      profile_set_id: null,
      question_set_id: null,
    }),
  );
  expect(localStorage.getItem(STASH)).toBeNull();
  expect(card()).toBeNull();
  expect(container.textContent).toContain(FOLLOW_UP);
  expect(container.textContent).toContain(ANSWER);
  expect(container.querySelector("textarea")).not.toBeNull();
});

test("Practise again after a continued try does not send the saved try again", async () => {
  stash();
  api.createInterview.mockResolvedValue({
    ...debrief(null),
    context: {
      school: "General MBA practice",
      programme: "MBA",
      kind: "taster",
    },
  });
  await render();
  await tick(() => button("Continue with this follow-up").click());
  api.createInterview.mockClear();
  await tick(() => button("Practise again").click());
  const sent = api.createInterview.mock.calls[0][0];
  expect(sent.kind).toBe("full");
  expect(sent).not.toHaveProperty("handoff");
});

test.each([
  [
    409,
    "You've used your Why MBA taster. Add your résumé for a full interview.",
  ],
  [422, "This try expired. Start a new interview."],
])(
  "a %i reply clears the saved try and shows the server's message",
  async (status, detail) => {
    stash();
    api.createInterview.mockRejectedValue(failure(status, detail));
    api.interviewError.mockResolvedValue(detail);
    await render();
    await tick(() => button("Continue with this follow-up").click());
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      detail,
    );
    expect(card()).toBeNull();
    expect(localStorage.getItem(STASH)).toBeNull();
    expect(button("Start interview")).toBeDefined();
  },
);

test("a temporary failure keeps the saved try and a retry reuses the same request", async () => {
  stash();
  api.createInterview
    .mockRejectedValueOnce(
      failure(503, "AI practice is temporarily paused by the site owner."),
    )
    .mockResolvedValueOnce(seeded);
  api.interviewError.mockResolvedValue(
    "AI practice is temporarily paused by the site owner.",
  );
  await render();
  await tick(() => button("Continue with this follow-up").click());
  expect(card()).not.toBeNull();
  expect(localStorage.getItem(STASH)).not.toBeNull();
  await tick(() => button("Continue with this follow-up").click());
  const [first, second] = api.createInterview.mock.calls.map(([body]) => body);
  expect(second.request_id).toBe(first.request_id);
  expect(second.handoff).toBe(first.handoff);
  expect(localStorage.getItem(STASH)).toBeNull();
});
