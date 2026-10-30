import React, { useState } from "react";
import { trackEvent } from "../../../app/telemetry";

// The sharpest moment of a session is a follow-up that picked up on the answer. Sharing only the
// question (never the answer) lets applicants pass it on without exposing their own story.
export function pickFollowUp(transcript = []) {
  const asked = transcript.filter((turn) => turn.role === "assistant");
  const followUps = asked.filter((turn) => turn.kind === "follow_up");
  return (followUps.length ? followUps : asked.slice(1)).at(-1)?.text || "";
}

export default function ShareFollowUp({ transcript }) {
  const [message, setMessage] = useState("");
  const question = pickFollowUp(transcript);
  if (!question) return null;
  const url = `${window.location.origin}/mba-interview-practice#try`;
  const text = `The follow-up my mock MBA interviewer asked me:\n\n“${question}”\n\nTry one question free: ${url}`;
  const share = async () => {
    trackEvent("debrief_follow_up_shared");
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Copied. Paste it into your batch group or a post.");
    } catch (error) {
      if (error?.name !== "AbortError")
        setMessage("Copying is unavailable. Select the text above instead.");
    }
  };
  return (
    <div className="studio-share">
      <span className="ws-eyebrow">
        <span aria-hidden="true" />
        The question that dug deeper
      </span>
      <blockquote>“{question}”</blockquote>
      <p className="studio-fine-print">
        Only the question is shared, never your answer.
      </p>
      <button type="button" className="ws-btn ws-btn--ghost" onClick={share}>
        Share this question
      </button>
      {message && (
        <p className="studio-fine-print" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
