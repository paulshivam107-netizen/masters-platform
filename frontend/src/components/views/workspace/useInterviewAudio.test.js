import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useInterviewAudio from "./useInterviewAudio";

let container, root, audio, onRecording, onError, stopTrack;
function Probe() {
  audio = useInterviewAudio({ onRecording, onError, maxSeconds: 2 });
  return null;
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  onRecording = jest.fn();
  onError = jest.fn();
  stopTrack = jest.fn();
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: jest.fn() },
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
      this.ondataavailable?.({ data: new Blob(["x".repeat(64)]) });
      this.onstop?.();
    }
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Probe />));
});
afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

test("denied microphone access leaves typed answers available and clears pending state", async () => {
  navigator.mediaDevices.getUserMedia.mockRejectedValue({
    name: "NotAllowedError",
  });
  await act(async () => {
    await audio.startRecording();
  });
  expect(audio.requesting).toBe(false);
  expect(audio.recording).toBe(false);
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining("type your answer"),
  );
  expect(onRecording).not.toHaveBeenCalled();
});

test("duplicate clicks cannot open two streams; a late permission grant after unmount is released", async () => {
  let resolvePermission, pending;
  navigator.mediaDevices.getUserMedia.mockReturnValue(
    new Promise((resolve) => {
      resolvePermission = resolve;
    }),
  );
  act(() => {
    pending = audio.startRecording();
    audio.startRecording();
  });
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
  root = null;
  await act(async () => {
    resolvePermission({ getTracks: () => [{ stop: stopTrack }] });
    await pending;
  });
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(onRecording).not.toHaveBeenCalled();
});

test("recording stops at the limit and releases the microphone before handing off audio", async () => {
  navigator.mediaDevices.getUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  });
  await act(async () => {
    await audio.startRecording();
  });
  expect(audio.recording).toBe(true);
  act(() => jest.advanceTimersByTime(2000));
  expect(audio.recording).toBe(false);
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(onRecording).toHaveBeenCalledTimes(1);
  expect(onRecording.mock.calls[0][0]).toBeInstanceOf(Blob);
});

test("cancelling while permission is pending prevents a late recording from starting", async () => {
  let resolvePermission, pending;
  navigator.mediaDevices.getUserMedia.mockReturnValue(
    new Promise((resolve) => {
      resolvePermission = resolve;
    }),
  );
  act(() => {
    pending = audio.startRecording();
  });
  act(() => audio.cancelRecording());
  await act(async () => {
    resolvePermission({ getTracks: () => [{ stop: stopTrack }] });
    await pending;
  });
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(audio.recording).toBe(false);
  expect(audio.requesting).toBe(false);
  expect(onRecording).not.toHaveBeenCalled();
});

test("a second recording cannot replace an answer while its final audio chunk is pending", async () => {
  let finalize;
  window.MediaRecorder.prototype.stop = function () {
    this.state = "inactive";
    finalize = () => {
      this.ondataavailable?.({ data: new Blob(["x".repeat(64)]) });
      this.onstop?.();
    };
  };
  navigator.mediaDevices.getUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  });
  await act(async () => audio.startRecording());
  act(() => audio.stopRecording());
  expect(audio.processing).toBe(true);
  await act(async () => audio.startRecording());
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  act(() => finalize());
  expect(onRecording).toHaveBeenCalledTimes(1);
  expect(audio.processing).toBe(false);
});
