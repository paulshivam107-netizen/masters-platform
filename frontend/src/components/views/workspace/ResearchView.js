import React, { useState } from "react";
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
      <div className="empty-state-main">
        <h2>Start with one programme</h2>
        <p>Add an application, then collect the details that matter to you.</p>
        <button
          className="history-btn"
          onClick={() => handleOpenApplicationForm()}
        >
          Add application
        </button>
      </div>
    );
  const research = {
    ...getDefaultResearchCard(),
    ...(researchByApplication[application.id] || {}),
  };
  const field = (key, label, placeholder, type = "textarea") => (
    <div className="form-group" key={key}>
      <label htmlFor={`research-${key}`}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={`research-${key}`}
          value={research[key]}
          onChange={(e) =>
            updateResearchField(application.id, key, e.target.value)
          }
          placeholder={placeholder}
        />
      ) : (
        <input
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
    <div className="research-panel">
      <div className="school-picker">
        <label htmlFor="research-application">Research for</label>
        <select
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
      <section className="detail-list-card" data-testid="research-card">
        <div className="section-heading">
          <div>
            <h2 data-testid="research-heading">{application.school_name}</h2>
            <p className="muted">{application.program_name}</p>
          </div>
          <span className="storage-note">
            Saved in this browser as you type
          </span>
        </div>
        <div className="tracker-form-grid">
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
        <details className="progressive-section">
          <summary>Funding & other research</summary>
          <div className="tracker-form-grid">
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
      <p className="field-help">
        Keep links to your sources so you can check details before applying.
        Notes are stored on this device.
      </p>
    </div>
  );
}
