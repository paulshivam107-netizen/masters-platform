import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";
import { ArrowIcon, CheckIcon } from "../../../app/icons";
import * as api from "../../../api/interviewsApi";
import useInterviewAudio from "./useInterviewAudio";
import InterviewQuestionBank from "./InterviewQuestionBank";
import ResumeQuestionBuilder from "./ResumeQuestionBuilder";
import FocusedPractice from "./FocusedPractice";
import { clearInterviewIntent } from "./interviewIntent";
import DictationButton, { appendTranscript } from "./DictationButton";
import "./InterviewStudio.css";
import "./WorkspaceInterview.css";
import {
  AREA_LABELS,
  LEVEL_LABELS,
  changes,
  chipLabel,
  previousFull,
  trend,
} from "../../../app/readiness";

const requestId = () => crypto.randomUUID();
const draftKey = (id) => `interview_answer:${id}`;
const excerpt = (text) =>
  text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
function Readiness({ session, history }) {
  const r = session.readiness;
  if (!r) return null;
  const isFull = r.status === "full";
  const prev = isFull ? previousFull(history, session) : null;
  const diff = prev ? r.score - prev.readiness.score : null;
  const scores = trend([
    ...history.filter((item) => item.id !== session.id),
    ...(isFull ? [session] : []),
  ]);
  const moved = prev ? changes(prev.readiness.levels, r.levels) : [];
  return (
    <div className="studio-readiness" data-testid="readiness">
      {isFull ? (
        <p className="studio-readiness__score">
          Interview readiness <strong>{r.score}/100</strong>
        </p>
      ) : (
        <p className="studio-readiness__score">
          <strong>Partial readiness</strong>
        </p>
      )}
      <p>
        Based on {r.assessed} of 5 areas.{" "}
        {isFull
          ? "Practice signal, not an admission prediction."
          : "A full interview covers enough for a score."}
      </p>
      {prev && (
        <p>
          {diff === 0
            ? "Same as your last interview"
            : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} since your last interview`}
          {moved.length > 0 && (
            <>
              {" · "}
              {moved.map((m) => `${m.area}: ${m.from} → ${m.to}`).join(" · ")}
            </>
          )}
        </p>
      )}
      {scores.length >= 2 && <p>Your last scores: {scores.join(" → ")}</p>}
      <details>
        <summary>How this is calculated</summary>
        <p>
          Each area is rated from your own words as strong, partial or missing.
          Areas the interview didn’t cover don’t count.
        </p>
        {(session.feedback?.dimensions || []).map((d) => (
          <article className="studio-feedback-point" key={d.dimension}>
            <strong>
              {AREA_LABELS[d.dimension] || d.dimension}:{" "}
              {LEVEL_LABELS[d.level] || d.level}
            </strong>
            {d.quote && (
              <blockquote>
                “{d.quote}” <cite>Answer {d.turn_id.slice(1)}</cite>
              </blockquote>
            )}
          </article>
        ))}
      </details>
    </div>
  );
}

const sessionLabel = (session) =>
  `${session.context.kind === "taster" ? "Why MBA interview" : session.context.school} · ${session.provider === "demo" ? "Practice question" : "AI practice"}`;
const GENERIC_SCHOOL = "General MBA practice";
// ?programme=… prefills the programme field only. Untrusted text: trimmed and capped, never auto-starts.
export const programmeFromLocation = () => {
  try {
    return (new URLSearchParams(window.location.search).get("programme") || "")
      .trim()
      .slice(0, 160);
  } catch {
    return "";
  }
};

export default function InterviewStudio({
  applications,
  selectedApplicationId,
}) {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState(null);
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState("");
  const [dictating, setDictating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chosenQuestion, setChosenQuestion] = useState(null);
  const [reviewedProfile, setReviewedProfile] = useState(null);
  const preference = readUserValue(user.id, "interview_preferences", {});
  const [linkedProgramme] = useState(programmeFromLocation);
  const [setup, setSetup] = useState({
    application_id: linkedProgramme
      ? ""
      : selectedApplicationId ||
        (applications.some(
          (app) => String(app.id) === String(preference.application_id),
        )
          ? preference.application_id
          : ""),
    programme_name:
      linkedProgramme ||
      (typeof preference.programme_name === "string"
        ? preference.programme_name
        : ""),
    practice_focus: "balanced",
    background: "",
    goal: "",
    mode: "chat",
    question_limit: 5,
  });
  const [focusResume, setFocusResume] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const controllers = useRef(new Set());
  const draft = useRef(null);
  const createRequest = useRef(null);
  const finishRequest = useRef(null);
  const speechCache = useRef(new Map());
  const transcriptEnd = useRef(null);
  const bankDisclosure = useRef(null);
  const resumeSection = useRef(null);
  const lastStart = useRef(null);
  const startButton = useRef(null);
  const practiceDisclosure = useRef(null);
  useEffect(() => {
    if (session?.status === "active") transcriptEnd.current?.focus();
  }, [session?.id, session?.status]);
  useEffect(() => {
    writeUserValue(user.id, "interview_preferences", {
      programme_name: setup.programme_name,
      application_id: setup.application_id,
    });
  }, [user.id, setup.programme_name, setup.application_id]);

  useEffect(() => {
    active.current = true;
    const pending = controllers.current;
    return () => {
      active.current = false;
      pending.forEach((controller) => controller.abort());
    };
  }, []);

  const openSession = (next) => {
    if (!active.current) return;
    setSession(next);
    setConfirmDelete(false);
    writeUserValue(user.id, "interview_active_id", next.id);
    const saved = readUserValue(user.id, draftKey(next.id), null);
    const accepted =
      saved?.request_id &&
      next.transcript.some((turn) => turn.request_id === saved.request_id);
    if (
      saved &&
      typeof saved.text === "string" &&
      !accepted &&
      next.status === "active"
    ) {
      setAnswer(saved.text);
      draft.current =
        saved.expected_version === next.version
          ? saved
          : {
              text: saved.text,
              request_id: requestId(),
              expected_version: next.version,
            };
      setNotice(
        saved.expected_version === next.version
          ? "Your unsent answer was recovered from this browser."
          : "This session moved on. Review the recovered draft against the current question before sending it.",
      );
    } else {
      setAnswer("");
      draft.current = null;
      writeUserValue(user.id, draftKey(next.id), null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      api.getInterviewCapabilities(controller.signal),
      api.listInterviews(0, controller.signal),
    ])
      .then(async ([caps, previous]) => {
        if (controller.signal.aborted) return;
        setCapabilities(caps);
        clearInterviewIntent();
        setHistory(previous.items);
        setHasMore(previous.has_more);
        setHistoryOffset(previous.items.length);
        const lastId = readUserValue(user.id, "interview_active_id", "");
        if (lastId) {
          try {
            const current = await api.getInterview(lastId, controller.signal);
            if (!controller.signal.aborted) openSession(current);
          } catch (err) {
            if (err.response?.status === 404)
              writeUserValue(user.id, "interview_active_id", null);
            else throw err;
          }
        }
      })
      .catch(async (err) => {
        if (!controller.signal.aborted) setError(await api.interviewError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // Account changes remount the workspace. A reload explicitly refreshes capabilities/history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, reload]);

  const run = async (label, action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      await action(controller.signal);
    } catch (err) {
      if (active.current && !controller.signal.aborted)
        setError(await api.interviewError(err));
    } finally {
      controllers.current.delete(controller);
      inFlight.current = false;
      if (active.current) setBusy("");
    }
  };
  const updateSession = (next) => {
    if (!active.current) return;
    setSession(next);
    setHistory((previous) => [
      next,
      ...previous.filter((item) => item.id !== next.id),
    ]);
  };
  const updateAnswer = (text) => {
    setAnswer(text);
    draft.current = {
      text,
      request_id: requestId(),
      expected_version: session.version,
    };
    if (
      !writeUserValue(
        user.id,
        draftKey(session.id),
        text ? draft.current : null,
      )
    ) {
      setNotice(
        "This browser cannot keep an unsent draft. Keep this page open until your answer is submitted.",
      );
    }
  };
  const audio = useInterviewAudio({
    maxSeconds: capabilities?.max_recording_seconds,
    maxBytes: capabilities?.max_audio_bytes,
    onError: setError,
    onRecording: (blob) =>
      run("Transcribing your answer…", async (signal) => {
        const result = await api.transcribeInterview(
          session.id,
          blob,
          { request_id: requestId(), expected_version: session.version },
          signal,
        );
        if (active.current) {
          updateAnswer(result.text);
          setNotice(
            "Review the transcript, correct any mistakes, then send your answer.",
          );
        }
      }),
  });
  const leaveSession = () => {
    audio.cancelRecording();
    audio.stopPlayback();
    speechCache.current.clear();
    setSession(null);
    setAnswer("");
    setError("");
    setNotice("");
    setConfirmDelete(false);
    writeUserValue(user.id, "interview_active_id", null);
  };
  const wantResume = () => setFocusResume(true);
  useEffect(() => {
    if (!focusResume || session || loading) return;
    setFocusResume(false);
    const section = resumeSection.current;
    if (!section) return;
    section.scrollIntoView?.({ block: "start", behavior: "smooth" });
    section.querySelector("input")?.focus({ preventScroll: true });
  }, [focusResume, session, loading]);
  const startWith = (settings) => {
    const provider = capabilities.chat ? "openai" : "demo";
    lastStart.current = settings;
    const payload = {
      ...settings.setup,
      route: "auto",
      kind: "full",
      provider,
      mode: provider === "demo" ? "chat" : settings.setup.mode,
      application_id: settings.setup.application_id
        ? Number(settings.setup.application_id)
        : null,
      question_limit: Number(settings.setup.question_limit),
      question_id: settings.question?.id || null,
      question_set_id: settings.question?.question_set_id || null,
      profile_set_id: settings.profile?.id || null,
      profile_fact_ids: settings.profile
        ? settings.profile.facts.map((fact) => fact.id)
        : null,
    };
    const signature = JSON.stringify(payload);
    if (createRequest.current?.signature !== signature)
      createRequest.current = { signature, id: requestId() };
    run("Starting your interview…", async (signal) => {
      const next = await api.createInterview(
        { ...payload, request_id: createRequest.current.id },
        signal,
      );
      if (!active.current) return;
      openSession(next);
      updateSession(next);
      createRequest.current = null;
    });
  };
  const start = (event) => {
    event.preventDefault();
    startWith({
      setup,
      question: chosenQuestion,
      profile: reviewedProfile,
    });
  };
  // Same settings, one click.
  const practiseAgain = () => {
    const settings = lastStart.current || {
      setup,
      question: null,
      profile: reviewedProfile,
    };
    leaveSession();
    startWith({ ...settings, question: null });
  };
  const submitAnswer = (event) => {
    event.preventDefault();
    if (!answer.trim()) return;
    audio.stopPlayback();
    const payload = draft.current || {
      text: answer,
      expected_version: session.version,
      request_id: requestId(),
    };
    draft.current = payload;
    writeUserValue(user.id, draftKey(session.id), payload);
    run("Thinking… preparing your next question", async (signal) => {
      const next = await api.answerInterview(session.id, payload, signal);
      if (!active.current) return;
      updateSession(next);
      setAnswer("");
      draft.current = null;
      writeUserValue(user.id, draftKey(session.id), null);
      speechCache.current.clear();
      transcriptEnd.current?.focus();
    });
  };
  const finish = () => {
    audio.stopPlayback();
    const key = `${session.id}:${session.version}`;
    if (finishRequest.current?.key !== key)
      finishRequest.current = { key, id: requestId() };
    run("Preparing your debrief…", async (signal) => {
      const next = await api.finishInterview(
        session.id,
        {
          request_id: finishRequest.current.id,
          expected_version: session.version,
        },
        signal,
      );
      updateSession(next);
    });
  };
  const question = session?.transcript
    .filter((turn) => turn.role === "assistant")
    .slice(-1)[0];
  const lastAnswer = session?.transcript
    .filter((turn) => turn.role === "user")
    .slice(-1)[0];
  const closing = question?.kind === "end_requested" ? question : null;
  const hearQuestion = () => {
    if (audio.playing) {
      audio.stopPlayback();
      return;
    }
    run("Loading question audio…", async (signal) => {
      let blob = speechCache.current.get(question.id);
      if (!blob) {
        blob = await api.speakInterviewQuestion(
          session.id,
          {
            request_id: requestId(),
            expected_version: session.version,
            turn_id: question.id,
          },
          signal,
        );
        speechCache.current.set(question.id, blob);
      }
      if (active.current) await audio.play(blob);
    });
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-${session.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const disabled = Boolean(
    busy ||
    dictating ||
    audio.recording ||
    audio.requesting ||
    audio.processing,
  );
  const live = Boolean(capabilities?.chat);
  const sessionHadResume = Boolean(
    lastStart.current?.profile ||
    session?.context?.profile_set_id ||
    session?.context?.resume_profile,
  );
  const programmeShown =
    session?.context?.school && session.context.school !== GENERIC_SCHOOL
      ? `${session.context.school} · ${session.context.programme}`
      : session?.context?.programme && session.context.programme !== "MBA"
        ? session.context.programme
        : "";
  return (
    <section
      className="interview-studio wi-studio"
      aria-labelledby="interview-studio-title"
      data-testid="interview-studio"
    >
      <header className="studio-heading">
        <div>
          <h2 id="interview-studio-title">Mock interview</h2>
        </div>
        {session && (
          <button
            className="ws-btn ws-btn--ghost ws-btn--sm"
            disabled={disabled}
            onClick={leaveSession}
          >
            All sessions
          </button>
        )}
      </header>
      {error && (
        <div className="studio-message error" role="alert">
          <p>{error}</p>
          <button
            className="ws-btn ws-btn--ghost ws-btn--sm"
            disabled={disabled}
            onClick={() =>
              session
                ? run("Reloading…", async (signal) =>
                    openSession(await api.getInterview(session.id, signal)),
                  )
                : (setError(""), setReload((value) => value + 1))
            }
          >
            Reload {session ? "session" : "interviews"}
          </button>
        </div>
      )}
      {notice && (
        <p className="studio-message" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="wi-loading">
          Opening your interview workspace…
        </p>
      ) : !capabilities ? (
        <p className="studio-message">
          Interview practice is unavailable while we reconnect.
        </p>
      ) : !session ? (
        <>
          <p className="studio-intro">
            {live
              ? "A live interviewer asks about you and follows up on your answers. Debrief at the end."
              : "Practise one question at a time and return to your answers whenever you need."}
          </p>
          {!capabilities.chat && (
            <p className="studio-message" data-testid="demo-notice">
              AI interviews are temporarily unavailable. You can still rehearse
              a question below.
            </p>
          )}
          {live && (
            <section
              className="studio-resume-step"
              ref={resumeSection}
              aria-labelledby="studio-resume-heading"
            >
              <h3 id="studio-resume-heading">
                Your résumé{" "}
                <span>Optional · for sharper, personal questions</span>
              </h3>
              <ResumeQuestionBuilder
                capabilities={capabilities}
                programmeName={setup.programme_name}
                applicationId={setup.application_id}
                disabled={disabled}
                onRemoveProfile={(id) => {
                  if (reviewedProfile?.id === id) setReviewedProfile(null);
                  if (chosenQuestion?.question_set_id === id)
                    setChosenQuestion(null);
                }}
                onUseProfile={(profile) => {
                  setReviewedProfile(profile);
                  setChosenQuestion(null);
                }}
                onChoose={(node) => {
                  setChosenQuestion(node);
                  if (reviewedProfile?.id !== node.question_set_id)
                    setReviewedProfile(null);
                  startButton.current?.focus();
                  setNotice(
                    "Starting question selected. Live follow-ups will adapt to your answers.",
                  );
                }}
              />
            </section>
          )}
          <form
            id="studio-start-form"
            className="studio-setup"
            onSubmit={start}
          >
            <fieldset className="studio-form-fields" disabled={disabled}>
              {applications.length > 0 && (
                <div className="ws-field">
                  <label htmlFor="studio-application">Tracked programme</label>
                  <select
                    id="studio-application"
                    value={setup.application_id}
                    onChange={(event) =>
                      setSetup({ ...setup, application_id: event.target.value })
                    }
                  >
                    <option value="">Type a programme instead</option>
                    {applications.map((app) => (
                      <option value={app.id} key={app.id}>
                        {app.school_name} · {app.program_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!setup.application_id && (
                <div className="ws-field">
                  <label htmlFor="studio-programme-name">
                    Preparing for (optional)
                  </label>
                  <input
                    id="studio-programme-name"
                    value={setup.programme_name}
                    maxLength={160}
                    placeholder="IIMA PGPX, INSEAD MBA…"
                    onChange={(event) =>
                      setSetup({ ...setup, programme_name: event.target.value })
                    }
                  />
                </div>
              )}
              {chosenQuestion && (
                <div className="studio-selected-question">
                  <span className="ws-eyebrow">
                    <span aria-hidden="true" />
                    Your starting question
                  </span>
                  <p>{chosenQuestion.text}</p>
                  <button
                    type="button"
                    className="ws-btn ws-btn--ghost ws-btn--sm"
                    onClick={() => setChosenQuestion(null)}
                  >
                    Use the default opening
                  </button>
                </div>
              )}
              {live && (
                <div
                  className="studio-mode-toggle"
                  role="group"
                  aria-label="How would you like to answer?"
                >
                  {[
                    ["chat", "Chat"],
                    ["voice", "Voice"],
                  ]
                    .filter(([value]) => value === "chat" || capabilities.voice)
                    .map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`ws-btn ws-btn--sm ${setup.mode === value ? "" : "ws-btn--ghost"}`}
                        aria-pressed={setup.mode === value}
                        onClick={() => setSetup({ ...setup, mode: value })}
                      >
                        {label}
                      </button>
                    ))}
                </div>
              )}
              <details className="studio-options">
                <summary>More options</summary>
                <div className="studio-fields">
                  <div className="ws-field">
                    <label htmlFor="studio-length">Session length</label>
                    <select
                      id="studio-length"
                      value={setup.question_limit}
                      onChange={(event) =>
                        setSetup({
                          ...setup,
                          question_limit: event.target.value,
                        })
                      }
                    >
                      <option value={3}>3 questions · Quick practice</option>
                      <option value={5}>5 questions · Focused session</option>
                      <option value={8}>8 questions · Longer session</option>
                    </select>
                  </div>
                  <div className="ws-field">
                    <label htmlFor="studio-focus">Practice focus</label>
                    <select
                      id="studio-focus"
                      value={setup.practice_focus}
                      onChange={(event) =>
                        setSetup({
                          ...setup,
                          practice_focus: event.target.value,
                        })
                      }
                    >
                      <option value="balanced">Balanced interview</option>
                      <option value="resume">Résumé deep dive</option>
                      <option value="behavioural">Behavioural questions</option>
                      <option value="motivation">
                        Why MBA & programme fit
                      </option>
                      <option value="work">Work, decisions & impact</option>
                      <option value="academics">Academics & projects</option>
                    </select>
                  </div>
                </div>
                <div className="ws-field">
                  <label htmlFor="studio-background">
                    SOP or notes (optional)
                  </label>
                  <textarea
                    id="studio-background"
                    data-testid="studio-background"
                    rows={5}
                    maxLength={4000}
                    value={setup.background}
                    placeholder="Paste a few paragraphs of your statement of purpose, an essay excerpt or notes about your goals."
                    onChange={(event) =>
                      setSetup({ ...setup, background: event.target.value })
                    }
                  />
                  <small className="studio-char-count">
                    {setup.background.length.toLocaleString()}/4,000 characters
                    {live
                      ? " · Saved with this interview and sent to OpenAI with your answers"
                      : " · Saved with this practice session"}
                  </small>
                </div>
              </details>
              <div className="studio-actions">
                <button
                  ref={startButton}
                  type="submit"
                  className="ws-btn ws-btn--primary"
                  disabled={disabled}
                >
                  {busy || (live ? "Start interview" : "Start practice")}{" "}
                  <ArrowIcon />
                </button>
              </div>
            </fieldset>
          </form>
          {history.length > 0 && (
            <div className="studio-history">
              <h3>Your recent sessions</h3>
              {history.map((item) => (
                <button
                  disabled={disabled}
                  key={item.id}
                  className="studio-history-row"
                  onClick={() =>
                    run("Opening session…", async (signal) =>
                      openSession(await api.getInterview(item.id, signal)),
                    )
                  }
                >
                  <span>
                    <strong>{sessionLabel(item)}</strong>
                    <small>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {item.answer_count}/{item.question_limit} answers ·{" "}
                      {item.status === "completed"
                        ? "Debrief ready"
                        : "Continue"}
                    </small>
                  </span>
                  {item.readiness && (
                    <span className="studio-chip">
                      {chipLabel(item.readiness)}
                    </span>
                  )}
                  <ArrowIcon />
                </button>
              ))}
              {hasMore && (
                <button
                  className="ws-btn ws-btn--ghost ws-btn--sm"
                  disabled={disabled}
                  onClick={() =>
                    run("Loading history…", async (signal) => {
                      const page = await api.listInterviews(
                        historyOffset,
                        signal,
                      );
                      if (active.current) {
                        setHistory((old) => [
                          ...old,
                          ...page.items.filter(
                            (item) =>
                              !old.some((existing) => existing.id === item.id),
                          ),
                        ]);
                        setHistoryOffset(
                          (offset) => offset + page.items.length,
                        );
                        setHasMore(page.has_more);
                      }
                    })
                  }
                >
                  Load older sessions
                </button>
              )}
            </div>
          )}
          <details className="studio-bank-disclosure" ref={bankDisclosure}>
            <summary>
              Explore the question bank <span>Optional starting points</span>
            </summary>
            <InterviewQuestionBank
              disabled={disabled}
              onChoose={(node) => {
                setChosenQuestion(node);
                if (bankDisclosure.current) bankDisclosure.current.open = false;
                startButton.current?.focus();
                setNotice(
                  "Opening selected. Follow-ups in a live interview will respond to your answer.",
                );
              }}
            />
          </details>
        </>
      ) : (
        <>
          <div className="studio-session-meta">
            <span
              className={`ws-chip ${session.provider === "demo" ? "ws-chip--warn" : "ws-chip--accent"}`}
            >
              {session.provider === "demo"
                ? "Practice question · fixed examples, not AI"
                : session.mode === "voice"
                  ? "AI voice practice"
                  : "AI chat practice"}
            </span>
            <span className="wi-progress">
              <span className="wi-progress__dots" aria-hidden="true">
                {Array.from({ length: session.question_limit }, (_, i) => (
                  <i
                    key={i}
                    className={
                      i < session.answer_count
                        ? "is-done"
                        : i === session.answer_count &&
                            session.status === "active"
                          ? "is-now"
                          : ""
                    }
                  />
                ))}
              </span>
              {session.answer_count} of {session.question_limit} answers saved
            </span>
          </div>
          <p className="studio-programme" data-testid="interview-header">
            {user?.name ? `Candidate: ${user.name}` : "Candidate"}
            {programmeShown ? ` · preparing for ${programmeShown}` : ""}
          </p>
          {session.provider === "demo" && (
            <p className="studio-fine-print">
              Questions are predefined and the debrief is an example, not
              personalised evaluation.
            </p>
          )}
          {session.busy && (
            <p className="studio-message">
              A step is still processing. Use Reload session after it finishes.
            </p>
          )}
          {session.status === "active" && (
            <div className="studio-conversation">
              {lastAnswer && (
                <figure className="wi-said" key={session.answer_count}>
                  <figcaption>
                    {session.provider === "demo"
                      ? "Your last answer"
                      : "You said"}
                  </figcaption>
                  <blockquote>“{excerpt(lastAnswer.text)}”</blockquote>
                </figure>
              )}
              <div
                className="studio-question"
                key={session.answer_count}
                tabIndex={-1}
                ref={transcriptEnd}
              >
                <span className="ws-eyebrow">
                  <span aria-hidden="true" />
                  {session.answer_count > 0
                    ? "Follow-up"
                    : "Opening question"}{" "}
                  · Question {session.answer_count + 1} of{" "}
                  {session.question_limit}
                </span>
                <h3>{question.text}</h3>
                {session.provider === "demo" && session.answer_count > 0 && (
                  <p className="wi-demo-note">
                    Demo questions are fixed. A live interviewer would build
                    this follow-up on your words above.
                  </p>
                )}
                {session.mode === "voice" && (
                  <button
                    className="ws-btn ws-btn--ghost ws-btn--sm"
                    disabled={disabled}
                    onClick={hearQuestion}
                  >
                    {audio.playing ? "Stop audio" : "Hear question"}
                  </button>
                )}
              </div>
              <form onSubmit={submitAnswer}>
                {session.mode === "voice" && (
                  <div
                    className={`studio-recording wi-mic ${audio.recording ? "is-recording" : ""} ${audio.requesting ? "is-requesting" : ""} ${!audio.supported ? "is-unsupported" : ""}`}
                  >
                    <button
                      type="button"
                      className="ws-btn wi-mic__btn"
                      disabled={
                        Boolean(busy) ||
                        audio.requesting ||
                        (!audio.recording && !audio.supported)
                      }
                      onClick={
                        audio.recording
                          ? audio.stopRecording
                          : audio.startRecording
                      }
                    >
                      {audio.requesting
                        ? "Waiting for microphone…"
                        : audio.recording
                          ? `Stop & transcribe · ${audio.seconds}s`
                          : "Record answer"}
                    </button>
                    {(audio.recording || audio.requesting) && (
                      <button
                        type="button"
                        className="ws-btn ws-btn--ghost ws-btn--sm"
                        onClick={audio.cancelRecording}
                      >
                        {audio.requesting
                          ? "Cancel microphone request"
                          : "Discard recording"}
                      </button>
                    )}
                    <small>
                      {audio.supported
                        ? "Up to 2 minutes. Recording stops before the transcript is prepared."
                        : "Recording is unavailable in this browser. You can type your answer below."}
                    </small>
                  </div>
                )}
                <div className="ws-field">
                  <label htmlFor="studio-answer">
                    {session.mode === "voice"
                      ? "Review your transcript or type an answer"
                      : "Your answer"}
                  </label>
                  <textarea
                    id="studio-answer"
                    data-testid="interview-answer"
                    maxLength={3000}
                    rows={7}
                    value={answer}
                    disabled={disabled}
                    onChange={(event) => updateAnswer(event.target.value)}
                    placeholder="Take your time. Use a specific example and explain your own contribution."
                  />
                  <small className="studio-char-count">
                    {answer.length}/3,000 characters · Unsent draft stays in
                    this browser
                  </small>
                </div>
                {session.mode !== "voice" && (
                  <DictationButton
                    sessionId={session.id}
                    version={session.version}
                    available={Boolean(live && capabilities?.voice)}
                    disabled={Boolean(busy)}
                    maxSeconds={capabilities?.max_recording_seconds}
                    maxBytes={capabilities?.max_audio_bytes}
                    focusId="studio-answer"
                    onActiveChange={setDictating}
                    onTranscript={(text) =>
                      updateAnswer(appendTranscript(answer, text))
                    }
                  />
                )}
                <div className="studio-actions">
                  <button
                    className="ws-btn ws-btn--primary"
                    type="submit"
                    disabled={disabled || !answer.trim()}
                  >
                    {busy || "Send answer"} <ArrowIcon />
                  </button>
                  {session.answer_count > 0 && !answer.trim() && (
                    <button
                      type="button"
                      className="ws-btn ws-btn--ghost ws-btn--sm"
                      disabled={disabled}
                      onClick={finish}
                    >
                      Finish early & get feedback
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
          {session.status === "ready_for_feedback" && (
            <div className="studio-ready wi-ready">
              <CheckIcon />
              <h3>Your answers are saved.</h3>
              {closing && <p>{closing.text}</p>}
              <p>Get a short debrief and one exercise to try next.</p>
              <button
                className="ws-btn ws-btn--primary"
                disabled={disabled}
                onClick={finish}
              >
                {busy || "Get my debrief"}
              </button>
            </div>
          )}
          {session.feedback && (
            <div className="studio-debrief wi-debrief">
              <h3>
                {session.provider === "demo"
                  ? "Example debrief"
                  : "Your debrief"}
              </h3>
              <Readiness session={session} history={history} />
              <p>{session.feedback.summary}</p>
              <h4>What to build on</h4>
              {session.feedback.strengths.map((point, index) => (
                <article
                  className="studio-feedback-point"
                  key={`strength-${index}`}
                >
                  <blockquote>
                    “{point.quote}” <cite>Answer {point.turn_id.slice(1)}</cite>
                  </blockquote>
                  <p>{point.observation}</p>
                </article>
              ))}
              <h4>What to make clearer</h4>
              {session.feedback.improvements.map((point, index) => (
                <article
                  className="studio-feedback-point"
                  key={`improve-${index}`}
                >
                  <blockquote>
                    “{point.quote}” <cite>Answer {point.turn_id.slice(1)}</cite>
                  </blockquote>
                  <p>{point.observation}</p>
                  <p>
                    <strong>Try this:</strong> {point.suggestion}
                  </p>
                </article>
              ))}
              <div className="studio-exercise">
                <span className="ws-eyebrow">
                  <span aria-hidden="true" />
                  Your next practice
                </span>
                <p>{session.feedback.next_exercise}</p>
              </div>
              <p className="studio-fine-print">
                Practice guidance based on these answers. It does not predict
                admission or assess accent, personality or spoken delivery.
              </p>
              <div className="studio-actions">
                <button
                  className="ws-btn ws-btn--primary"
                  disabled={disabled}
                  onClick={practiseAgain}
                >
                  Practise again <ArrowIcon />
                </button>
                {!sessionHadResume && live && (
                  <button
                    className="ws-btn ws-btn--ghost"
                    disabled={disabled}
                    onClick={() => {
                      leaveSession();
                      wantResume();
                    }}
                  >
                    Add your résumé for sharper, personal questions
                  </button>
                )}
              </div>
            </div>
          )}
          <details className="studio-transcript">
            <summary>View saved conversation</summary>
            {session.transcript.map((turn) => (
              <article key={turn.id}>
                <strong>
                  {turn.role === "user"
                    ? `Your answer ${turn.id.slice(1)}`
                    : turn.kind === "end_requested"
                      ? "Closing message"
                      : `Question ${turn.id.slice(1)}`}
                </strong>
                <p>{turn.text}</p>
              </article>
            ))}
          </details>
          <div className="studio-session-actions">
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={disabled}
              onClick={download}
            >
              Export session
            </button>
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={disabled}
              onClick={() =>
                run("Reloading…", async (signal) =>
                  openSession(await api.getInterview(session.id, signal)),
                )
              }
            >
              Reload session
            </button>
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={disabled}
              onClick={() => setConfirmDelete(true)}
            >
              Delete session
            </button>
          </div>
          {confirmDelete && (
            <div className="studio-message" role="alert">
              <p>Delete this session, transcript and debrief permanently?</p>
              <div className="studio-actions">
                <button
                  className="ws-btn"
                  disabled={disabled}
                  onClick={() =>
                    run("Deleting…", async (signal) => {
                      await api.deleteInterview(session.id, signal);
                      if (active.current) {
                        writeUserValue(user.id, draftKey(session.id), null);
                        setHistory((old) =>
                          old.filter((item) => item.id !== session.id),
                        );
                        leaveSession();
                      }
                    })
                  }
                >
                  Delete permanently
                </button>
                <button
                  className="ws-btn ws-btn--ghost ws-btn--sm"
                  disabled={disabled}
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep session
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {busy && (
        <p className="studio-progress" role="status" aria-live="polite">
          {busy}
        </p>
      )}
      <FocusedPractice
        opening={chosenQuestion?.text || ""}
        active={!session && !loading}
        disclosureRef={practiceDisclosure}
      />
    </section>
  );
}
