import React from "react";

// A static, illustrative exchange showing what the mock interviewer does: the follow-up
// quotes the applicant's own answer. Synthetic content; not a real applicant.
export default function InterviewPreview() {
  return (
    <figure className="interview-preview" aria-label="Example mock interview exchange">
      <div className="ip-header">
        <span className="ip-dot" aria-hidden="true" />
        Mock interview
        <span className="ip-step">Question 2 of 5</span>
      </div>
      <p className="ip-turn ip-interviewer">
        Walk me through a decision you owned in your final-year project.
      </p>
      <p className="ip-turn ip-applicant">
        I grouped the invoices by vendor and cleared the oldest first, which cut the backlog
        from six weeks to two.
      </p>
      <div className="ip-turn ip-interviewer ip-followup">
        <span className="ip-quote">“cut the backlog from six weeks to two”</span>
        How did you measure that, and what would you do differently now?
      </div>
      <figcaption className="ip-caption">Every follow-up builds on what you just said.</figcaption>
    </figure>
  );
}
