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

const withProfile = {
  ...set,
  contact_details_removed: 2,
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

test("keyless upload extracts editable text but never calls AI", async () => {
  await act(async () =>
    root.render(<ResumeQuestionBuilder capabilities={{ chat: false }} />),
  );
  await upload();
  expect(container.querySelector("textarea").value).toBe(text);
  expect(container.textContent).toContain("temporarily unavailable");
  expect(api.createResumeQuestions).not.toHaveBeenCalled();
});

test("upload auto-builds, applies all highlights and keeps the text", async () => {
  const use = jest.fn();
  api.createResumeQuestions.mockResolvedValue(withProfile);
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: true }}
        onUseProfile={use}
      />,
    ),
  );
  expect(button("Build my")).toBeUndefined();
  await upload();
  expect(api.createResumeQuestions).toHaveBeenCalledTimes(1);
  expect(use).toHaveBeenCalledWith({
    id: "set-one",
    route: "experienced",
    facts: withProfile.graph.profile,
  });
  expect(container.textContent).toContain("synthetic-resume.txt · read ✓");
  expect(container.textContent).toContain(
    "Ready: 2 highlights from your résumé",
  );
  expect(container.textContent).toContain(
    "Contact details removed before sending",
  );
  expect(container.textContent.match(/Sent to OpenAI/g)).toHaveLength(1);
  // Text is retained inside the collapsed check; editing reveals Rebuild.
  const area = container.querySelector("textarea");
  expect(area.value).toBe(text);
  expect(button("Rebuild").disabled).toBe(true);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set.call(area, text + " Also led a migration.");
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(button("Rebuild").disabled).toBe(false);
});

test("unticking a highlight re-applies only the kept ones", async () => {
  const use = jest.fn();
  api.createResumeQuestions.mockResolvedValue(withProfile);
  await act(async () =>
    root.render(
      <ResumeQuestionBuilder
        capabilities={{ chat: true }}
        onUseProfile={use}
      />,
    ),
  );
  await upload();
  await act(async () =>
    container.querySelectorAll(".resume-fact input")[1].click(),
  );
  expect(use).toHaveBeenLastCalledWith({
    id: "set-one",
    route: "experienced",
    facts: [withProfile.graph.profile[0]],
  });
});

test("a failed build shows progress then a retry that reuses the same request", async () => {
  api.createResumeQuestions
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValue(set);
  await act(async () =>
    root.render(<ResumeQuestionBuilder capabilities={{ chat: true }} />),
  );
  await upload();
  expect(container.querySelector('[role="alert"]').textContent).toContain(
    "Please retry.",
  );
  expect(api.extractResume).toHaveBeenCalledTimes(1);
  await act(async () => button("Try again").click());
  expect(api.extractResume).toHaveBeenCalledTimes(1);
  expect(api.createResumeQuestions.mock.calls[0][0]).toEqual(
    api.createResumeQuestions.mock.calls[1][0],
  );
  expect(container.textContent).toContain("synthetic-resume.txt · read ✓");
});

test("too little extracted text opens the paste area with an explanation and does not build", async () => {
  api.extractResume.mockResolvedValue({ text: "scan" });
  await act(async () =>
    root.render(<ResumeQuestionBuilder capabilities={{ chat: true }} />),
  );
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    value: [new File(["x"], "scan.pdf", { type: "application/pdf" })],
  });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
  expect(container.textContent).toContain("scanned PDF");
  expect(container.querySelector("textarea")).not.toBeNull();
  expect(api.createResumeQuestions).not.toHaveBeenCalled();
});

test("paste text instead reveals the textarea and builds on click", async () => {
  api.createResumeQuestions.mockResolvedValue(set);
  await act(async () =>
    root.render(<ResumeQuestionBuilder capabilities={{ chat: true }} />),
  );
  expect(container.querySelector("textarea")).toBeNull();
  await act(async () => button("Paste text instead").click());
  const area = container.querySelector("textarea");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set.call(area, text);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Build my interview").click());
  expect(api.createResumeQuestions).toHaveBeenCalledTimes(1);
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
  await act(async () => button("Delete").click());
  expect(api.deleteResumeQuestions).not.toHaveBeenCalled();
  expect(container.textContent).toContain(
    "Existing practice sessions keep their copied highlights",
  );
  await act(async () => button("Delete permanently").click());
  expect(api.deleteResumeQuestions).toHaveBeenCalledWith(
    "set-one",
    expect.any(AbortSignal),
  );
});
