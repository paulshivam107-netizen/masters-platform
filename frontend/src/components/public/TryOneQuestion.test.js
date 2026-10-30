import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import TryOneQuestion from "./TryOneQuestion";
import { useAuth } from "../../contexts/AuthContext";
import { getTryStatusApi, submitTryFollowUpApi } from "../../api/publicTryApi";

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../api/publicTryApi", () => ({
  getTryStatusApi: jest.fn(),
  submitTryFollowUpApi: jest.fn(),
}));

const QUESTION = { id: "q1", text: "Tell me about a decision you owned." };
const status = (extra = {}) => ({
  available: true,
  turnstile_site_key: "site-key",
  question: QUESTION,
  min_chars: 40,
  max_chars: 1200,
  ...extra,
});
const ANSWER =
  "I led the label redesign and we cut costs (by 12%) in one quarter for the team.";
const UNAVAILABLE = {
  available: false,
  turnstile_site_key: null,
  question: null,
};

let container;
let root;
let turnstileOptions;
let serial;

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
async function mount(props = {}) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TryOneQuestion {...props} />
      </MemoryRouter>,
    ),
  );
  await flush();
}
const setValue = (element, value) =>
  act(async () => {
    const proto = Object.getPrototypeOf(element);
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
const textarea = () => container.querySelector("textarea");
const honeypot = () => container.querySelector('input[name="website"]');
const button = () => container.querySelector('button[type="submit"]');
const solveCheck = (token = "tok-1") =>
  act(async () => turnstileOptions.callback(token));
const submit = async () => {
  await act(async () => button().click());
  await flush();
};
const fill = async (text = ANSWER) => {
  await setValue(textarea(), text);
  await solveCheck();
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  serial = 0;
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => `request-${++serial}` },
  });
  window.turnstile = {
    render: jest.fn((_box, options) => {
      turnstileOptions = options;
      return "widget-1";
    }),
    reset: jest.fn(),
    remove: jest.fn(),
  };
  useAuth.mockReturnValue({ user: null, loading: false });
  getTryStatusApi.mockResolvedValue(status());
  submitTryFollowUpApi.mockReset();
  getTryStatusApi.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  jest.restoreAllMocks();
  act(() => root.unmount());
  container.remove();
  delete window.turnstile;
  document
    .querySelectorAll('script[src*="challenges.cloudflare.com"]')
    .forEach((script) => script.remove());
});

test("prerender and first client render are empty", () => {
  expect(
    renderToString(
      <StaticRouter location="/">
        <TryOneQuestion />
      </StaticRouter>,
    ),
  ).toBe("");
});

test("is hidden for signed-in users and does not even ask the server", async () => {
  useAuth.mockReturnValue({ user: { id: 1 }, loading: false });
  await mount();
  expect(container.innerHTML).toBe("");
  expect(getTryStatusApi).not.toHaveBeenCalled();
});

test("renders nothing when the server says it is unavailable, and never loads Turnstile", async () => {
  getTryStatusApi.mockResolvedValue(UNAVAILABLE);
  delete window.turnstile;
  await mount();
  expect(container.innerHTML).toBe("");
  expect(
    document.querySelector('script[src*="challenges.cloudflare.com"]'),
  ).toBeNull();
});

test("shows the server's question, the AI notice and a labelled textarea", async () => {
  await mount();
  expect(container.textContent).toContain(QUESTION.text);
  expect(container.textContent).toMatch(
    /Your answer is sent to an AI service to write one follow-up\. We don.t store it on our servers\./,
  );
  expect(
    container.querySelector(`label[for="${textarea().id}"]`),
  ).not.toBeNull();
  expect(container.textContent).toContain(
    "0 of 1200 characters, at least 40 needed",
  );
  expect(container.textContent).not.toMatch(/—/);
});

test("Submit needs both a Turnstile token and the minimum length", async () => {
  await mount();
  expect(window.turnstile.render).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({ sitekey: "site-key" }),
  );
  await setValue(textarea(), ANSWER);
  expect(button().disabled).toBe(true); // long enough, no token yet
  await solveCheck();
  expect(button().disabled).toBe(false);
  await setValue(textarea(), "too short");
  expect(button().disabled).toBe(true); // token, but too short
  await setValue(textarea(), ANSWER);
  await act(async () => turnstileOptions["expired-callback"]());
  expect(button().disabled).toBe(true); // token expired
});

