import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InterviewStudio from "./InterviewStudio";
import * as api from "../../../api/interviewsApi";
import { writeUserValue } from "../../../app/workspaceStorage";
import { setInterviewIntent } from "./interviewIntent";
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 99, name: "Asha Rao" } }),
}));
jest.mock("../../../app/workspaceStorage", () => ({
  readUserValue: (_user, _key, fallback) => fallback,
  writeUserValue: jest.fn(() => true),
}));
jest.mock("../../../api/interviewsApi", () => ({
  getInterviewCapabilities: jest.fn(),
  listInterviews: jest.fn(),
  createInterview: jest.fn(),
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
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => "test-request-id" },
  });
  jest.clearAllMocks();
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

test("without a resume the full interview is replaced by a call to add one, with the taster as a secondary choice", async () => {
  await render();
  expect(container.textContent).not.toContain("Programme type");
  expect(container.querySelector("#studio-route")).toBeNull();
  expect(
    container.querySelector('[data-testid="resume-cta"]').textContent,
  ).toContain("Add your résumé to start a full interview");
  expect(button("Start interview")).toBeUndefined();
  const taster = button("Try a 3-question Why MBA interview");
  expect(taster).toBeDefined();
  await tick(() => taster.click());
  expect(api.createInterview).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "taster",
      route: "auto",
      provider: "openai",
      question_limit: 3,
      practice_focus: "motivation",
      profile_set_id: null,
      question_set_id: null,
    }),
    expect.any(AbortSignal),
  );
});

test("once the taster is used it is hidden and the nudge appears", async () => {
  api.getInterviewCapabilities.mockResolvedValue({
    chat: true,
    voice: true,
    taster_used: true,
    message: "Connected",
  });
  await render();
  expect(button("Why MBA interview")).toBeUndefined();
  expect(
    container.querySelector('[data-testid="taster-used"]').textContent,
  ).toContain(
    "You’ve used your Why MBA taster. Add your résumé for a full interview.",
  );
  expect(container.querySelector('[data-testid="resume-cta"]')).not.toBeNull();
});

test("a 409 from the server also hides the taster", async () => {
  api.createInterview.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        detail:
          "You've used your Why MBA taster. Add your résumé for a full interview.",
      },
    },
  });
  api.interviewError.mockResolvedValue("used");
  await render();
  await tick(() => button("Try a 3-question Why MBA interview").click());
  expect(button("Try a 3-question Why MBA interview")).toBeUndefined();
  expect(container.querySelector('[data-testid="taster-used"]')).not.toBeNull();
});

test("Today can open the studio with the taster preselected", async () => {
  setInterviewIntent("taster");
  await render();
  expect(
    container.querySelector('[data-testid="taster-intro"]'),
  ).not.toBeNull();
  expect(button("Start your Why MBA interview")).toBeDefined();
  expect(container.querySelector('[data-testid="resume-cta"]')).toBeNull();
  await submitForm();
  expect(api.createInterview).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "taster", question_limit: 3 }),
    expect.any(AbortSignal),
  );
});

test("when live AI is off only the labelled demo is offered", async () => {
  api.getInterviewCapabilities.mockResolvedValue({
    chat: false,
    voice: false,
    message: "AI practice is not connected yet.",
  });
  setInterviewIntent("taster");
  await render();
  expect(
    container.querySelector('[data-testid="demo-notice"]').textContent,
  ).toContain("Demo only");
  expect(container.querySelector('[data-testid="resume-cta"]')).toBeNull();
  expect(container.querySelector('[data-testid="taster-intro"]')).toBeNull();
  expect(button("Why MBA interview")).toBeUndefined();
  expect(button("Start demo")).toBeDefined();
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
  expect(container.textContent).toContain("Add your SOP or notes (optional)");
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

test("the interview header names the candidate and programme; a taster debrief ends with the resume call to action", async () => {
  api.listInterviews.mockResolvedValue({ items: [], has_more: false });
  api.createInterview.mockResolvedValue({
    id: "taster-one",
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
      kind: "taster",
    },
    transcript: [
      { id: "q1", role: "assistant", text: "Walk me through yourself." },
    ],
    feedback: {
      summary: "Short taster.",
      strengths: [{ turn_id: "a1", quote: "q", observation: "o" }],
      improvements: [
        { turn_id: "a1", quote: "q", observation: "o", suggestion: "s" },
      ],
      next_exercise: "Retell it.",
    },
  });
  await render();
  await tick(() => button("Try a 3-question Why MBA interview").click());
  expect(
    container.querySelector('[data-testid="interview-header"]').textContent,
  ).toBe("Candidate: Asha Rao · preparing for INSEAD MBA");
  const cta = container.querySelector('[data-testid="taster-resume-cta"]');
  expect(cta.textContent).toContain("Add your résumé for a full interview");
  await tick(() => cta.querySelector("button").click());
  expect(
    container.querySelector('[data-testid="interview-header"]'),
  ).toBeNull();
  expect(container.querySelector('[data-testid="resume-cta"]')).not.toBeNull();
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
      { dimension: "motivation", turn_id: "a2", quote: "I want to lead", level: "strong" },
    ],
  },
});
const openDebrief = async (readiness) => {
  api.createInterview.mockResolvedValue(debrief(readiness));
  await render();
  await tick(() => button("Try a 3-question Why MBA interview").click());
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
  await openDebrief({ status: "partial", score: null, assessed: 2, levels: {} });
  expect(container.textContent).toContain("Partial readiness");
  expect(container.textContent).not.toContain("/100");
});

test("a debrief without readiness shows neither", async () => {
  await openDebrief(null);
  expect(container.textContent).not.toContain("Partial readiness");
  expect(container.textContent).not.toContain("How this is calculated");
});
