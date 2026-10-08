import React, { act } from "react";
import { createRoot } from "react-dom/client";
import FocusedPractice from "./FocusedPractice";

let root, container, stopTrack, serial;
const button = (label) =>
  [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  serial = 0;
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => `attempt-${++serial}` },
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  stopTrack = jest.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: jest
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
    },
  });
  window.MediaRecorder = class {
    static isTypeSupported() {
      return true;
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["synthetic-audio".repeat(8)]) });
      this.onstop?.();
    }
  };
  URL.createObjectURL = jest.fn(() => `blob:synthetic-${serial + 1}`);
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<FocusedPractice route="cat" />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});
async function record() {
  await act(async () =>
    button(
      container.querySelector("audio")
        ? "Record another attempt"
        : "Record answer",
    ).click(),
  );
  act(() => button("Stop & listen back").click());
}

test("recording is opt-in, creates playback and downloads, and changing questions keeps the original attempt", async () => {
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  const question = container.querySelector("select").value;
  await record();
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(container.querySelector("audio").controls).toBe(true);
  expect(container.querySelector("a[download]").download).toMatch(/\.webm$/);
  act(() => button("Try another question").click());
  expect(container.querySelector("select").value).not.toBe(question);
  expect(container.querySelector("article").textContent).toContain(question);
  await record();
  expect(container.querySelectorAll("audio")).toHaveLength(2);
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  act(() => root.render(<FocusedPractice route="cat" active={false} />));
  expect(container.querySelectorAll("audio")).toHaveLength(2);
  expect(container.querySelector("details").hidden).toBe(true);
});

test("an attempt is removed only after confirmation and its object URL is released", async () => {
  await record();
  const url = container.querySelector("audio").getAttribute("src");
  act(() => button("Remove attempt").click());
  expect(container.querySelector("audio")).not.toBeNull();
  act(() => button("Keep attempt").click());
  expect(container.querySelector("audio")).not.toBeNull();
  act(() => button("Remove attempt").click());
  act(() => button("Remove recording").click());
  expect(container.querySelector("audio")).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
});

test("permission denial does not create an empty recording or promise transcription", async () => {
  navigator.mediaDevices.getUserMedia.mockRejectedValue({
    name: "NotAllowedError",
  });
  await act(async () => button("Record answer").click());
  expect(container.querySelector('[role="alert"]').textContent).toContain(
    "rehearse aloud",
  );
  expect(container.querySelector("audio")).toBeNull();
  expect(button("Record answer").disabled).toBe(false);
});
