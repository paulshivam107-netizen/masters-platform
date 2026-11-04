import React, { useState } from "react";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";
import { trackEvent } from "../../../app/telemetry";

const GOAL = 3;
const DAY = 86400000;

export function daysUntil(date, now = new Date()) {
  const [y, m, d] = date.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / DAY);
}

// A real deadline plus visible progress toward a small target. The date stays in this browser.
export default function MockGoal({ userId, completed }) {
  const [date, setDate] = useState(() =>
    readUserValue(userId, "interview_date", ""),
  );
  const [editing, setEditing] = useState(false);
  const save = (value) => {
    setDate(value);
    setEditing(false);
    writeUserValue(userId, "interview_date", value || null);
    if (value) trackEvent("interview_date_set");
  };
  const done = Math.min(completed, GOAL);
  const days = date ? daysUntil(date) : null;

  if (!date || editing)
    return (
      <form
        className="studio-goal"
        onSubmit={(event) => {
          event.preventDefault();
          save(event.currentTarget.elements.date.value);
        }}
      >
        <label htmlFor="interview-date">When is your interview?</label>
        <div className="studio-goal-row">
          {/* Saved on submit: a date input reports half-typed years as valid dates. */}
          <input
            id="interview-date"
            name="date"
            type="date"
            defaultValue={date}
            required
          />
          <button type="submit" className="ws-btn ws-btn--ghost ws-btn--sm">
            Save
          </button>
        </div>
        <p className="studio-fine-print">
          Aim for {GOAL} mocks before the day. Saved in this browser only.
        </p>
      </form>
    );

  return (
    <div className="studio-goal">
      <p>
        <strong>
          {days > 1
            ? `${days} days to your interview`
            : days === 1
              ? "Your interview is tomorrow"
              : days === 0
                ? "Your interview is today. Good luck."
                : "Your interview date has passed"}
        </strong>
        {" · "}
        {`${done} of ${GOAL} mocks done`}
      </p>
      <div
        className="studio-goal-bar"
        role="progressbar"
        aria-label="Mocks completed"
        aria-valuemin={0}
        aria-valuemax={GOAL}
        aria-valuenow={done}
      >
        {Array.from({ length: GOAL }, (_, index) => (
          <span key={index} className={index < done ? "is-done" : ""} />
        ))}
      </div>
      <button
        type="button"
        className="ws-btn ws-btn--ghost ws-btn--sm"
        onClick={() => setEditing(true)}
      >
        Change date
      </button>
    </div>
  );
}
