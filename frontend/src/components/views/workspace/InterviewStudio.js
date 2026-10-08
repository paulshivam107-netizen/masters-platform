import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";
import { ArrowIcon, CheckIcon, InterviewIcon } from "../../../app/icons";
import * as api from "../../../api/interviewsApi";
import useInterviewAudio from "./useInterviewAudio";
import InterviewQuestionBank from "./InterviewQuestionBank";
import ResumeQuestionBuilder from "./ResumeQuestionBuilder";
import FocusedPractice from "./FocusedPractice";
import "./InterviewStudio.css";

const requestId = () => crypto.randomUUID();
const draftKey = (id) => `interview_answer:${id}`;
const sessionLabel = (session) =>
  `${session.context.school} · ${session.provider === "demo" ? "Demo" : "AI practice"}`;

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
    route: ["cat", "experienced"].includes(preference.route)
      ? preference.route
      : "",
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
  const [demo, setDemo] = useState(false);
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
      route: setup.route,
      programme_name: setup.programme_name,
      application_id: setup.application_id,
    });
  }, [user.id, setup.route, setup.programme_name, setup.application_id]);
  const changeRoute = (route) => {
    setSetup((old) => ({ ...old, route, practice_focus: "balanced" }));
    setReviewedProfile(null);
    setChosenQuestion(null);
  };

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
  const start = (event) => {
    event.preventDefault();
    const provider = capabilities.chat && !demo ? "openai" : "demo";
    const payload = {
      ...setup,
      provider,
      mode: provider === "demo" ? "chat" : setup.mode,
      application_id: setup.application_id
        ? Number(setup.application_id)
        : null,
      question_limit: Number(setup.question_limit),
      question_id: chosenQuestion?.id || null,
      question_set_id: chosenQuestion?.question_set_id || null,
      profile_set_id: reviewedProfile?.id || null,
      profile_fact_ids: reviewedProfile
        ? reviewedProfile.facts.map((fact) => fact.id)
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
  const live = capabilities?.chat && !demo;
  return (
    <section
      className="dashboard-card interview-studio"
      aria-labelledby="interview-studio-title"
      data-testid="interview-studio"
    >
      <header className="studio-heading">
        <div>
          <span className="eyebrow">
            <InterviewIcon /> INTERVIEW STUDIO
          </span>
          <h2 id="interview-studio-title">A conversation worth practising.</h2>
        </div>
        {session && (
          <button
            className="text-button"
            disabled={disabled}
            onClick={leaveSession}
          >
            All sessions
          </button>
        )}
        {!session && capabilities && (
          <div className="studio-heading-actions">
            <button
              className="text-button"
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
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => {
                if (resumeDisclosure.current) {
                  resumeDisclosure.current.open = true;
                  resumeDisclosure.current.querySelector("input")?.focus();
                }
              }}
            >
              From your résumé
            </button>
          </div>
        )}
      </header>
      {error && (
        <div className="studio-message error" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
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
        <p role="status">Opening your interview workspace…</p>
      ) : !capabilities ? (
        <p>Interview practice is unavailable while we reconnect.</p>
      ) : !session ? (
        <>
          <p className="studio-intro">
            Practise for your MBA interview, one question at a time. Return to
            your answers and debrief whenever you need. Start with your
            programme and résumé; the interviewer follows what you say.
          </p>
          {!capabilities.chat && (
            <p className="studio-message">
              {capabilities.message} Demo questions and feedback are fixed
              examples, not an assessment.
            </p>
          )}
          <section
            className="studio-journey"
            aria-labelledby="studio-programme-heading"
          >
            <h3 id="studio-programme-heading">
              <span className="studio-step">1</span> Your programme
            </h3>
            <div className="studio-fields">
              <div className="form-group">
                <label htmlFor="studio-route">Programme type</label>
                <select
                  id="studio-route"
                  form="studio-start-form"
                  required
                  disabled={disabled}
                  value={setup.route}
                  onChange={(event) => changeRoute(event.target.value)}
                >
                  <option value="">Choose your programme type</option>
                  <option value="cat">Two-year MBA</option>
                  <option value="experienced">
                    One-year MBA · Experienced professionals
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="studio-application">Target programme</label>
                <select
                  id="studio-application"
                  disabled={disabled}
                  value={setup.application_id}
                  onChange={(event) =>
                    setSetup({ ...setup, application_id: event.target.value })
                  }
                >
                  <option value="">
                    Enter a programme or practise generally
                  </option>
                  {applications.map((app) => (
                    <option value={app.id} key={app.id}>
                      {app.school_name} · {app.program_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!setup.application_id && (
              <div className="form-group">
                <label htmlFor="studio-programme-name">
                  School and programme{" "}
                  <span className="studio-fine-print">
                    Optional for general practice
                  </span>
                </label>
                <input
                  id="studio-programme-name"
                  value={setup.programme_name}
                  disabled={disabled}
                  maxLength={160}
                  placeholder={
                    setup.route === "experienced"
                      ? "For example: IIM Ahmedabad PGPX"
                      : "For example: IIM Bangalore PGP"
                  }
                  onChange={(event) =>
                    setSetup({ ...setup, programme_name: event.target.value })
                  }
                />
              </div>
            )}
          </section>
          <details
            className="studio-bank-disclosure studio-resume-step"
            ref={resumeDisclosure}
            open={!reviewedProfile || undefined}
          >
            <summary>
              <span className="studio-step">2</span> Your résumé{" "}
              <span>
                {reviewedProfile
                  ? `${reviewedProfile.facts.length} reviewed ${reviewedProfile.facts.length === 1 ? "fact" : "facts"} ready`
                  : "Upload once, review your profile"}
              </span>
            </summary>
            {reviewedProfile && (
              <p className="studio-message">
                Your reviewed profile is selected. The interviewer can ask about
                these facts and follow your answers.
              </p>
            )}
            <ResumeQuestionBuilder
              capabilities={capabilities}
              route={setup.route}
              showRoutePicker={false}
              programmeName={setup.programme_name}
              applicationId={setup.application_id}
              disabled={disabled}
              onRouteChange={changeRoute}
              onRemoveProfile={(id) => {
                if (reviewedProfile?.id === id) setReviewedProfile(null);
                if (chosenQuestion?.question_set_id === id)
                  setChosenQuestion(null);
              }}
              onUseProfile={(profile) => {
                setReviewedProfile(profile);
                setChosenQuestion(null);
                setSetup((old) => ({ ...old, route: profile.route }));
                if (resumeDisclosure.current)
                  resumeDisclosure.current.open = false;
                startButton.current?.focus();
                setNotice(
                  "Profile selected. Choose your practice focus below and start when ready.",
                );
              }}
              onChoose={(node) => {
                setChosenQuestion(node);
                if (reviewedProfile?.id !== node.question_set_id)
                  setReviewedProfile(null);
                setSetup((old) => ({ ...old, route: node.routes[0] }));
                if (resumeDisclosure.current)
                  resumeDisclosure.current.open = false;
                startButton.current?.focus();
                setNotice(
                  "Starting question selected. Live follow-ups will adapt to your answers.",
                );
              }}
            />
          </details>
          <form
            id="studio-start-form"
            className="studio-setup"
            onSubmit={start}
          >
            <h3>
              <span className="studio-step">3</span> Your practice
            </h3>
            <fieldset className="studio-form-fields" disabled={disabled}>
              {chosenQuestion && (
                <div className="studio-selected-question">
                  <span className="eyebrow">YOUR STARTING QUESTION</span>
                  <p>{chosenQuestion.text}</p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setChosenQuestion(null)}
                  >
                    Use the default opening
                  </button>
                </div>
              )}
              <div className="studio-fields">
                <div className="form-group">
                  <label htmlFor="studio-focus">Practice focus</label>
                  <select
                    id="studio-focus"
                    value={setup.practice_focus}
                    onChange={(event) =>
                      setSetup({ ...setup, practice_focus: event.target.value })
                    }
                  >
                    <option value="balanced">Balanced interview</option>
                    <option value="resume">Résumé deep dive</option>
                    <option value="behavioural">Behavioural questions</option>
                    <option value="motivation">Why MBA & programme fit</option>
                    <option
                      value={
                        setup.route === "experienced" ? "work" : "academics"
                      }
                    >
                      {setup.route === "experienced"
                        ? "Work, decisions & impact"
                        : "Academics & projects"}
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="studio-length">Session length</label>
                  <select
                    id="studio-length"
                    value={setup.question_limit}
                    onChange={(event) =>
                      setSetup({ ...setup, question_limit: event.target.value })
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
                    disabled={!capabilities.voice || demo}
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
                    I agree to send my selected profile facts and answers to
                    OpenAI for this practice. Voice recordings are sent for
                    transcription; this app does not retain audio. My
                    transcript, copied profile facts and feedback are saved to
                    my account until I delete the session.
                  </span>
                </label>
              )}
              {!live && (
                <p className="studio-fine-print">
                  The demo saves your typed answers to your account. It makes no
                  AI calls and uses fixed follow-ups.
                </p>
              )}
              {live && !reviewedProfile && (
                <p className="studio-fine-print">
                  No résumé profile selected. You can still practise; the
                  interviewer will use only your answers and chosen programme.
                </p>
              )}
              <div className="studio-actions">
                <button
                  ref={startButton}
                  type="submit"
                  className="new-essay-btn"
                  disabled={disabled || !setup.route}
                >
                  {busy || (live ? "Start interview" : "Start demo")}{" "}
                  <ArrowIcon />
                </button>
                {capabilities.chat && (
                  <label className="studio-demo-option">
                    <input
                      type="checkbox"
                      checked={demo}
                      onChange={(event) => setDemo(event.target.checked)}
                    />
                    Use the free demo
                  </label>
                )}
              </div>
            </fieldset>
          </form>
          <details className="studio-bank-disclosure" ref={bankDisclosure}>
            <summary>
              Explore the question bank <span>Optional starting points</span>
            </summary>
            <InterviewQuestionBank
              route={setup.route}
              disabled={disabled}
              onChoose={(node) => {
                if (!setup.route && node.routes.length === 1)
                  changeRoute(node.routes[0]);
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
                  className="text-button"
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
            <span className="pill">
              {session.provider === "demo"
                ? "DEMO · FIXED EXAMPLES"
                : session.mode === "voice"
                  ? "AI VOICE PRACTICE"
                  : "AI CHAT PRACTICE"}
            </span>
            <span>
              {session.answer_count} of {session.question_limit} answers saved
            </span>
          </div>
          <p className="studio-programme">
            {session.context.school} · {session.context.programme}
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
              <div
                className="studio-question"
                tabIndex={-1}
                ref={transcriptEnd}
              >
                <span className="eyebrow">
                  QUESTION {session.answer_count + 1}
                </span>
                <h3>{question.text}</h3>
                {session.mode === "voice" && (
                  <button
                    className="text-button"
                    disabled={disabled}
                    onClick={hearQuestion}
                  >
                    {audio.playing ? "Stop audio" : "Hear question"}
                  </button>
                )}
              </div>
              <form onSubmit={submitAnswer}>
                {session.mode === "voice" && (
                  <div className="studio-recording">
                    <button
                      type="button"
                      className="secondary-action-btn"
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
                        className="text-button"
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
                <div className="form-group">
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
                    className="new-essay-btn"
                    type="submit"
                    disabled={disabled || !answer.trim()}
                  >
                    {busy || "Send answer"} <ArrowIcon />
                  </button>
                  {session.answer_count > 0 && !answer.trim() && (
                    <button
                      type="button"
                      className="text-button"
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
            <div className="studio-ready">
              <CheckIcon />
              <h3>Your answers are saved.</h3>
              <p>Get a short debrief and one exercise to try next.</p>
              <button
                className="new-essay-btn"
                disabled={disabled}
                onClick={finish}
              >
                {busy || "Get my debrief"}
              </button>
            </div>
          )}
          {session.feedback && (
            <div className="studio-debrief">
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
                <span className="eyebrow">YOUR NEXT PRACTICE</span>
                <p>{session.feedback.next_exercise}</p>
              </div>
              <p className="studio-fine-print">
                Practice guidance based on these answers. It does not predict
                admission or assess accent, personality or spoken delivery.
              </p>
              <button className="secondary-action-btn" onClick={leaveSession}>
                Practise again <ArrowIcon />
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
                    : `Question ${turn.id.slice(1)}`}
                </strong>
                <p>{turn.text}</p>
              </article>
            ))}
          </details>
          <div className="studio-session-actions">
            <button
              className="text-button"
              disabled={disabled}
              onClick={download}
            >
              Export session
            </button>
            <button
              className="text-button"
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
              className="text-button"
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
                  className="secondary-action-btn"
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
                  className="text-button"
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
        route={setup.route}
        opening={chosenQuestion?.text || ""}
        active={!session && !loading}
        disclosureRef={practiceDisclosure}
      />
    </section>
  );
}
