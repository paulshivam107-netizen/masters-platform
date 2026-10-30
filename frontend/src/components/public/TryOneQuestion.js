import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../../app/icons";
import { useAuth } from "../../contexts/AuthContext";
import { getTryStatusApi, submitTryFollowUpApi } from "../../api/publicTryApi";
import { readTryHandoff, saveTryHandoff } from "../../app/tryHandoff";

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const GENERIC_ERROR = "That did not work. Check your connection and try again.";

let turnstileLoading = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      turnstileLoading = null;
      script.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return turnstileLoading;
}

// True once the element is within a screen of the viewport (immediately without IntersectionObserver),
// so the Turnstile script is not fetched by visitors who never scroll to the widget.
function useNearViewport(ref) {
  const [near, setNear] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (near || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: "400px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near, ref]);
  return near;
}

// The server decides whether the widget exists. Returns the /status payload only when a
// signed-out visitor should see it; null on the server, while loading, when signed in or unavailable.
export function useTryStatus() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (loading || user) return undefined;
    let live = true;
    getTryStatusApi().then((next) => live && setStatus(next));
    return () => {
      live = false;
    };
  }, [loading, user]);
  return !loading && !user && status?.available ? status : null;
}

const findQuote = (text, quote) => {
  const phrase = quote?.trim();
  return phrase
    ? text.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
    : null;
};

// React text only: split around the first case-insensitive match instead of injecting HTML.
function Highlighted({ text, match }) {
  if (!match) return text;
  return (
    <>
      {text.slice(0, match.index)}
      <mark>{match[0]}</mark>
      {text.slice(match.index + match[0].length)}
    </>
  );
}

function TryForm({ status, source, next }) {
  const id = useId();
  const {
    question,
    min_chars: min,
    max_chars: max,
    turnstile_site_key: siteKey,
  } = status;
  const [answer, setAnswer] = useState("");
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [verifyFailed, setVerifyFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const textareaRef = useRef(null);
  const resultRef = useRef(null);
  const widgetId = useRef(null);
  const attempt = useRef(null);
  const near = useNearViewport(rootRef);
  const count = answer.trim().length;
  // Without a site key (local development) the server skips the human check.
  const canSubmit = !sending && count >= min && (!siteKey || Boolean(token));

  useEffect(() => {
    if (!siteKey || !near || result) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !boxRef.current) return;
        widgetId.current = turnstile.render(boxRef.current, {
          sitekey: siteKey,
          theme:
            document.documentElement.dataset.theme === "dark"
              ? "dark"
              : "light",
          callback: setToken,
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setVerifyFailed(true);
          },
        });
      })
      .catch(() => !cancelled && setVerifyFailed(true));
    return () => {
      cancelled = true;
      try {
        if (widgetId.current != null)
          window.turnstile?.remove(widgetId.current);
      } catch {
        // The widget's container is already gone.
      }
      widgetId.current = null;
    };
  }, [siteKey, near, result]);

  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const text = answer.trim();
    // One id per attempt: kept only when the last try got no reply (so the server can spot a
    // duplicate), replaced after any reply or when the answer changed.
    if (attempt.current?.answer !== text)
      attempt.current = { id: crypto.randomUUID(), answer: text };
    setSending(true);
    setError("");
    try {
      const data = await submitTryFollowUpApi({
        question_id: question.id,
        answer: text,
        request_id: attempt.current.id,
        turnstile_token: token,
        website,
        source,
      });
      if (typeof data?.follow_up !== "string" || !data.follow_up)
        throw new Error("Empty follow-up");
      setResult({
        answer: text,
        followUp: data.follow_up,
        quote: data.fallback ? null : data.quote,
        fallback: Boolean(data.fallback),
        // Kept on this device so the first interview can continue it; false when storage is blocked.
        saved: saveTryHandoff(data.handoff),
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response) attempt.current = null;
      setError(typeof detail === "string" && detail ? detail : GENERIC_ERROR);
      // A Turnstile token is good for one check, so every failed try needs a new one.
      setToken("");
      if (widgetId.current != null) window.turnstile?.reset(widgetId.current);
      textareaRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  const match = result && findQuote(result.answer, result.quote);
  return (
    <div className="rp-tq" ref={rootRef}>
      {!result && (
        <form onSubmit={onSubmit} aria-busy={sending} noValidate>
          <p className="rp-tq-kicker">Try one question, no account needed</p>
          <h3 className="rp-tq-question" id={`${id}-q`}>
            {question.text}
          </h3>
          <label className="rp-tq-label" htmlFor={`${id}-a`}>
            Your answer
          </label>
          <textarea
            id={`${id}-a`}
            ref={textareaRef}
            className="rp-tq-input"
            rows={6}
            maxLength={max}
            value={answer}
            readOnly={sending}
            onChange={(event) => setAnswer(event.target.value)}
            aria-describedby={`${id}-count ${id}-note`}
          />
          <p className="rp-tq-count" id={`${id}-count`}>
            {count} of {max} characters
            {count < min && `, at least ${min} needed`}
          </p>
          <p className="rp-tq-note" id={`${id}-note`}>
            Your answer is sent to an AI service to write one follow-up. We
            don&rsquo;t store it on our servers.
          </p>
          <input
            className="rp-tq-hp"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          {siteKey && <div className="rp-tq-check" ref={boxRef} />}
          {error && (
            <p className="rp-tq-error" role="alert">
              {error}
            </p>
          )}
          <button className="rp-btn" type="submit" disabled={!canSubmit}>
            {sending ? "Writing your follow-up..." : "Get my follow-up"}
          </button>
          {siteKey && !token && (
            <p className="rp-tq-hint">
              {verifyFailed
                ? "The check that you are human did not load. Reload the page to try again."
                : "Waiting for the check that you are human."}
            </p>
          )}
        </form>
      )}
      <div aria-live="polite">
        {result && (
          <div
            className="rp-tq-result"
            role="group"
            tabIndex={-1}
            ref={resultRef}
            aria-labelledby={`${id}-r`}
          >
            <h3 id={`${id}-r`}>Your follow-up</h3>
            <p className="rp-tq-label">Your answer</p>
            <blockquote className="rp-tq-answer">
              <Highlighted text={result.answer} match={match} />
            </blockquote>
            {match && (
              <p className="rp-tq-caption">
                The highlighted words are what the follow-up picks up on.
              </p>
            )}
            <p className="rp-tq-label">Follow-up question</p>
            <p className="rp-tq-followup">{result.followUp}</p>
            {result.fallback && (
              <p className="rp-tq-caption">
                This one is a general follow-up. It does not quote your answer.
              </p>
            )}
            <div className="rp-tq-next">
              <p>
                Answer it in a full mock interview, with questions drawn from
                your own résumé.
              </p>
              {result.saved && (
                <p className="rp-tq-caption">
                  Your answer is saved for 24 hours on this device, so your
                  first interview can start from this follow-up.
                </p>
              )}
              <Link
                className="rp-btn"
                to={`/auth?mode=signup&next=${encodeURIComponent(next)}`}
              >
                Sign up and keep going
                <ArrowIcon />
              </Link>
            </div>
          </div>
        )}
        {sending && <p className="rp-tq-hint">Writing your follow-up...</p>}
      </div>
    </div>
  );
}

export default function TryOneQuestion({
  source = "practice",
  next = "/app/interviews?from=try",
}) {
  const status = useTryStatus();
  // Reading drops an expired saved try, so "kept for 24 hours" stays true for a visitor who comes back.
  useEffect(() => {
    readTryHandoff();
  }, []);
  return status ? (
    <TryForm status={status} source={source} next={next} />
  ) : null;
}
