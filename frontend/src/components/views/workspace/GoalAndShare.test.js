import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MockGoal from "./MockGoal";
import ShareFollowUp from "./ShareFollowUp";

const DATE_KEY = "masters:user:7:interview_date";
let root, container;

const render = async (node) => act(async () => root.render(node));

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("asks for the interview date, then shows days left and mock progress", async () => {
  await render(<MockGoal userId={7} completed={2} />);
  const form = container.querySelector("form");
  expect(form).not.toBeNull();
  container.querySelector("input[name=date]").value = "2099-01-10";
  await act(async () =>
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(JSON.parse(localStorage.getItem(DATE_KEY))).toBe("2099-01-10");
  expect(container.textContent).toMatch(/days to your interview/);
  expect(container.textContent).toContain("2 of 3 mocks done");
  const bar = container.querySelector("[role=progressbar]");
  expect(bar.getAttribute("aria-valuenow")).toBe("2");
});

test("caps progress at the goal", async () => {
  localStorage.setItem(DATE_KEY, JSON.stringify("2099-01-10"));
  await render(<MockGoal userId={7} completed={9} />);
  expect(container.textContent).toContain("3 of 3 mocks done");
});

test("shares the interviewer question without any answer or the try anchor", async () => {
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  const transcript = [
    { role: "assistant", text: "Walk me through your project." },
    { role: "user", text: "My private answer about the backlog" },
    { role: "assistant", text: "How did you measure that?", kind: "follow_up" },
  ];
  await render(<ShareFollowUp transcript={transcript} />);
  await act(async () => container.querySelector("button").click());
  const shared = writeText.mock.calls[0][0];
  expect(shared).toContain("How did you measure that?");
  expect(shared).not.toContain("My private answer");
  expect(shared).toContain("/mba-interview-practice");
  expect(shared).not.toContain("#try");
});

test("renders nothing when there is no interviewer question to share", async () => {
  await render(<ShareFollowUp transcript={[]} />);
  expect(container.innerHTML).toBe("");
});
