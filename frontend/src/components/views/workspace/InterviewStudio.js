import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";
import { ArrowIcon, CheckIcon, InterviewIcon } from "../../../app/icons";
import * as api from "../../../api/interviewsApi";
import useInterviewAudio from "./useInterviewAudio";
import InterviewQuestionBank from "./InterviewQuestionBank";
import ResumeQuestionBuilder from "./ResumeQuestionBuilder";
import FocusedPractice from "./FocusedPractice";
import { clearInterviewIntent, getInterviewIntent } from "./interviewIntent";
import "./InterviewStudio.css";
import "./WorkspaceInterview.css";

const requestId = () => crypto.randomUUID();
const draftKey = (id) => `interview_answer:${id}`;
const excerpt = (text) =>
  text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
const sessionLabel = (session) =>
  `${session.context.kind === "taster" ? "Why MBA interview" : session.context.school} · ${session.provider === "demo" ? "Demo" : "AI practice"}`;
const GENERIC_SCHOOL = "General MBA practice";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chosenQuestion, setChosenQuestion] = useState(null);
  const [reviewedProfile, setReviewedProfile] = useState(null);
  const preference = readUserValue(user.id, "interview_preferences", {});
  const [setup, setSetup] = useState({
    application_id:
      selectedApplicationId ||
      (applications.some(
        (app) => String(app.id) === String(preference.application_id),
      )
        ? preference.application_id
        : ""),
    programme_name:
      typeof preference.programme_name === "string"
        ? preference.programme_name
        : "",
    practice_focus: "balanced",
    background: "",
    goal: "",
    mode: "chat",
    question_limit: 5,
    consent: false,
  });
  // "full" needs a reviewed résumé; "taster" is the 3-question Why MBA interview.
  const [plan, setPlan] = useState("full");
  const [tasterUsed, setTasterUsed] = useState(false);
  const [focusResume, setFocusResume] = useState(false);
  const startKind = useRef("");
  const active = useRef(true);
  const inFlight = useRef(false);
  const controllers = useRef(new Set());
  const draft = useRef(null);
  const createRequest = useRef(null);
  const finishRequest = useRef(null);
  const speechCache = useRef(new Map());
  const transcriptEnd = useRef(null);
  const bankDisclosure = useRef(null);
  const resumeDisclosure = useRef(null);
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
        setTasterUsed(
          Boolean(caps.taster_used) ||
            previous.items.some((item) => item.context?.kind === "taster"),
        );
        if (caps.chat && !caps.taster_used && getInterviewIntent() === "taster")
          setPlan("taster");
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
  const wantFullInterview = () => {
    setPlan("full");
    setFocusResume(true);
  };
  useEffect(() => {
    if (!focusResume || session || loading) return;
    setFocusResume(false);
    const details = resumeDisclosure.current;
    if (!details) return;
    details.open = true;
    details.scrollIntoView?.({ block: "start", behavior: "smooth" });
    details.querySelector("input")?.focus({ preventScroll: true });
  }, [focusResume, session, loading, plan]);
  const goFullInterview = () => {
    leaveSession();
    wantFullInterview();
  };
  const start = (event) => {
    event.preventDefault();
    const kind = startKind.current || (plan === "taster" ? "taster" : "full");
    startKind.current = "";
    const taster = kind === "taster";
    const provider = capabilities.chat ? "openai" : "demo";
    const payload = {
      ...setup,
      route: "auto",
      kind: taster ? "taster" : "full",
      provider,
      mode: provider === "demo" || taster ? "chat" : setup.mode,
      application_id: setup.application_id
        ? Number(setup.application_id)
        : null,
      question_limit: taster ? 3 : Number(setup.question_limit),
      practice_focus: taster ? "motivation" : setup.practice_focus,
      question_id: taster ? null : chosenQuestion?.id || null,
      question_set_id: taster ? null : chosenQuestion?.question_set_id || null,
      profile_set_id: taster ? null : reviewedProfile?.id || null,
      profile_fact_ids:
        reviewedProfile && !taster
          ? reviewedProfile.facts.map((fact) => fact.id)
          : null,
    };
    const signature = JSON.stringify(payload);
    if (createRequest.current?.signature !== signature)
      createRequest.current = { signature, id: requestId() };
    run("Starting your interview…", async (signal) => {
      let next;
      try {
        next = await api.createInterview(
          { ...payload, request_id: createRequest.current.id },
          signal,
        );
      } catch (err) {
        if (
          err.response?.status === 409 &&
          /taster/i.test(String(err.response?.data?.detail))
        ) {
          setTasterUsed(true);
          setPlan("full");
        }
        throw err;
      }
      if (!active.current) return;
      if (taster) {
        setTasterUsed(true);
        setPlan("full");
      }
      openSession(next);
      updateSession(next);
      createRequest.current = null;
    });
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
    run(
      "Saving your answer and preparing the next question…",
      async (signal) => {
        const next = await api.answerInterview(session.id, payload, signal);
        if (!active.current) return;
        updateSession(next);
        setAnswer("");
        draft.current = null;
        writeUserValue(user.id, draftKey(session.id), null);
        speechCache.current.clear();
        transcriptEnd.current?.focus();
      },
    );
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
    busy || audio.recording || audio.requesting || audio.processing,
  );
  const live = Boolean(capabilities?.chat);
  const hasResume = Boolean(reviewedProfile || chosenQuestion?.question_set_id);
  const tasterOpen = live && !tasterUsed;
  const tasterPlan = tasterOpen && plan === "taster";
  const isTaster = session?.context?.kind === "taster";
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
          <span className="ws-eyebrow wi-kicker">
            <InterviewIcon /> Interview Studio
          </span>
          <h2 id="interview-studio-title">A conversation worth practising.</h2>
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
        {!session && capabilities && (
          <div className="studio-heading-actions">
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={disabled}
              onClick={() => {
                if (practiceDisclosure.current) {
                  practiceDisclosure.current.open = true;
                  practiceDisclosure.current.querySelector("select")?.focus();
                }
              }}
            >
              Record & review
            </button>
            {capabilities.chat && (
              <button
                className="ws-btn ws-btn--ghost ws-btn--sm"
                disabled={disabled}
                onClick={wantFullInterview}
              >
                From your résumé
              </button>
            )}
          </div>
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
              ? "Practise for your MBA, executive MBA or Master in Management interview, one question at a time. Add your résumé and the interviewer follows what you say, with a debrief at the end."
              : "Practise one question at a time and return to your answers whenever you need."}
          </p>
          {!capabilities.chat && (
            <p className="studio-message" data-testid="demo-notice">
              <strong>Demo only.</strong> {capabilities.message} The demo uses
              fixed questions and an example debrief, not an assessment of your
              answers.
            </p>
          )}
          <section
            className="studio-journey"
            aria-labelledby="studio-programme-heading"
          >
            <h3 id="studio-programme-heading">
              <span className="studio-step">1</span> Programme you’re preparing
              for
            </h3>
            {applications.length > 0 && (
              <div className="ws-field">
                <label htmlFor="studio-application">Tracked programme</label>
                <select
                  id="studio-application"
                  disabled={disabled}
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
                  Programme you’re preparing for{" "}
                  <span className="studio-fine-print">
                    Optional, but it helps the panel
                  </span>
                </label>
                <input
                  id="studio-programme-name"
                  value={setup.programme_name}
                  disabled={disabled}
                  maxLength={160}
                  placeholder="For example: INSEAD MBA, HEC Paris MiM or ISB PGP"
                  onChange={(event) =>
                    setSetup({ ...setup, programme_name: event.target.value })
                  }
                />
              </div>
            )}
          </section>
          {live && (
            <details
              className="studio-bank-disclosure studio-resume-step"
              ref={resumeDisclosure}
              open={(plan === "full" && !hasResume) || undefined}
            >
              <summary>
                <span className="studio-step">2</span> Your résumé{" "}
                <span>
                  {reviewedProfile
                    ? `${reviewedProfile.facts.length} reviewed ${reviewedProfile.facts.length === 1 ? "fact" : "facts"} ready`
                    : plan === "taster"
                      ? "Not needed for the Why MBA interview"
                      : "Upload once, review your profile"}
                </span>
              </summary>
              {reviewedProfile && (
                <p className="studio-message">
                  Your reviewed profile is selected. The interviewer can ask
                  about these facts and follow your answers.
                </p>
              )}
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
                  setPlan("full");
                  if (resumeDisclosure.current)
                    resumeDisclosure.current.open = false;
                  startButton.current?.focus();
                  setNotice(
                    "Résumé profile selected. Start your interview when ready.",
                  );
                }}
                onChoose={(node) => {
                  setChosenQuestion(node);
                  setPlan("full");
                  if (reviewedProfile?.id !== node.question_set_id)
                    setReviewedProfile(null);
                  if (resumeDisclosure.current)
                    resumeDisclosure.current.open = false;
                  startButton.current?.focus();
                  setNotice(
                    "Starting question selected. Live follow-ups will adapt to your answers.",
                  );
                }}
              />
            </details>
          )}
          <details className="studio-bank-disclosure studio-sop">
            <summary>
              Add your SOP or notes (optional)
              <span>
                {setup.background
                  ? `${setup.background.length.toLocaleString()} characters added`
                  : "Anything else the panel should know"}
              </span>
            </summary>
            <div className="ws-field">
              <label htmlFor="studio-background">
                Anything else the panel should know (SOP, essay excerpts, notes)
              </label>
              <textarea
                id="studio-background"
                data-testid="studio-background"
                rows={5}
                maxLength={4000}
                disabled={disabled}
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
                  : " · Saved with this demo; the demo makes no AI calls"}
              </small>
            </div>
          </details>
          <form
            id="studio-start-form"
            className="studio-setup"
            onSubmit={start}
          >
            <h3>
              <span className="studio-step">{live ? 3 : 2}</span>{" "}
              {tasterPlan ? "Why MBA interview" : "Start"}
            </h3>
            <fieldset className="studio-form-fields" disabled={disabled}>
              {tasterPlan && (
                <div
                  className="studio-selected-question"
                  data-testid="taster-intro"
                >
                  <span className="ws-eyebrow">
                    <span aria-hidden="true" />
                    Why MBA interview
                  </span>
                  <p>
                    3 questions, about 5 minutes. No résumé needed: why an MBA,
                    why now, why this programme and your goals.
                  </p>
                  <button
                    type="button"
                    className="ws-btn ws-btn--ghost ws-btn--sm"
                    onClick={wantFullInterview}
                  >
                    Add your résumé for a full interview instead
                  </button>
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
              {!tasterPlan && (
                <details className="studio-options">
                  <summary>Practice options</summary>
                  <div className="studio-fields">
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
                        <option value="behavioural">
                          Behavioural questions
                        </option>
                        <option value="motivation">
                          Why MBA & programme fit
                        </option>
                        <option value="work">Work, decisions & impact</option>
                        <option value="academics">Academics & projects</option>
                      </select>
                    </div>
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
                  </div>
                  <fieldset className="studio-mode">
                    <legend>How would you like to answer?</legend>
                    <label>
                      <input
                        type="radio"
                        name="interview-mode"
                        value="chat"
                        checked={!live || setup.mode === "chat"}
                        onChange={() => setSetup({ ...setup, mode: "chat" })}
                      />
                      Chat
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="interview-mode"
                        value="voice"
                        checked={live && setup.mode === "voice"}
                        disabled={!capabilities.voice}
                        onChange={() => setSetup({ ...setup, mode: "voice" })}
                      />
                      Voice
                    </label>
                    <small>
                      {live && setup.mode === "voice"
                        ? "Record one answer, review its transcript, then send. The interviewer’s voice is AI-generated."
                        : !capabilities.voice
                          ? "AI voice interviews need an API connection. Recording and playback below work without AI."
                          : "Type one answer at a time. Follow-ups respond to what you say."}
                    </small>
                  </fieldset>
                </details>
              )}
              {live && (
                <label className="studio-consent">
                  <input
                    type="checkbox"
                    required
                    checked={setup.consent}
                    onChange={(event) =>
                      setSetup({ ...setup, consent: event.target.checked })
                    }
                  />
                  <span>
                    I agree to send my selected profile facts, anything I add as
                    extra context and my answers to OpenAI for this practice.
                    Voice recordings are sent for transcription; this app does
                    not retain audio. My transcript, copied profile facts, extra
                    context and feedback are saved to my account until I delete
                    the session.
                  </span>
                </label>
              )}
              {!live && (
                <p className="studio-fine-print">
                  The demo saves your typed answers to your account. It makes no
                  AI calls and uses fixed follow-ups.
                </p>
              )}
              {live && !tasterPlan && !hasResume && (
                <div className="studio-cta" data-testid="resume-cta">
                  <strong>Add your résumé to start a full interview</strong>
                  <p>
                    The panel builds its questions from your reviewed résumé
                    facts. Upload it once, check the facts, then start.
                  </p>
                  <button
                    type="button"
                    className="ws-btn ws-btn--primary"
                    onClick={wantFullInterview}
                  >
                    Add your résumé <ArrowIcon />
                  </button>
                </div>
              )}
              <div className="studio-actions">
                {(!live || tasterPlan || hasResume) && (
                  <button
                    ref={startButton}
                    type="submit"
                    className="ws-btn ws-btn--primary"
                    disabled={disabled}
                    onClick={() => {
                      startKind.current = tasterPlan ? "taster" : "full";
                    }}
                  >
                    {busy ||
                      (!live
                        ? "Start demo"
                        : tasterPlan
                          ? "Start your Why MBA interview"
                          : "Start interview")}{" "}
                    <ArrowIcon />
                  </button>
                )}
                {live && !tasterPlan && !hasResume && tasterOpen && (
                  <button
                    type="submit"
                    className="ws-btn"
                    data-testid="start-taster"
                    disabled={disabled}
                    onClick={() => {
                      startKind.current = "taster";
                    }}
                  >
                    Try a 3-question Why MBA interview
                  </button>
                )}
              </div>
              {live && !tasterOpen && !hasResume && (
                <p className="studio-fine-print" data-testid="taster-used">
                  You’ve used your Why MBA taster. Add your résumé for a full
                  interview.
                </p>
              )}
            </fieldset>
          </form>
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
        </>
      ) : (
        <>
          <div className="studio-session-meta">
            <span
              className={`ws-chip ${session.provider === "demo" ? "ws-chip--warn" : "ws-chip--accent"}`}
            >
              {session.provider === "demo"
                ? "Demo · fixed examples, not connected to AI"
                : isTaster
                  ? "Why MBA interview · 3 questions"
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
              This demonstrates the flow. Questions are predefined and the
              debrief is an example, not personalised evaluation.
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
              {isTaster && (
                <div className="studio-cta" data-testid="taster-resume-cta">
                  <strong>Add your résumé for a full interview</strong>
                  <p>
                    This was a short taster. With your résumé the panel asks
                    about your own experience and goes deeper.
                  </p>
                  <button
                    className="ws-btn ws-btn--primary"
                    disabled={disabled}
                    onClick={goFullInterview}
                  >
                    Add your résumé for a full interview <ArrowIcon />
                  </button>
                </div>
              )}
              <button
                className={isTaster ? "ws-btn ws-btn--ghost" : "ws-btn"}
                onClick={leaveSession}
              >
                {isTaster ? "Back to all sessions" : "Practise again"}{" "}
                <ArrowIcon />
              </button>
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
