import React from "react";
import { ArrowIcon } from "../../../app/icons";
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
      <div className="empty-state-main">
        <h2>Your checklist starts with an application</h2>
        <p>
          Add a programme to organise its essays, recommendations and documents.
        </p>
        <button
          className="history-btn"
          onClick={() => handleOpenApplicationForm()}
        >
          Add application
        </button>
      </div>
    );
  return (
    <div className="requirements-panel">
      <p className="field-help">
        Open a programme to work on it. These counts track preparation; verify
        the required items with each school.
      </p>
      <div className="detail-list-card">
        <h2 className="sr-only" data-testid="requirements-heading">
          Requirements by programme
        </h2>
        <div className="detail-list">
          {applications.map((application) => {
            const r = getApplicationReadiness(application);
            return (
              <button
                key={application.id}
                data-testid="requirements-school-item"
                className="detail-item requirements-row"
                onClick={() => {
                  setSelectedApplicationId(application.id);
                  setDocsApplicationId(application.id);
                  setActiveNav("home");
                }}
              >
                <span className="detail-item-main">
                  <strong>{application.school_name}</strong>
                  <span>{application.program_name}</span>
                </span>
                <span className="detail-item-meta requirements-meta">
                  <span>
                    Essays {r.essayDrafted}/{r.essayTarget}
                  </span>
                  <span>
                    Recommendations {r.lorSubmitted}/{r.lorTarget}
                  </span>
                  <span>
                    Documents {r.docsReady}/{DOC_TEMPLATES.length}
                  </span>
                  {application.interview_required && (
                    <span>
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
    </div>
  );
}