test("success shows the follow-up and highlights the quote as plain text", async () => {
  const answer = `${ANSWER} <img src=x onerror=alert(1)>`;
  submitTryFollowUpApi.mockResolvedValue({
    follow_up: "How did you measure the 12% saving?",
    quote: "CUT COSTS (BY 12%)",
    fallback: false,
  });
  await mount({
    source: "school:insead",
    next: "/app/interviews?programme=X&from=try",
  });
  await fill(answer);
  await submit();
  expect(submitTryFollowUpApi).toHaveBeenCalledWith({
    question_id: "q1",
    answer,
    request_id: "request-1",
    turnstile_token: "tok-1",
    website: "",
    source: "school:insead",
  });
  expect(container.querySelector("mark").textContent).toBe(
    "cut costs (by 12%)",
  );
  expect(container.querySelector("blockquote").textContent).toBe(answer);
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toContain(
    "How did you measure the 12% saving?",
  );
  expect(container.querySelector("textarea")).toBeNull();
  expect(document.activeElement.getAttribute("aria-labelledby")).toBeTruthy();
  expect(container.querySelector("[aria-live]").textContent).toContain(
    "Your follow-up",
  );
  expect(container.querySelector("a").getAttribute("href")).toBe(
    "/auth?mode=signup&next=%2Fapp%2Finterviews%3Fprogramme%3DX%26from%3Dtry",
  );
});

test("a fallback follow-up is not presented as quoting the answer", async () => {
  submitTryFollowUpApi.mockResolvedValue({
    follow_up: "What would you do differently?",
    quote: "label redesign",
    fallback: true,
  });
  await mount();
  await fill();
  await submit();
  expect(container.querySelector("mark")).toBeNull();
  expect(container.textContent).toContain("It does not quote your answer.");
  expect(container.textContent).not.toContain("highlighted words");
});

test.each([
  [400, "The human check failed. Try again."],
  [422, "That does not look like an answer."],
  [429, "You have reached today's limit."],
  [503, "Try one question is unavailable right now."],
])(
  "a %i reply keeps the answer, shows the detail and asks for a new check",
  async (code, detail) => {
    submitTryFollowUpApi.mockRejectedValue({
      response: { status: code, data: { detail } },
    });
    await mount();
    await fill();
    await submit();
    expect(container.querySelector('[role="alert"]').textContent).toBe(detail);
    expect(textarea().value).toBe(ANSWER);
    expect(window.turnstile.reset).toHaveBeenCalledWith("widget-1");
    expect(button().disabled).toBe(true);
    expect(document.activeElement).toBe(textarea());
  },
);

test("a network error reuses the request id; a reply from the server does not", async () => {
  submitTryFollowUpApi
    .mockRejectedValueOnce(new Error("Network Error"))
    .mockRejectedValueOnce({
      response: { status: 422, data: { detail: "No." } },
    })
    .mockRejectedValueOnce({
      response: { status: 422, data: { detail: "No." } },
    });
  await mount();
  await fill();
  await submit();
  expect(container.querySelector('[role="alert"]').textContent).toMatch(
    /Check your connection/,
  );
  await solveCheck("tok-2");
  await submit();
  await solveCheck("tok-3");
  await submit();
  const ids = submitTryFollowUpApi.mock.calls.map(([body]) => body.request_id);
  expect(ids).toEqual(["request-1", "request-1", "request-2"]);
  expect(submitTryFollowUpApi.mock.calls[1][0].turnstile_token).toBe("tok-2");
});

test("the hidden honeypot field is sent with the request", async () => {
  submitTryFollowUpApi.mockResolvedValue({
    follow_up: "Why?",
    quote: null,
    fallback: false,
  });
  await mount();
  const trap = honeypot();
  expect(trap.tabIndex).toBe(-1);
  expect(trap.getAttribute("autocomplete")).toBe("off");
  expect(trap.getAttribute("aria-hidden")).toBe("true");
  await setValue(trap, "http://spam.example");
  await fill();
  await submit();
  expect(submitTryFollowUpApi.mock.calls[0][0].website).toBe(
    "http://spam.example",
  );
});

