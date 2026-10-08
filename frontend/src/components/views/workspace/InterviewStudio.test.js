import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InterviewStudio from "./InterviewStudio";
import * as api from "../../../api/interviewsApi";
import { writeUserValue } from "../../../app/workspaceStorage";
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 99 } }),
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
    container.querySelector(".studio-consent input").click(),
  );
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
      route: "experienced",
      practice_focus: "resume",
      application_id: 42,
      consent: true,
    }),
    expect.any(AbortSignal),
  );
  expect(container.textContent).toContain("Tell me about yourself.");
  expect(writeUserValue).toHaveBeenCalledWith(
    99,
    "interview_preferences",
    expect.objectContaining({ route: "experienced" }),
  );
});
