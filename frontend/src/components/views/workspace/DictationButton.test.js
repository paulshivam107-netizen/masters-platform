import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DictationButton, { appendTranscript } from "./DictationButton";
import * as api from "../../../api/interviewsApi";
import useInterviewAudio from "./useInterviewAudio";

jest.mock("../../../api/interviewsApi", () => ({
  transcribeInterview: jest.fn(),
}));
jest.mock("./useInterviewAudio");

global.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(global, "crypto", {
  value: { randomUUID: () => "00000000-0000-4000-8000-000000000000" },
  configurable: true,
});

let audio;
let hookArgs;
let container;
let root;
const mockAudio = (patch = {}) => {
  audio = {
    recording: false,
    requesting: false,
    processing: false,
    seconds: 0,
    supported: true,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
    ...patch,
  };
};
const props = (extra = {}) => ({
  sessionId: "s1",
  version: 4,
  available: true,
  maxSeconds: 90,
  maxBytes: 1000,
  onTranscript: jest.fn(),
  onActiveChange: jest.fn(),
  ...extra,
});
const render = async (p) => {
  await act(async () => {
    root.render(<DictationButton {...p} />);
  });
};
const button = () => container.querySelector(".wi-dictate__btn");
const status = () => container.querySelector('[role="status"]').textContent;

beforeEach(() => {
  mockAudio();
  hookArgs = null;
  useInterviewAudio.mockImplementation((args) => {
    hookArgs = args;
    return audio;
  });
  api.transcribeInterview.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("idle shows Dictate and starts recording with the capability limits", async () => {
  await render(props());
  expect(button().textContent).toContain("Dictate");
  expect(button().getAttribute("aria-pressed")).toBe("false");
  expect(hookArgs.maxSeconds).toBe(90);
  expect(hookArgs.maxBytes).toBe(1000);
  await act(async () => button().click());
  expect(audio.startRecording).toHaveBeenCalled();
});

test("unavailable (demo) is disabled with a reason", async () => {
  await render(props({ available: false }));
  expect(button().disabled).toBe(true);
  expect(container.textContent).toContain("Dictation needs live AI");
});

test("unsupported browser is disabled with a reason", async () => {
  mockAudio({ supported: false });
  await render(props());
  expect(button().disabled).toBe(true);
  expect(container.textContent).toContain("not supported");
});

test("recording shows Stop, elapsed time and aria-pressed", async () => {
  mockAudio({ recording: true, seconds: 65 });
  await render(props());
  expect(button().textContent).toContain("Stop");
  expect(button().textContent).toContain("1:05");
  expect(button().getAttribute("aria-pressed")).toBe("true");
  expect(status()).toContain("Recording started");
  await act(async () => button().click());
  expect(audio.stopRecording).toHaveBeenCalled();
});

test("transcript is handed back while transcribing is announced", async () => {
  let finish;
  api.transcribeInterview.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const p = props();
  await render(p);
  await act(async () => {
    hookArgs.onRecording(new Blob(["x"], { type: "audio/webm" }));
  });
  expect(button().textContent).toContain("Transcribing…");
  expect(button().getAttribute("aria-disabled")).toBe("true");
  expect(p.onActiveChange).toHaveBeenLastCalledWith(true);
  expect(api.transcribeInterview.mock.calls[0][0]).toBe("s1");
  expect(api.transcribeInterview.mock.calls[0][2].expected_version).toBe(4);
  await act(async () => finish({ text: "I led a team." }));
  expect(p.onTranscript).toHaveBeenCalledWith("I led a team.");
  expect(button().textContent).toContain("Dictate");
  expect(p.onActiveChange).toHaveBeenLastCalledWith(false);
});

test("appendTranscript joins with one space and respects the limit", () => {
  expect(appendTranscript("Hello ", " world ")).toBe("Hello world");
  expect(appendTranscript("", "world")).toBe("world");
  expect(appendTranscript("keep", "  ")).toBe("keep");
  expect(appendTranscript("a".repeat(2999), "bcd")).toHaveLength(3000);
});

test("API failure shows a message and allows retry", async () => {
  api.transcribeInterview.mockRejectedValue({
    response: { data: { detail: "Today's usage limit reached." } },
  });
  const p = props();
  await render(p);
  await act(async () => {
    hookArgs.onRecording(new Blob(["x"]));
  });
  expect(p.onTranscript).not.toHaveBeenCalled();
  expect(status()).toContain("usage limit");
  expect(button().textContent).toContain("Try again");
  await act(async () => button().click());
  expect(audio.startRecording).toHaveBeenCalled();
});

test("recorder errors surface in the status region", async () => {
  await render(props());
  await act(async () => hookArgs.onError("Microphone access was not granted."));
  expect(status()).toContain("Microphone access");
});

test("auto-stop limits are passed to the recorder hook, which stops at maxSeconds", async () => {
  await render(props({ maxSeconds: 30 }));
  expect(hookArgs.maxSeconds).toBe(30);
});
