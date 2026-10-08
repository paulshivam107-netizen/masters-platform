import React, { useState } from "react";
import InterviewStudio from "./InterviewStudio";
import { CheckIcon, PlusIcon, InterviewIcon } from "../../../app/icons";

export default function InterviewsView({
  applications,
  interviewPrepByApplication,
  selectedApplicationId,
  getDefaultInterviewPrep,
  updateInterviewPrepField,
  handleOpenApplicationForm,
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
    <div className="interview-panel">
      <h2 className="sr-only" data-testid="interviews-heading">
        Interviews
      </h2>
      <InterviewStudio
        applications={applications}
        selectedApplicationId={selectedApplicationId}
      />
      <div className="interview-summary">
        <span>
          <strong>
            {
              applications.filter(
                (item) => item.interview_required && !item.interview_completed,
              ).length
            }
          </strong>{" "}
          interviews to prepare for
        </span>
        <span>
          <strong>
            {applications.filter((item) => item.interview_completed).length}
          </strong>{" "}
          completed
        </span>
      </div>
      <section className="dashboard-card interview-prep-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MAKE IT PERSONAL</span>
            <h3>Your preparation notebook</h3>
            <p>Stories, questions and reflections for each programme.</p>
          </div>
          {application && (
            <div className="school-picker">
              <label htmlFor="interview-school">Programme</label>
              <select
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
        {!application ? (
          <div className="quiet-empty">
            <InterviewIcon />
            <h4>Give your preparation a home.</h4>
            <p>
              Add an application to start a preparation notebook for that
              programme.
            </p>
            <button
              className="secondary-action-btn"
              onClick={() => handleOpenApplicationForm()}
            >
              <PlusIcon /> Add application
            </button>
          </div>
        ) : (
          <article className="interview-card" data-testid="interview-card">
            <div className="interview-card-header">
              <div>
                <strong>{application.school_name}</strong>
                <span>{application.program_name}</span>
              </div>
              <span
                className={`urgency-chip ${application.interview_completed ? "done" : "upcoming"}`}
              >
                {application.interview_completed ? "Completed" : "Preparing"}
              </span>
            </div>
            <div className="tracker-form-grid">
              <div className="form-group">
                <label htmlFor="interview-date">Interview date & time</label>
                <input
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
              <div className="notebook-note">
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
                  className={`form-group ${key === "stories_bank" ? "full-width" : ""}`}
                  key={key}
                >
                  <label htmlFor={`interview-${key}`}>{label}</label>
                  <textarea
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
        )}
      </section>
    </div>
  );
}
