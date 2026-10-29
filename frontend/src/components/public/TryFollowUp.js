import React from "react";
import { Link } from "react-router-dom";
import { tryInterview } from "../../api/interviewsApi";
import { trackEvent } from "../../app/telemetry";
import { ArrowIcon } from "../../app/icons";

const SIGNUP_PATH = "/auth?mode=signup&next=%2Fapp%2Finterviews";

const opening = (line) =>
  `You wrote: “${line}”. Walk me through your part in it.`;

function errorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (typeof detail?.message === "string") return detail.message;
  return "The follow-up could not be generated. Please try again.";
}

// Highlights the part of the answer the follow-up quotes, so the visitor sees it was listening.
function QuotedAnswer({ text, quote }) {
  const at = quote ? text.indexOf(quote) : -1;
  if (at < 0) return <p>{text}</p>;
  return (
    <p>
      {text.slice(0, at)}
      <mark>{quote}</mark>
      {text.slice(at + quote.length)}
    </p>
  );
}

export default function TryFollowUp() {
  const [line, setLine] = React.useState("");
  const [asked, setAsked] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const ask = (event) => {
    event.preventDefault();
    setAsked(line.trim());
    trackEvent("public_try_started");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(
        await tryInterview({ resume_line: asked, answer: answer.trim() }),
      );
      trackEvent("public_try_follow_up_shown");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (!asked)
    return (
      <form className="rp-tryai" onSubmit={ask}>
        <label htmlFor="try-line">Paste one line from your résumé</label>
        <textarea
          id="try-line"
          rows={2}
          maxLength={240}
          placeholder="Led a four-person team that rebuilt our college fest's sponsorship process"
          value={line}
          onChange={(event) => setLine(event.target.value)}
        />
        <button
          className="rp-btn"
          type="submit"
          disabled={line.trim().length < 5}
        >
          Ask me about it <ArrowIcon />
        </button>
      </form>
    );

  return (
    <div className="rp-tryai">
      <p className="rp-tryai-q">
        <span>Interviewer</span>
        {opening(asked)}
      </p>
      {!result ? (
        <form onSubmit={submit}>
          <label htmlFor="try-answer">Your answer</label>
          <textarea
            id="try-answer"
            rows={5}
            maxLength={1500}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
          {error && (
            <p className="rp-tryai-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="rp-btn"
            type="submit"
            disabled={busy || !answer.trim()}
          >
            {busy ? "Listening…" : "Send answer"} <ArrowIcon />
          </button>
          {error && (
            <Link className="rp-link" to={SIGNUP_PATH}>
              Sign up for a full interview instead <ArrowIcon />
            </Link>
          )}
        </form>
      ) : (
        <>
          <div className="rp-tryai-a">
            <span>You</span>
            <QuotedAnswer text={answer.trim()} quote={result.anchor_quote} />
          </div>
          <p className="rp-tryai-q" role="status">
            <span>Interviewer</span>
            {result.question}
          </p>
          <div className="rp-tryai-next">
            <p>
              That’s question 2 of 5. Sign up free to answer it, finish the
              interview and get your debrief.
            </p>
            <Link
              className="rp-btn"
              to={SIGNUP_PATH}
              onClick={() =>
                trackEvent("public_cta_clicked", { location: "try_follow_up" })
              }
            >
              Continue this interview <ArrowIcon />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
