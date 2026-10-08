import React from "react";
import { CheckIcon, EssaysIcon, InterviewIcon } from "../../app/icons";

export default function JourneyArtwork() {
  return (
    <div className="journey-art" aria-hidden="true">
      <div className="journey-orbit orbit-outer" />
      <div className="journey-orbit orbit-inner" />
      <div className="journey-core">
        <span>YOUR NEXT</span>
        <strong>chapter.</strong>
        <span className="journey-arrow">↗</span>
      </div>
      <div className="journey-note note-one">
        <span className="art-icon">
          <CheckIcon />
        </span>
        <div>
          <strong>One step closer</strong>
          <small>Make room for what’s next.</small>
        </div>
      </div>
      <div className="journey-note note-two">
        <EssaysIcon />
        <span>Your story, clearly told.</span>
      </div>
      <div className="journey-spark">
        <InterviewIcon />
      </div>
    </div>
  );
}
