import React, { useState } from "react";
import InterviewStudio from "./InterviewStudio";
import "./WorkspaceInterview.css";
import { CheckIcon } from "../../../app/icons";

export default function InterviewsView({
  applications,
  interviewPrepByApplication,
  selectedApplicationId,
  getDefaultInterviewPrep,
  updateInterviewPrepField,
}) {
  const [selectedId, setSelectedId] = useState(
    String(selectedApplicationId || ""),
  );
  const application =
    applications.find((item) => String(item.id) === selectedId) ||
    applications[0];
  const prep = {
    ...getDefaultInterviewPrep(),
    ...(interviewPrepByApplication[application?.id] || {}),
  };

  return (
    <div className="wi-page ws-stack">
      <h2 className="sr-only" data-testid="interviews-heading">
        Interviews
      </h2>
      <InterviewStudio
        applications={applications}
        selectedApplicationId={selectedApplicationId}
      />
      {application && (
        <div className="wi-summary">
          <span className="ws-chip">
            <strong>
              {
                applications.filter(
                  (item) =>
                    item.interview_required && !item.interview_completed,
                ).length
              }
            </strong>{" "}
            interviews to prepare for
          </span>
          <span className="ws-chip">
            <strong>
              {applications.filter((item) => item.interview_completed).length}
            </strong>{" "}
            completed
          </span>
        </div>
      )}
      {application && (
        <section className="ws-card wi-notebook">
          <div className="wi-notebook__head">
            <div>
              <span className="ws-eyebrow">
                <span aria-hidden="true" />
                Make it personal
              </span>
              <h3>Your preparation notebook</h3>
              <p>Stories, questions and reflections for each programme.</p>
            </div>
            {application && (
              <div className="ws-field wi-picker">
                <label className="ws-label" htmlFor="interview-school">
                  Programme
                </label>
                <select
                  className="ws-select"
                  id="interview-school"
                  value={application.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {applications.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.school_name} · {item.program_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {
            <article className="wi-card" data-testid="interview-card">
              <div className="wi-card__head">
                <div>
                  <strong>{application.school_name}</strong>
                  <span>{application.program_name}</span>
                </div>
                <span
                  className={`ws-chip ${application.interview_completed ? "ws-chip--ok" : "ws-chip--info"}`}
                >
                  {application.interview_completed ? "Completed" : "Preparing"}
                </span>
              </div>
              <div className="wi-form">
                <div className="ws-field">
                  <label className="ws-label" htmlFor="interview-date">
                    Interview date & time
                  </label>
                  <input
                    className="ws-input"
                    id="interview-date"
                    data-testid="interview-scheduled-input"
                    type="datetime-local"
                    value={prep.scheduled_at}
                    onChange={(event) =>
                      updateInterviewPrepField(
                        application.id,
                        "scheduled_at",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="wi-note">
                  <CheckIcon />
                  <span>Notes are saved in this browser as you type.</span>
                </div>
                {[
                  [
                    "stories_bank",
                    "Your story bank",
                    "Leadership, a difficult decision, a setback, a moment of impact…",
                    "stories",
                  ],
                  [
                    "strategy_notes",
                    "Why this programme?",
                    "What draws you here? What would you ask the panel?",
                    "strategy",
                  ],
                  [
                    "mock_feedback",
                    "Practice reflections",
                    "What felt strong? What would you make clearer next time?",
                    "feedback",
                  ],
                ].map(([key, label, placeholder, test]) => (
                  <div
                    className={`ws-field ${key === "stories_bank" ? "wi-wide" : ""}`}
                    key={key}
                  >
                    <label className="ws-label" htmlFor={`interview-${key}`}>
                      {label}
                    </label>
                    <textarea
                      className="ws-textarea"
                      id={`interview-${key}`}
                      data-testid={`interview-${test}-input`}
                      value={prep[key]}
                      placeholder={placeholder}
                      onChange={(event) =>
                        updateInterviewPrepField(
                          application.id,
                          key,
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </article>
          }
        </section>
      )}
    </div>
  );
}