test("without a site key (local development) Turnstile is skipped and the token is empty", async () => {
  getTryStatusApi.mockResolvedValue(status({ turnstile_site_key: null }));
  submitTryFollowUpApi.mockResolvedValue({
    follow_up: "Why?",
    quote: null,
    fallback: false,
  });
  await mount();
  expect(window.turnstile.render).not.toHaveBeenCalled();
  expect(container.textContent).not.toContain("check that you are human");
  expect(button().disabled).toBe(true); // still needs the minimum length
  await setValue(textarea(), ANSWER);
  expect(button().disabled).toBe(false);
  await submit();
  expect(submitTryFollowUpApi.mock.calls[0][0].turnstile_token).toBe("");
});

test("the Turnstile script is only added once the widget is showing", async () => {
  delete window.turnstile;
  await mount();
  const script = document.querySelector(
    'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
  );
  expect(script).not.toBeNull();
  expect(script.src).toContain("render=explicit");
});

const STASH = "mockmba:try_handoff";
const reply = (extra = {}) => ({
  follow_up: "How did you measure the 12% saving?",
  quote: "cut costs (by 12%)",
  fallback: false,
  handoff: "e30.sig",
  ...extra,
});

test("a successful try is kept on this device as {handoff, savedAt} and the sign-up says so", async () => {
  submitTryFollowUpApi.mockResolvedValue(reply());
  await mount();
  await fill();
  await submit();
  expect(Object.keys(JSON.parse(localStorage.getItem(STASH))).sort()).toEqual([
    "handoff",
    "savedAt",
  ]);
  expect(JSON.parse(localStorage.getItem(STASH)).handoff).toBe("e30.sig");
  expect(localStorage.length).toBe(1);
  expect(container.textContent).toContain(
    "Your answer is saved for 24 hours on this device",
  );
  expect(container.textContent).not.toMatch(/—/);
});

test("a fixed follow-up is kept too", async () => {
  submitTryFollowUpApi.mockResolvedValue(reply({ fallback: true }));
  await mount();
  await fill();
  await submit();
  expect(JSON.parse(localStorage.getItem(STASH)).handoff).toBe("e30.sig");
});

test("a failed try keeps nothing, and a newer try replaces an older one", async () => {
  // A readable older try: the widget keeps it unless it is replaced by a new one.
  const older = `${Buffer.from(
    JSON.stringify({
      answer: "Older answer",
      follow_up: "Older follow-up",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url")}.sig`;
  localStorage.setItem(
    STASH,
    JSON.stringify({ handoff: older, savedAt: Date.now() }),
  );
  submitTryFollowUpApi.mockRejectedValue({
    response: { status: 422, data: { detail: "No." } },
  });
  await mount();
  await fill();
  await submit();
  expect(JSON.parse(localStorage.getItem(STASH)).handoff).toBe(older);
  submitTryFollowUpApi.mockResolvedValue(reply({ handoff: "new.sig" }));
  await solveCheck("tok-2");
  await submit();
  expect(JSON.parse(localStorage.getItem(STASH)).handoff).toBe("new.sig");
});

test("a reply without a token still shows the follow-up and promises nothing", async () => {
  submitTryFollowUpApi.mockResolvedValue(reply({ handoff: undefined }));
  await mount();
  await fill();
  await submit();
  expect(container.textContent).toContain(
    "How did you measure the 12% saving?",
  );
  expect(localStorage.getItem(STASH)).toBeNull();
  expect(container.textContent).not.toContain("saved for 24 hours");
});

test("blocked browser storage does not break the try and the page does not promise a saved answer", async () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  submitTryFollowUpApi.mockResolvedValue(reply());
  await mount();
  await fill();
  await submit();
  expect(container.textContent).toContain(
    "How did you measure the 12% saving?",
  );
  expect(container.textContent).not.toContain("saved for 24 hours");
  expect(container.querySelector("a").getAttribute("href")).toMatch(
    /^\/auth\?mode=signup/,
  );
});

test("an expired saved try is dropped when a visitor comes back to the page", async () => {
  localStorage.setItem(
    STASH,
    JSON.stringify({
      handoff: "e30.sig",
      savedAt: Date.now() - 25 * 60 * 60 * 1000,
    }),
  );
  await mount();
  expect(localStorage.getItem(STASH)).toBeNull();
});
