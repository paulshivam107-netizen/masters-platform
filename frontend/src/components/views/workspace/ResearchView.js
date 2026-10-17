import React, { useState } from "react";
import "./WorkspacePlanning.css";
export default function ResearchView({
  applications,
  selectedApplicationId,
  researchByApplication,
  getDefaultResearchCard,
  updateResearchField,
  handleOpenApplicationForm,
}) {
  const [selectedId, setSelectedId] = useState(
    selectedApplicationId || applications[0]?.id,
  );
  const application =
    applications.find((app) => app.id === Number(selectedId)) ||
    applications[0];
  if (!application)
    return (
      <div className="wpl wpl-empty-wrap">
        <div className="ws-empty wpl-empty">
          <h2 className="ws-empty__title">Start with one programme</h2>
          <p>
            Add an application, then collect the details that matter to you.
          </p>
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            onClick={() => handleOpenApplicationForm()}
          >
            Add application
          </button>
        </div>
      </div>
    );
  const research = {
    ...getDefaultResearchCard(),
    ...(researchByApplication[application.id] || {}),
  };
  const field = (key, label, placeholder, type = "textarea") => (
    <div className="ws-field" key={key}>
      <label className="ws-label" htmlFor={`research-${key}`}>{label}</label>
      {type === "textarea" ? (
        <textarea className="ws-textarea"
          id={`research-${key}`}
          value={research[key]}
          onChange={(e) =>
            updateResearchField(application.id, key, e.target.value)
          }
          placeholder={placeholder}
        />
      ) : (
        <input className="ws-input"
          id={`research-${key}`}
          type={type}
          value={research[key]}
          onChange={(e) =>
            updateResearchField(application.id, key, e.target.value)
          }
          placeholder={placeholder}
        />
      )}
    </div>
  );
  return (
    <div className="wpl wpl-research">
      <div className="ws-field wpl-picker">
        <label className="ws-label" htmlFor="research-application">Research for</label>
        <select className="ws-select"
          id="research-application"
          value={application.id}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.school_name} · {app.program_name}
            </option>
          ))}
        </select>
      </div>
      <section className="ws-card wpl-research-card" data-testid="research-card">
        <div className="wpl-form-head">
          <div>
            <h2 data-testid="research-heading">{application.school_name}</h2>
            <p className="ws-muted">{application.program_name}</p>
          </div>
          <span className="ws-chip">
            Saved in this browser as you type
          </span>
        </div>
        <div className="wpl-form-grid">
          {field("website", "Official programme link", "https://…", "url")}
          {field("location", "Location", "City, country", "text")}
          {field(
            "program_highlights",
            "Why this programme?",
            "Curriculum, clubs or experiences that fit your goals.",
          )}
          {field(
            "career_outcomes",
            "Career outcomes",
            "Roles, employers and outcomes to investigate.",
          )}
        </div>
        <details className="wpl-disclosure">
          <summary>Funding & other research</summary>
          <div className="wpl-form-grid">
            {field(
              "scholarship_notes",
              "Funding notes",
              "Scholarships, costs and funding deadlines.",
            )}
            {field(
              "ranking_notes",
              "Reputation & other notes",
              "Evidence, sources and questions to follow up.",
            )}
          </div>
        </details>
      </section>
      <p className="ws-help">
        Keep links to your sources so you can check details before applying.
        Notes are stored on this device.
      </p>
    </div>
  );
}
