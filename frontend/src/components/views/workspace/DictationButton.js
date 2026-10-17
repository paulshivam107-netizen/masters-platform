import React, { useEffect, useRef, useState } from "react";
import * as api from "../../../api/interviewsApi";
import useInterviewAudio from "./useInterviewAudio";

const requestId = () => crypto.randomUUID();
const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Joins a transcript onto what is already typed. The candidate edits before sending.
export const appendTranscript = (current, text, limit = 3000) => {
  const addition = String(text || "").trim();
  if (!addition) return current;
  const base = current.trimEnd();
  return (base ? `${base} ${addition}` : addition).slice(0, limit);
};

// Dictation for the typed answer box. It reuses the interview recorder and the
// backend transcription route, which enforces the quota and cost caps.
export default function DictationButton({
  sessionId,
  version,
  available,
  unavailableReason = "Dictation needs live AI",
  disabled = false,
  maxSeconds,
  maxBytes,
  onTranscript,
  onActiveChange,
  focusId,
}) {
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const controller = useRef(null);
  const callbacks = useRef({});
  callbacks.current = { onTranscript, onActiveChange, sessionId, version };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  const audio = useInterviewAudio({
    maxSeconds,
    maxBytes,
    onError: (message) => alive.current && setError(message),
    onRecording: async (blob) => {
      setTranscribing(true);
      controller.current = new AbortController();
      try {
        const result = await api.transcribeInterview(
          callbacks.current.sessionId,
          blob,
          {
            request_id: requestId(),
            expected_version: callbacks.current.version,
          },
          controller.current.signal,
        );
        if (!alive.current) return;
        callbacks.current.onTranscript(result.text);
        if (focusId)
          setTimeout(() => document.getElementById(focusId)?.focus());
      } catch (err) {
        if (!alive.current || controller.current?.signal.aborted) return;
        const detail = err?.response?.data?.detail;
        setError(
          typeof detail === "string" && detail
            ? detail
            : "The recording could not be transcribed. Try again or type your answer.",
        );
      } finally {
        if (alive.current) setTranscribing(false);
      }
    },
  });

  const active = audio.recording || audio.requesting || transcribing;
  useEffect(() => {
    callbacks.current.onActiveChange?.(active);
  }, [active]);

  const usable = available && audio.supported;
  const reason = !available
    ? unavailableReason
    : !audio.supported
      ? "Dictation is not supported in this browser"
      : "";
  const state = audio.recording
    ? "recording"
    : audio.requesting
      ? "requesting"
      : transcribing
        ? "transcribing"
        : error
          ? "error"
          : "idle";
  const label = {
    idle: "Dictate",
    requesting: "Waiting for microphone…",
    recording: "Stop",
    transcribing: "Transcribing…",
    error: "Try again",
  }[state];
  const status = {
    idle: "",
    requesting: "Waiting for microphone permission.",
    recording: "Recording started.",
    transcribing: "Recording stopped. Transcribing.",
    error,
  }[state];

  const click = () => {
    if (audio.recording) return audio.stopRecording();
    if (state === "transcribing" || state === "requesting") return;
    setError("");
    audio.startRecording();
  };

  return (
    <div className={`wi-dictate is-${state}`} data-testid="dictation">
      <button
        type="button"
        className="ws-btn ws-btn--ghost ws-btn--sm wi-dictate__btn"
        aria-pressed={audio.recording}
        aria-disabled={
          state === "transcribing" || state === "requesting" ? true : undefined
        }
        disabled={!usable || (disabled && !active)}
        aria-describedby={reason ? "wi-dictate-reason" : undefined}
        onClick={click}
      >
        <span className="wi-dictate__dot" aria-hidden="true" />
        <span>{label}</span>
        {audio.recording && (
          <span className="wi-dictate__time" aria-hidden="true">
            {clock(audio.seconds)}
          </span>
        )}
      </button>
      {reason && (
        <small id="wi-dictate-reason" className="wi-dictate__hint">
          {reason}
        </small>
      )}
      {audio.recording && (
        <button
          type="button"
          className="ws-btn ws-btn--ghost ws-btn--sm"
          onClick={audio.cancelRecording}
        >
          Discard
        </button>
      )}
      <span
        className={`wi-dictate__status ${state === "error" ? "is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </span>
    </div>
  );
}
