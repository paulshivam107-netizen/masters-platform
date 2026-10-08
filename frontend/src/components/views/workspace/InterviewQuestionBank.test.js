import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InterviewQuestionBank, { questionPath } from "./InterviewQuestionBank";
import { getInterviewQuestions } from "../../../api/interviewsApi";
jest.mock("../../../api/interviewsApi", () => ({
  getInterviewQuestions: jest.fn(),
  interviewError: jest.fn(),
}));

const bank = {
  sources: [{ id: "source", label: "Prep material" }],
  roots: ["why", "job"],
  nodes: [
    {
      id: "why",
      text: "Why MBA now?",
      topic: "Motivation",
      routes: ["cat", "experienced"],
      sources: ["source"],
    },
    {
      id: "necessary",
      text: "Is an MBA necessary?",
      topic: "Motivation",
      routes: ["cat", "experienced"],
      sources: ["source"],
    },
    {
      id: "later",
      text: "Why not change roles first?",
      topic: "Motivation",
      routes: ["experienced"],
      sources: ["source"],
    },
    {
      id: "job",
      text: "What do you do at work?",
      topic: "Work",
      routes: ["experienced"],
      sources: ["source"],
    },
  ],
  edges: [
    { parent: "why", child: "necessary", basis: "source_follow_up" },
    { parent: "necessary", child: "later", basis: "editorial_connection" },
  ],
};

test("search paths retain first/second/third order and respect route availability", () => {
  expect(questionPath(bank, "later", "experienced")).toEqual([
    "why",
    "necessary",
    "later",
  ]);
  expect(questionPath(bank, "later", "cat")).toEqual([]);
});

test("a user explores a branch, sees connection provenance and selects the opening", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  getInterviewQuestions.mockResolvedValue(bank);
  const onChoose = jest.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <InterviewQuestionBank route="experienced" onChoose={onChoose} />,
    ),
  );
  const click = (text) =>
    act(() =>
      [...container.querySelectorAll("button")]
        .find((b) => b.textContent.includes(text))
        .click(),
    );
  click("Why MBA now?");
  expect(container.textContent).toContain("Follow-up recorded in source");
  click("Is an MBA necessary?");
  expect(container.textContent).toContain("Suggested connection");
  click("Why not change roles first?");
  expect(container.querySelectorAll(".bank-path li")).toHaveLength(3);
  click("Practise from this opening");
  expect(onChoose).toHaveBeenCalledWith(bank.nodes[0]);
  act(() => root.unmount());
  container.remove();
});
