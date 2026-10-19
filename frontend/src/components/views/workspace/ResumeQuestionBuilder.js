import React, { useEffect, useRef, useState } from "react";
import * as api from "../../../api/interviewsApi";
import InterviewQuestionBank from "./InterviewQuestionBank";

const MIN_TEXT = 80;
const BUILDING =
  "Building your interview from your résumé… usually 20–30 seconds";

export default function ResumeQuestionBuilder({
  capabilities,
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
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [factIds, setFactIds] = useState([]);
  const [retry, setRetry] = useState(null);
  const [builtText, setBuiltText] = useState("");
  const [checkOpen, setCheckOpen] = useState(false);
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
        if (controller.signal.aborted) return;
        setError(await api.interviewError(err));
        setRetry(() => () => setReload((value) => value + 1));
      });
    return () => controller.abort();
  }, [reload]);

  async function run(label, action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError("");
    setRetry(null);
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
      setRetry(null);
      return;
    }
    run("Reading your résumé…", async (signal) => {
      let result;
      try {
        result = await api.extractResume(file, format, signal);
      } catch (err) {
        if (active.current && !signal.aborted) {
          setShowText(true);
          setNotice(
            "We could not read that file. Paste your résumé text instead.",
          );
        }
        throw err;
      }
      if (!active.current) return;
      setFilename(file.name);
      generation.current = null;
      setBuiltText("");
      setSelected(null);
      if (result.text.trim().length < MIN_TEXT) {
        setText(result.text);
        setShowText(true);
        setNotice(
          "We could not read enough text from that file (it may be a scanned PDF). Paste your résumé text instead.",
        );
        return;
      }
      setText(result.text);
      if (!capabilities?.chat) {
        setCheckOpen(true);
        return;
      }
      await build(result.text, signal);
    });
  }
  async function build(resumeText, signal) {
    const payload = {
      route: "auto",
      resume_text: resumeText.trim(),
      application_id: applicationId ? Number(applicationId) : null,
      programme_name: programmeName,
    };
    const signature = JSON.stringify(payload);
    if (generation.current?.signature !== signature)
      generation.current = { signature, id: crypto.randomUUID() };
    setRetry(() => () => rebuild(resumeText));
    setBusy(BUILDING);
    const result = await api.createResumeQuestions(
      { ...payload, request_id: generation.current.id },
      signal,
    );
    if (!active.current) return;
    setRetry(null);
    setConfirmDelete(false);
    setHistory((items) => [
      result,
      ...items.filter((item) => item.id !== result.id),
    ]);
    // The text stays in memory (not storage) so it can be checked and rebuilt.
    setBuiltText(resumeText);
    generation.current = null;
    apply(result);
  }
  function rebuild(resumeText) {
    run(BUILDING, (signal) => build(resumeText, signal));
  }
  function apply(set, ids) {
    const facts = set.graph.profile || [];
    const keep = ids || facts.map((fact) => fact.id);
    setSelected(set);
    setFactIds(keep);
    if (!facts.length) return;
    if (keep.length)
      onUseProfile?.({
        id: set.id,
        route: set.context.route,
        facts: facts.filter((fact) => keep.includes(fact.id)),
      });
    else onRemoveProfile?.(set.id);
  }
  const locked = disabled || Boolean(busy);
  const removed = Number(selected?.contact_details_removed) || 0;
  const textarea = (
    <div className="ws-field">
      <label htmlFor="resume-text" className="sr-only">
        Résumé text
      </label>
      <textarea
        id="resume-text"
        ref={review}
        value={text}
        maxLength={20000}
        rows={8}
        onChange={(event) => setText(event.target.value)}
        aria-describedby="resume-text-help"
        placeholder="Paste your education, work experience, projects and achievements here."
      />
      <small id="resume-text-help">
        {text.length.toLocaleString()} / 20,000 characters · At least 80. Stays
        on this page until you leave.
      </small>
      <div className="studio-actions">
        <button
          type="submit"
          className="ws-btn ws-btn--primary ws-btn--sm"
          disabled={
            locked ||
            !capabilities?.chat ||
            text.trim().length < MIN_TEXT ||
            text === builtText
          }
        >
          {builtText ? "Rebuild" : "Build my interview"}
        </button>
      </div>
    </div>
  );
  const topics = selected && (
    <details className="resume-mapped-questions">
      <summary>Explore 3 interview topics and follow-ups</summary>
      <InterviewQuestionBank
        key={selected.id}
        bankData={selected.graph}
        heading="Your tailored questions"
        route={selected.context.route}
        disabled={locked}
        onChoose={(node) => onChoose({ ...node, question_set_id: selected.id })}
      />
    </details>
  );
  return (
    <section className="resume-builder" aria-label="Questions from your résumé">
      {error && (
        <div className="studio-message error" role="alert">
          <p>{error}</p>
          {retry && (
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={locked}
              onClick={() => {
                setError("");
                retry();
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="studio-message" role="status">
          {notice}
        </p>
      )}
      {!capabilities?.chat && (
        <p className="studio-message">
          AI interviews are temporarily unavailable, so we cannot build
          questions from your résumé yet.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          rebuild(text);
        }}
      >
        <fieldset className="studio-form-fields" disabled={locked}>
          <div className="resume-upload">
            <input
              id="resume-upload"
              className="sr-only"
              type="file"
              accept=".pdf,.docx,.txt"
              aria-describedby="resume-upload-help"
              onChange={upload}
            />
            <label
              htmlFor="resume-upload"
              className={
                selected
                  ? "ws-btn ws-btn--ghost ws-btn--sm"
                  : "ws-btn ws-btn--primary"
              }
            >
              {selected ? "Use a different résumé" : "Upload résumé"}
            </label>
            {!showText && !filename && !selected && (
              <button
                type="button"
                className="ws-btn ws-btn--ghost ws-btn--sm"
                onClick={() => {
                  focusTarget.current = review;
                  setShowText(true);
                }}
              >
                Paste text instead
              </button>
            )}
            {!selected && (
              <small id="resume-upload-help">
                PDF, DOCX or TXT, up to 5 MiB.
              </small>
            )}
          </div>
          <p className="studio-fine-print">
            Sent to OpenAI to build your questions. We keep the highlights, not
            the file.{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy notice
            </a>
          </p>
          {filename && (
            <p className="resume-filename-card">{filename} · read ✓</p>
          )}
          {busy && (
            <p className="resume-progress" role="status">
              <span className="resume-spinner" aria-hidden="true" />
              {busy}
            </p>
          )}
          {showText && !filename && textarea}
          {filename && (
            <details
              className="resume-check-text"
              open={checkOpen}
              onToggle={(event) => setCheckOpen(event.currentTarget.open)}
            >
              <summary>Check extracted text</summary>
              {textarea}
            </details>
          )}
        </fieldset>
      </form>
      <div ref={questions} tabIndex={-1} className="resume-results">
        {selected && (
          <>
            <div className="resume-set-heading">
              <div>
                <h3>
                  {selected.graph.profile?.length
                    ? `Ready: ${factIds.length} ${factIds.length === 1 ? "highlight" : "highlights"} from your résumé`
                    : selected.context.school}
                </h3>
                {removed > 0 && <p>Contact details removed before sending</p>}
              </div>
            </div>
            <details className="resume-manage">
              <summary>Manage</summary>
              <div className="studio-actions">
                <button
                  className="ws-btn ws-btn--ghost ws-btn--sm"
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
                  Export
                </button>
                <button
                  className="ws-btn ws-btn--ghost ws-btn--sm wi-danger"
                  disabled={locked}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              </div>
              {topics}
            </details>
            {confirmDelete && (
              <div className="studio-message" role="alert">
                <p>
                  Delete these highlights, interview topics and résumé excerpts?
                  Existing practice sessions keep their copied highlights until
                  you delete those sessions separately.
                </p>
                <div className="studio-actions">
                  <button
                    className="ws-btn"
                    disabled={locked}
                    onClick={() =>
                      run("Deleting…", async (signal) => {
                        await api.deleteResumeQuestions(selected.id, signal);
                        if (!active.current) return;
                        setHistory((items) =>
                          items.filter((item) => item.id !== selected.id),
                        );
                        setSelected(null);
                        onRemoveProfile?.(selected.id);
                        setConfirmDelete(false);
                        setNotice("Deleted.");
                        setReload((value) => value + 1);
                      })
                    }
                  >
                    Delete permanently
                  </button>
                  <button
                    className="ws-btn ws-btn--ghost ws-btn--sm"
                    disabled={locked}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep
                  </button>
                </div>
              </div>
            )}
            {selected.graph.profile?.length > 0 && (
              <details className="resume-profile-review">
                <summary>Review what the interviewer will know</summary>
                <p className="studio-fine-print">
                  Excerpts from your résumé, not verified achievements. Untick
                  anything irrelevant or inaccurate.
                </p>
                <fieldset className="studio-form-fields" disabled={locked}>
                  <legend className="sr-only">Highlights to use</legend>
                  {selected.graph.profile.map((fact) => (
                    <label className="resume-fact" key={fact.id}>
                      <input
                        type="checkbox"
                        checked={factIds.includes(fact.id)}
                        onChange={(event) =>
                          apply(
                            selected,
                            event.target.checked
                              ? [...factIds, fact.id]
                              : factIds.filter((id) => id !== fact.id),
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
              </details>
            )}
          </>
        )}
      </div>
      {(history.length > 1 || (!selected && history.length > 0)) && (
        <div className="studio-history">
          <h3>Your résumés</h3>
          {history.map((item) => (
            <button
              key={item.id}
              className="studio-history-row"
              disabled={locked}
              aria-pressed={selected?.id === item.id}
              onClick={() => {
                apply(item);
                setConfirmDelete(false);
              }}
            >
              <span>
                <strong>{item.context.school}</strong>
                <small>{new Date(item.created_at).toLocaleDateString()}</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
          {hasMore && (
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              disabled={locked}
              onClick={() =>
                run("Loading…", async (signal) => {
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
              More résumés
            </button>
          )}
        </div>
      )}
    </section>
  );
}
