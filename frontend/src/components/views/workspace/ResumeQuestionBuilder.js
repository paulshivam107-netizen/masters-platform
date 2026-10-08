import React, { useEffect, useRef, useState } from "react";
import * as api from "../../../api/interviewsApi";
import InterviewQuestionBank from "./InterviewQuestionBank";

export default function ResumeQuestionBuilder({
  capabilities,
  route,
  showRoutePicker = true,
  onRouteChange,
  applicationId,
  programmeName = "",
  disabled,
  onChoose,
  onUseProfile,
  onRemoveProfile,
}) {
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [filename, setFilename] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [factIds, setFactIds] = useState([]);
  useEffect(() => {
    setFactIds((selected?.graph.profile || []).map((fact) => fact.id));
  }, [selected]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reload, setReload] = useState(0);
  const active = useRef(true);
  const pending = useRef(new Set());
  const inFlight = useRef(false);
  const generation = useRef(null);
  const review = useRef(null);
  const questions = useRef(null);
  const focusTarget = useRef(null);
  useEffect(() => {
    if (!busy && focusTarget.current) {
      focusTarget.current.current?.focus();
      focusTarget.current = null;
    }
  }, [busy, showText]);

  useEffect(() => {
    active.current = true;
    const controllers = pending.current;
    return () => {
      active.current = false;
      controllers.forEach((item) => item.abort());
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api
      .listResumeQuestions(0, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setHistory(result.items);
        setOffset(result.items.length);
        setHasMore(result.has_more);
      })
      .catch(async (err) => {
        if (!controller.signal.aborted) setError(await api.interviewError(err));
      });
    return () => controller.abort();
  }, [reload]);

  async function run(label, action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    const controller = new AbortController();
    pending.current.add(controller);
    try {
      await action(controller.signal);
    } catch (err) {
      if (active.current && !controller.signal.aborted)
        setError(await api.interviewError(err));
    } finally {
      pending.current.delete(controller);
      inFlight.current = false;
      if (active.current) setBusy("");
    }
  }
  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const format = file.name.split(".").pop().toLowerCase();
    if (
      !["pdf", "docx", "txt"].includes(format) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a PDF, DOCX or UTF-8 text file under 5 MiB.");
      return;
    }
    run("Reading your résumé…", async (signal) => {
      const result = await api.extractResume(file, format, signal);
      if (!active.current) return;
      setText(result.text);
      setFilename(file.name);
      setConsent(false);
      generation.current = null;
      setNotice(
        "Text extracted. Review it below and remove anything you do not want sent to AI.",
      );
      focusTarget.current = review;
    });
  }
  function generate(event) {
    event.preventDefault();
    const payload = {
      route,
      resume_text: text.trim(),
      application_id: applicationId ? Number(applicationId) : null,
      programme_name: programmeName,
      consent,
    };
    const signature = JSON.stringify(payload);
    if (generation.current?.signature !== signature)
      generation.current = { signature, id: crypto.randomUUID() };
    run("Preparing your profile and questions…", async (signal) => {
      const result = await api.createResumeQuestions(
        { ...payload, request_id: generation.current.id },
        signal,
      );
      if (!active.current) return;
      setSelected(result);
      setConfirmDelete(false);
      setHistory((items) => [
        result,
        ...items.filter((item) => item.id !== result.id),
      ]);
      // The original résumé stays out of browser storage and saved interview context.
      setText("");
      setFilename("");
      setConsent(false);
      generation.current = null;
      setNotice(
        "Your profile and questions are saved. Review the facts below before using them in practice. The full résumé text has been cleared.",
      );
      focusTarget.current = questions;
    });
  }
  const locked = disabled || Boolean(busy);
  return (
    <section className="resume-builder" aria-label="Questions from your résumé">
      <p className="resume-intro">
        Your résumé is enough to start. Review its text, then check the facts we
        extract. Live follow-ups will respond to your answers; mapped questions
        are possible starting points.
      </p>
      {error && (
        <div className="studio-message error" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            disabled={locked}
            onClick={() => {
              setError("");
              setReload((value) => value + 1);
            }}
          >
            Reload saved sets
          </button>
        </div>
      )}
      {notice && (
        <p className="studio-message" role="status">
          {notice}
        </p>
      )}
      {!capabilities?.chat && (
        <p className="studio-message">
          You can upload and review your résumé now. Generating tailored
          questions becomes available when AI is connected.
        </p>
      )}
      <form onSubmit={generate}>
        <fieldset className="studio-form-fields" disabled={locked}>
          <div className="resume-upload">
            <label htmlFor="resume-upload">Upload your résumé</label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              aria-describedby="resume-upload-help"
              onChange={upload}
            />
            <small id="resume-upload-help">
              PDF (up to 10 pages), DOCX or TXT · Up to 5 MiB. Scanned PDFs need
              pasted text. The uploaded file is not saved.
            </small>
          </div>
          {!text && !showText && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                focusTarget.current = review;
                setShowText(true);
              }}
            >
              Paste résumé text instead
            </button>
          )}
          {(text || showText) && (
            <div className="form-group">
              <label htmlFor="resume-text">
                Review or paste résumé text{" "}
                {filename && (
                  <span className="resume-filename">· {filename}</span>
                )}
              </label>
              <textarea
                id="resume-text"
                ref={review}
                value={text}
                maxLength={20000}
                rows={8}
                onChange={(event) => {
                  setText(event.target.value);
                  setConsent(false);
                }}
                aria-describedby="resume-text-help"
                placeholder="Paste your education, work experience, projects and achievements here. Remove contact details and anything you do not want to share."
              />
              <small id="resume-text-help">
                {text.length.toLocaleString()} / 20,000 characters · At least
                80. Check reading order and missing lines. Text stays on this
                page until you leave or clear it.
              </small>
            </div>
          )}
          {!route && showRoutePicker && (
            <div className="form-group">
              <label htmlFor="resume-route">Programme type</label>
              <select
                id="resume-route"
                required
                value={route}
                onChange={(event) => onRouteChange(event.target.value)}
              >
                <option value="">Choose your programme type</option>
                <option value="cat">Two-year MBA</option>
                <option value="experienced">
                  One-year MBA · Experienced professionals
                </option>
              </select>
            </div>
          )}
          {text && (
            <label className="studio-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={!capabilities?.chat || locked}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I agree to send this reviewed text to OpenAI to extract profile
                facts and draft questions. The facts, questions and short
                supporting excerpts are saved privately to my account and can be
                deleted. This app does not save the full résumé text.
              </span>
            </label>
          )}
          <div className="studio-actions">
            <button
              type="submit"
              className="new-essay-btn"
              disabled={
                locked ||
                !capabilities?.chat ||
                !route ||
                text.trim().length < 80 ||
                !consent
              }
            >
              {busy || "Build my profile & questions"}
            </button>
            {text && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setText("");
                  setFilename("");
                  setConsent(false);
                  generation.current = null;
                }}
              >
                Clear résumé text
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <div ref={questions} tabIndex={-1} className="resume-results">
        {selected && (
          <>
            <div className="resume-set-heading">
              <div>
                <span className="eyebrow">YOUR RÉSUMÉ PROFILE</span>
                <h3>{selected.context.school}</h3>
                <p>
                  {selected.context.route === "cat"
                    ? "Two-year MBA"
                    : "One-year MBA · Experienced professionals"}{" "}
                  · {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="studio-actions">
                <button
                  className="text-button"
                  disabled={locked}
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(selected, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "my-interview-questions.json";
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Export questions
                </button>
                <button
                  className="text-button danger"
                  disabled={locked}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete set
                </button>
              </div>
            </div>
            {confirmDelete && (
              <div className="studio-message" role="alert">
                <p>
                  Delete this profile, question set and its résumé excerpts?
                  Existing practice sessions will keep their copied profile
                  facts and questions until you delete those sessions
                  separately.
                </p>
                <div className="studio-actions">
                  <button
                    className="secondary-action-btn"
                    disabled={locked}
                    onClick={() =>
                      run("Deleting question set…", async (signal) => {
                        await api.deleteResumeQuestions(selected.id, signal);
                        if (!active.current) return;
                        setHistory((items) =>
                          items.filter((item) => item.id !== selected.id),
                        );
                        setSelected(null);
                        onRemoveProfile?.(selected.id);
                        setConfirmDelete(false);
                        setNotice("Question set deleted.");
                        setReload((value) => value + 1);
                      })
                    }
                  >
                    Delete permanently
                  </button>
                  <button
                    className="text-button"
                    disabled={locked}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep set
                  </button>
                </div>
              </div>
            )}
            {selected.graph.profile?.length > 0 && (
              <div className="resume-profile-review">
                <h3>Check what the interviewer will know</h3>
                <p className="studio-fine-print">
                  These are excerpts from your résumé, not verified
                  achievements. Uncheck anything irrelevant or inaccurate. To
                  correct the source text, paste or upload a revised résumé
                  above.
                </p>
                <fieldset className="studio-form-fields" disabled={locked}>
                  <legend className="sr-only">Facts to use in practice</legend>
                  {selected.graph.profile.map((fact) => (
                    <label className="resume-fact" key={fact.id}>
                      <input
                        type="checkbox"
                        checked={factIds.includes(fact.id)}
                        onChange={(event) =>
                          setFactIds((ids) =>
                            event.target.checked
                              ? [...ids, fact.id]
                              : ids.filter((id) => id !== fact.id),
                          )
                        }
                      />
                      <span>
                        <small>{fact.category}</small>
                        {fact.evidence_quote}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <button
                  type="button"
                  className="new-essay-btn"
                  disabled={locked || !factIds.length}
                  onClick={() =>
                    onUseProfile?.({
                      id: selected.id,
                      route: selected.context.route,
                      facts: selected.graph.profile.filter((fact) =>
                        factIds.includes(fact.id),
                      ),
                    })
                  }
                >
                  Use reviewed profile
                </button>
              </div>
            )}
            <details className="resume-mapped-questions">
              <summary>
                Explore 3 openings and their possible follow-ups
              </summary>
              <InterviewQuestionBank
                key={selected.id}
                bankData={selected.graph}
                heading="Your tailored questions"
                route={selected.context.route}
                disabled={locked}
                onChoose={(node) =>
                  onChoose({ ...node, question_set_id: selected.id })
                }
              />
            </details>
          </>
        )}
      </div>
      {history.length > 0 && (
        <div className="studio-history">
          <h3>Saved profiles & question sets</h3>
          {history.map((item) => (
            <button
              key={item.id}
              className="studio-history-row"
              disabled={locked}
              aria-pressed={selected?.id === item.id}
              onClick={() => {
                setSelected(item);
                setConfirmDelete(false);
              }}
            >
              <span>
                <strong>{item.context.school}</strong>
                <small>
                  {new Date(item.created_at).toLocaleDateString()} · 9 questions
                  ·{" "}
                  {item.context.route === "cat"
                    ? "Two-year MBA"
                    : "Experienced professionals"}
                </small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
          {hasMore && (
            <button
              className="text-button"
              disabled={locked}
              onClick={() =>
                run("Loading saved sets…", async (signal) => {
                  const result = await api.listResumeQuestions(offset, signal);
                  if (!active.current) return;
                  setHistory((items) => [
                    ...items,
                    ...result.items.filter(
                      (item) => !items.some((old) => old.id === item.id),
                    ),
                  ]);
                  setOffset(offset + result.items.length);
                  setHasMore(result.has_more);
                })
              }
            >
              More saved sets
            </button>
          )}
        </div>
      )}
    </section>
  );
}
