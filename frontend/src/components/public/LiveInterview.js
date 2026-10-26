import React, { useEffect, useRef, useState } from "react";
import { EXCHANGE } from "../common/InterviewPreview";

// Timeline of one loop, in ms: type the question, stream the answer, mark the phrase,
// lift it into the follow-up, hold, fade. Starts at HOLD so the first frame (and the
// prerendered HTML) shows the whole exchange.
const LOOP = 15000;
const HOLD = 11000;
const FADE = 14300;
const ANSWER = `${EXCHANGE.answerLead}${EXCHANGE.quote}.`;

const typed = (text, t, start, perChar) =>
  text.slice(0, Math.max(0, Math.floor((t - start) / perChar)));

function useLoopTime(ref) {
  const [t, setT] = useState(HOLD);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return undefined;
    let visible = true;
    let last = performance.now();
    let clock = HOLD;
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    if (observer && ref.current) observer.observe(ref.current);
    const id = setInterval(() => {
      const now = performance.now();
      // Paused while off-screen or in a background tab, so it resumes where it left off.
      if (visible && !document.hidden) {
        clock = (clock + now - last) % LOOP;
        setT(clock);
      }
      last = now;
    }, 40);
    return () => {
      clearInterval(id);
      observer?.disconnect();
    };
  }, [ref]);
  return t;
}

// Lays the finished text out invisibly under the typed text, so the card never changes
// size while it types (the hero next to it would otherwise jump).
function Fill({ full, children }) {
  return (
    <span className="lp-live-fill">
      <span className="lp-live-ghost">{full}</span>
      <span>{children}</span>
    </span>
  );
}

export default function LiveInterview() {
  const ref = useRef(null);
  const t = useLoopTime(ref);
  const question = typed(EXCHANGE.question, t, 300, 28);
  const words = ANSWER.split(" ");
  const answer = words
    .slice(0, Math.max(0, Math.floor((t - 2600) / 120)))
    .join(" ");
  const marked = t > 5800;
  const followUp = typed(EXCHANGE.followUp, t, 7400, 26);
  const typing = (shown, full) =>
    shown.length < full.length && <span className="lp-live-caret" />;
  return (
    <figure className="lp-live" ref={ref}>
      <p className="sr-only">
        Example mock interview. Interviewer: {EXCHANGE.question} Applicant:{" "}
        {ANSWER} Interviewer, quoting “{EXCHANGE.quote}”: {EXCHANGE.followUp}
      </p>
      <div
        className={`lp-live-card${t > FADE ? " is-fading" : ""}`}
        aria-hidden="true"
      >
        <div className="lp-live-head">
          <span className="lp-live-dot" />
          Mock interview
          <span className="lp-live-step">Question 2 of 5</span>
        </div>
        <p className="lp-live-turn lp-live-ask">
          <Fill full={EXCHANGE.question}>
            {question}
            {t < 2600 && typing(question, EXCHANGE.question)}
          </Fill>
        </p>
        <p
          className={`lp-live-turn lp-live-you${t > 2400 ? "" : " is-waiting"}`}
        >
          <Fill full={ANSWER}>
            {marked ? (
              <>
                {EXCHANGE.answerLead}
                <mark>{EXCHANGE.quote}</mark>.
              </>
            ) : (
              answer
            )}
          </Fill>
        </p>
        <div
          className={`lp-live-turn lp-live-ask lp-live-follow${t > 6800 ? "" : " is-waiting"}`}
        >
          <span className={`lp-live-quote${t > 6800 ? " is-in" : ""}`}>
            “{EXCHANGE.quote}”
          </span>
          <Fill full={EXCHANGE.followUp}>
            {followUp}
            {typing(followUp, EXCHANGE.followUp)}
          </Fill>
        </div>
      </div>
      <figcaption className="lp-live-caption">
        Every follow-up builds on what you just said. Illustrative example.
      </figcaption>
    </figure>
  );
}
