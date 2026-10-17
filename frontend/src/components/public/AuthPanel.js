import React from "react";
import InterviewPreview from "../common/InterviewPreview";

/* Editorial side panel shared by the sign-in, sign-up and emailed-link pages.
   The photo is decorative and sits under a scrim so the text stays legible. */
export default function AuthPanel() {
  return (
    <aside className="ap-panel" aria-label="About Masters">
      <img
        className="ap-panel-photo"
        src="/images/landing/photo_quiet_interview_room.jpg"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className="ap-panel-scrim" aria-hidden="true" />
      <div className="ap-panel-body">
        <p className="ap-eyebrow ap-eyebrow--light">
          <span aria-hidden="true" />
          Mock interviews that listen
        </p>
        <p className="ap-panel-title">
          Practise the interview before it counts.
        </p>
        <p className="ap-panel-lead">
          Questions drawn from your résumé, follow-ups drawn from your answers,
          and a debrief you can act on.
        </p>
        <InterviewPreview />
      </div>
    </aside>
  );
}
