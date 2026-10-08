import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ResumeQuestionBuilder from "./ResumeQuestionBuilder";
import * as api from "../../../api/interviewsApi";
jest.mock("../../../api/interviewsApi", () => ({
  listResumeQuestions: jest.fn(),
  extractResume: jest.fn(),
  createResumeQuestions: jest.fn(),
  deleteResumeQuestions: jest.fn(),
  interviewError: jest.fn(),
}));
const text =
  "Built monitoring for Java backend services, coordinated releases and incident reviews, and mentored two graduates.";
const set = {
  id: "set-one",
  created_at: "2026-10-08T00:00:00Z",
  context: { school: "General MBA practice", route: "experienced" },
  graph: {
    roots: ["one"],
    nodes: [
      {
        id: "one",
        text: "What did you learn from coordinating releases?",
        topic: "Experience",
        sources: ["resume"],
        routes: ["experienced"],
        evidence_quote: "coordinated releases",
      },
    ],
    edges: [],
    sources: [{ id: "resume", label: "Your reviewed resume" }],
  },
};
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => "synthetic-request" },
  });
  jest.clearAllMocks();
  api.listResumeQuestions.mockResolvedValue({ items: [], has_more: false });
  api.interviewError.mockResolvedValue("Please retry.");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const button = (label) =>
  [...container.querySelectorAll("button")].find((b) =>
    b.textContent.includes(label),
  );
async function upload() {
  api.extractResume.mockResolvedValue({ text });
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    value: [new File([text], "synthetic-resume.txt", { type: "text/plain" })],
  });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
}

test("keyless upload extracts editable text but never calls AI", async () => {
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: false }}
        route="experienced"
      />,
    ),
  );
  await upload();
  expect(container.querySelector("textarea").value).toBe(text);
  expect(document.activeElement).toBe(container.querySelector("textarea"));
  expect(button("Build my profile & questions").disabled).toBe(true);
  expect(container.textContent).toContain("when AI is connected");
  expect(api.createResumeQuestions).not.toHaveBeenCalled();
  await act(async () => button("Clear résumé text").click());
  expect(container.querySelector("textarea")).toBeNull();
});

test("consented generation preserves retries, clears résumé text on success and selects a private opening", async () => {
  const choose = jest.fn();
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: true }}
        route="experienced"
        onChoose={choose}
      />,
    ),
  );
  await upload();
  expect(button("Build my profile & questions").disabled).toBe(true);
  await act(async () =>
    container.querySelector('input[type="checkbox"]').click(),
  );
  api.createResumeQuestions
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValue(set);
  const submit = () =>
    act(async () =>
      container
        .querySelector("form")
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
  await submit();
  expect(container.querySelector("textarea").value).toBe(text);
  await submit();
  expect(api.createResumeQuestions.mock.calls[0][0]).toEqual(
    api.createResumeQuestions.mock.calls[1][0],
  );
  expect(container.querySelector("textarea")).toBeNull();
  await act(async () => button("What did you learn").click());
  expect(container.textContent).toContain("coordinated releases");
  await act(async () => button("Practise from this opening").click());
  expect(choose).toHaveBeenCalledWith(
    expect.objectContaining({ id: "one", question_set_id: "set-one" }),
  );
});

test("saved sets can be reopened and deletion requires confirmation", async () => {
  api.listResumeQuestions.mockResolvedValueOnce({
    items: [set],
    has_more: false,
  });
  api.deleteResumeQuestions.mockResolvedValue({});
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: false }}
        route="experienced"
      />,
    ),
  );
  await act(async () => button("General MBA practice").click());
  await act(async () => button("Delete set").click());
  expect(api.deleteResumeQuestions).not.toHaveBeenCalled();
  expect(container.textContent).toContain(
    "Existing practice sessions will keep their copied profile facts and questions",
  );
  await act(async () => button("Delete permanently").click());
  expect(api.deleteResumeQuestions).toHaveBeenCalledWith(
    "set-one",
    expect.any(AbortSignal),
  );
});

test("profile review sends only the facts the applicant kept", async () => {
  const choose = jest.fn();
  const withProfile = {
    ...set,
    graph: {
      ...set.graph,
      profile: [
        {
          id: "fact-1",
          category: "education",
          evidence_quote: "Studied computer science",
        },
        {
          id: "fact-2",
          category: "experience",
          evidence_quote: "Built monitoring",
        },
      ],
    },
  };
  api.listResumeQuestions.mockResolvedValueOnce({
    items: [withProfile],
    has_more: false,
  });
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: false }}
        route="experienced"
        onUseProfile={choose}
      />,
    ),
  );
  await act(async () => button("General MBA practice").click());
  const checks = container.querySelectorAll(".resume-fact input");
  await act(async () => checks[1].click());
  await act(async () => button("Use reviewed profile").click());
  expect(choose).toHaveBeenCalledWith({
    id: "set-one",
    route: "experienced",
    facts: [withProfile.graph.profile[0]],
  });
});
