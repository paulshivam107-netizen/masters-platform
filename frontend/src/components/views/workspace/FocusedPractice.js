import React, { useEffect, useRef, useState } from "react";
import useInterviewAudio from "./useInterviewAudio";

const shared = [
  "Tell me about yourself and why you want to pursue an MBA.",
  "Tell me about a time something you tried did not work out. What happened?",
  "Describe a disagreement in a team. What did you personally do?",
  "What experience would you bring to your classmates, and what would you like to learn from them?",
];
const specific = {
  cat: [
    "Choose a subject you enjoyed. Explain a concept from it and where it could be useful.",
    "Walk me through a college project or activity. What was your own contribution?",
  ],
  experienced: [
    "Describe a decision you owned at work. What trade-off did you make?",
    "What has changed in the responsibilities you handle, and why is an MBA timely now?",
  ],
};
const time = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function FocusedPractice({
  route = "",
  opening = "",
  active = true,
  disclosureRef,
}) {
  const questions = [
    ...new Set(
      [opening, ...shared, ...(specific[route] || [])].filter(Boolean),
    ),
  ];
  const [selected, setSelected] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [removeId, setRemoveId] = useState(null);
  const [latestId, setLatestId] = useState(null);
  const recordedQuestion = useRef("");
  const urls = useRef(new Set());
  const players = useRef(new Map());
  const currentQuestion = questions.includes(selected)
    ? selected
    : questions[0];
  const audio = useInterviewAudio({
    onError: (message) =>
      setError(
        message.replace(/type your answer(?: below)?/g, "rehearse aloud"),
      ),
    onRecording: (blob) => {
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      const id = crypto.randomUUID();
      setAttempts((items) => [
        ...items,
        {
          id,
          url,
          question: recordedQuestion.current,
          type: blob.type,
          note: "",
          downloaded: false,
        },
      ]);
      setLatestId(id);
    },
  });
  useEffect(() => {
    const savedUrls = urls.current;
    return () => savedUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (audio.recording || attempts.some((item) => !item.downloaded))
      window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [attempts, audio.recording]);
  useEffect(() => {
    if (!active) {
      audio.cancelRecording();
      players.current.forEach((player) => player?.pause());
    }
    // Stop capture on entering a mock; keep the completed attempts in this mounted component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const locked = audio.recording || audio.requesting || audio.processing;
  const latest = attempts.find((item) => item.id === latestId);
  const record = () => {
    setError("");
    recordedQuestion.current = currentQuestion;
    players.current.forEach((player) => player?.pause());
    audio.startRecording();
  };
  const renderAttempt = (item, index) => (
    <article
      className="practice-attempt"
      key={item.id}
      aria-label={`Attempt ${index + 1}`}
    >
      <div className="practice-attempt-heading">
        <strong>Attempt {index + 1}</strong>
        <span>
          {item.downloaded ? "Download requested" : "On this page only"}
        </span>
      </div>
      <p>{item.question}</p>
      <audio
        controls
        preload="metadata"
        src={item.url}
        aria-label={`Listen to attempt ${index + 1}`}
        ref={(element) =>
          element
            ? players.current.set(item.id, element)
            : players.current.delete(item.id)
        }
        onPlay={() =>
          players.current.forEach((player, id) => {
            if (id !== item.id) player?.pause();
          })
        }
      />
      <label htmlFor={`attempt-note-${item.id}`}>
        Your reflection <span className="studio-fine-print">Optional</span>
      </label>
      <textarea
        id={`attempt-note-${item.id}`}
        rows={2}
        maxLength={1000}
        value={item.note}
        placeholder="What would you keep or change in another attempt?"
        onChange={(event) =>
          setAttempts((items) =>
            items.map((old) =>
              old.id === item.id ? { ...old, note: event.target.value } : old,
            ),
          )
        }
      />
      <div className="studio-actions">
        <a
          className="text-button"
          href={item.url}
          download={`practice-answer-${index + 1}.${item.type.includes("mp4") ? "m4a" : "webm"}`}
          onClick={() =>
            setAttempts((items) =>
              items.map((old) =>
                old.id === item.id ? { ...old, downloaded: true } : old,
              ),
            )
          }
        >
          Download audio
        </a>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob(
                [
                  `${item.question}\n\n${item.note || "No reflection added."}\n`,
                ],
                { type: "text/plain" },
              ),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `practice-notes-${index + 1}.txt`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download question & notes
        </button>
        <button
          type="button"
          className="text-button danger"
          disabled={locked}
          onClick={() => setRemoveId(item.id)}
        >
          Remove attempt
        </button>
      </div>
      {removeId === item.id && (
        <div className="studio-message" role="alert">
          <p>
            Remove this recording and reflection? Download them first if you
            want to keep them.
          </p>
          <div className="studio-actions">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => {
                players.current.get(item.id)?.pause();
                URL.revokeObjectURL(item.url);
                urls.current.delete(item.url);
                setAttempts((items) =>
                  items.filter((old) => old.id !== item.id),
                );
                setRemoveId(null);
              }}
            >
              Remove recording
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setRemoveId(null)}
            >
              Keep attempt
            </button>
          </div>
        </div>
      )}
    </article>
  );
  return (
    <details
      className="studio-bank-disclosure focused-practice"
      ref={disclosureRef}
      hidden={!active}
    >
      <summary>
        Practise one question{" "}
        <span>Record, listen back and try again · No AI needed</span>
      </summary>
      <p className="studio-fine-print">
        Audio stays on this page and is never uploaded. Up to 2 minutes per
        answer, 6 attempts. Download anything you want to keep before leaving
        Interviews or reloading.
      </p>
      <div className="form-group">
        <label htmlFor="focused-question">Question</label>
        <select
          id="focused-question"
          value={currentQuestion}
          disabled={locked}
          onChange={(event) => setSelected(event.target.value)}
        >
          {questions.map((question) => (
            <option key={question}>{question}</option>
          ))}
        </select>
      </div>
      <h3 className="focused-question">{currentQuestion}</h3>
      {error && (
        <p className="studio-message error" role="alert">
          {error}
        </p>
      )}
      {!audio.supported && (
        <p className="studio-message">
          Recording needs microphone support in a secure browser. You can still
          read and rehearse these questions aloud.
        </p>
      )}
      <div className="studio-actions">
        <button
          type="button"
          className="new-essay-btn"
          disabled={
            audio.requesting ||
            audio.processing ||
            !audio.supported ||
            (!audio.recording && attempts.length >= 6)
          }
          onClick={audio.recording ? audio.stopRecording : record}
        >
          {audio.processing
            ? "Preparing recording…"
            : audio.requesting
              ? "Waiting for microphone…"
              : audio.recording
                ? "Stop & listen back"
                : latest
                  ? "Record another attempt"
                  : "Record answer"}
        </button>
        {locked && (
          <button
            type="button"
            className="text-button"
            onClick={audio.cancelRecording}
          >
            {audio.requesting
              ? "Cancel microphone request"
              : "Discard current recording"}
          </button>
        )}
        <button
          type="button"
          className="text-button"
          disabled={locked}
          onClick={() =>
            setSelected(
              questions[
                (questions.indexOf(currentQuestion) + 1) % questions.length
              ],
            )
          }
        >
          Try another question
        </button>
        {audio.recording && (
          <output className="recording-status" aria-live="off">
            Recording · {time(audio.seconds)} / 2:00
          </output>
        )}
      </div>
      {attempts.length >= 6 && (
        <p className="studio-message">
          Six attempts are kept here. Download and remove an attempt to record
          another.
        </p>
      )}
      {latest && (
        <div role="status" className="studio-fine-print">
          Your recording is ready below. Listen back or try again; previous
          attempts stay available.
        </div>
      )}
      {latest && renderAttempt(latest, attempts.indexOf(latest))}
      {attempts.filter((item) => item.id !== latestId).length > 0 && (
        <details className="practice-previous">
          <summary>
            Earlier attempts (
            {attempts.filter((item) => item.id !== latestId).length})
          </summary>
          {attempts.map(
            (item, index) => item.id !== latestId && renderAttempt(item, index),
          )}
        </details>
      )}
      <p className="studio-fine-print">
        This is self-review. For transcription and AI feedback, start an
        Interview Studio voice session when AI is connected.
      </p>
    </details>
  );
}
