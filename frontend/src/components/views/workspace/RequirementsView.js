import React from "react";
import { ArrowIcon } from "../../../app/icons";
import "./WorkspacePlanning.css";
export default function RequirementsView({
  applications,
  getApplicationReadiness,
  setSelectedApplicationId,
  setDocsApplicationId,
  setActiveNav,
  DOC_TEMPLATES,
  handleOpenApplicationForm,
}) {
  if (!applications.length)
    return (
      <div className="wpl wpl-empty-wrap">
        <div className="ws-empty wpl-empty">
          <h2 className="ws-empty__title">
            Your checklist starts with an application
          </h2>
          <p>
            Add a programme to organise its essays, recommendations and
            documents.
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
  const pct = (done, total) =>
    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="wpl wpl-requirements">
      <p className="ws-muted wpl-lede">
        Open a programme to work on it. These counts track preparation; verify
        the required items with each school.
      </p>
      <h2 className="sr-only" data-testid="requirements-heading">
        Requirements by programme
      </h2>
      <div className="wpl-req-list">
        {applications.map((application) => {
          const r = getApplicationReadiness(application);
          const items = [
            ["Essays", r.essayDrafted, r.essayTarget],
            ["Recommendations", r.lorSubmitted, r.lorTarget],
            ["Documents", r.docsReady, DOC_TEMPLATES.length],
          ];
          return (
            <button
              type="button"
              key={application.id}
              data-testid="requirements-school-item"
              className="ws-card ws-card--interactive wpl-req"
              onClick={() => {
                setSelectedApplicationId(application.id);
                setDocsApplicationId(application.id);
                setActiveNav("home");
              }}
            >
              <span className="wpl-req__title">
                <strong>{application.school_name}</strong>
                <span className="ws-muted">{application.program_name}</span>
              </span>
              <span className="wpl-req__items">
                {items.map(([label, done, total]) => (
                  <span className="wpl-req__item" key={label}>
                    <span className="wpl-req__label">
                      {label} {done}/{total}
                    </span>
                    <span className="wpl-progress__bar" aria-hidden="true">
                      <span style={{ width: `${pct(done, total)}%` }} />
                    </span>
                  </span>
                ))}
                {application.interview_required && (
                  <span className="ws-chip">
                    Interview{" "}
                    {application.interview_completed ? "done" : "pending"}
                  </span>
                )}
              </span>
              <ArrowIcon />
            </button>
          );
        })}
      </div>
    </div>
  );
}
