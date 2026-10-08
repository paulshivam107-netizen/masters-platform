import React from "react";

function DocsView({
  applications,
  activeDocsApplicationId,
  setDocsApplicationId,
  setDocsCopySourceId,
  docsCopySourceId,
  copyDocsFromApplication,
  docProgress,
  DOC_TEMPLATES,
  activeDocsMap,
  activeDocsScopeKey,
  updateDocStatus,
  handleOpenApplicationForm,
  handleNavChange,
}) {
  return (
    <div className="docs-panel">
      <div className="docs-header-row">
        <div>
          <h2 className="sr-only" data-testid="docs-heading">
            Application documents
          </h2>
          <p>Track each document’s status. Files are not uploaded here.</p>
        </div>
        {applications.length > 0 ? (
          <select
            aria-label="Application for document checklist"
            data-testid="docs-application-select"
            className="docs-application-select"
            value={activeDocsApplicationId || ""}
            onChange={(e) => {
              setDocsApplicationId(Number(e.target.value));
              setDocsCopySourceId("");
            }}
          >
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.school_name} | {application.program_name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {applications.length > 1 ? (
        <details className="progressive-section">
          <summary>Copy an existing checklist</summary>
          <div className="docs-copy-row">
            <select
              aria-label="Copy checklist from application"
              data-testid="docs-copy-source-select"
              className="docs-application-select"
              value={docsCopySourceId}
              onChange={(e) => setDocsCopySourceId(e.target.value)}
            >
              <option value="">Copy from another application...</option>
              {applications
                .filter(
                  (application) => application.id !== activeDocsApplicationId,
                )
                .map((application) => (
                  <option key={`copy-${application.id}`} value={application.id}>
                    {application.school_name} | {application.program_name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              data-testid="docs-copy-checklist-button"
              className="history-btn docs-copy-btn"
              onClick={copyDocsFromApplication}
              disabled={!docsCopySourceId || !activeDocsApplicationId}
            >
              Copy Checklist
            </button>
          </div>
        </details>
      ) : null}

      {applications.length > 0 && (
        <div className="document-summary">
          <span>
            <strong>
              {docProgress.ready}/{DOC_TEMPLATES.length}
            </strong>{" "}
            documents ready
          </span>
          <span>Changes are saved in this browser.</span>
        </div>
      )}

      <div className="detail-list-card">
        <h3>Core Documents</h3>
        {!applications.length ? (
          <div className="empty-state-main">
            <h2>No applications yet</h2>
            <p>Add your first school to track document readiness by program.</p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="history-btn"
                onClick={() => handleOpenApplicationForm()}
              >
                Add Application
              </button>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => handleNavChange("tracker")}
              >
                Go to Applications
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-list">
            {DOC_TEMPLATES.map((doc) => {
              const status = activeDocsMap[doc.id]?.status || "missing";
              const notes = activeDocsMap[doc.id]?.notes || "";
              return (
                <article
                  key={`${activeDocsScopeKey}-${doc.id}`}
                  className="doc-item"
                >
                  <div className="doc-item-header">
                    <strong>{doc.label}</strong>
                    <select
                      aria-label={`${doc.label} status`}
                      data-testid="docs-item-status-select"
                      value={status}
                      onChange={(e) =>
                        updateDocStatus(
                          doc.id,
                          { status: e.target.value },
                          activeDocsApplicationId,
                        )
                      }
                    >
                      <option value="missing">Missing</option>
                      <option value="in_progress">In Progress</option>
                      <option value="ready">Ready</option>
                    </select>
                  </div>
                  <details className="document-notes">
                    <summary>
                      {notes ? "View or edit note" : "Add a note"}
                    </summary>
                    <textarea
                      aria-label={`${doc.label} notes`}
                      data-testid="docs-item-notes-input"
                      value={notes}
                      onChange={(e) =>
                        updateDocStatus(
                          doc.id,
                          { notes: e.target.value },
                          activeDocsApplicationId,
                        )
                      }
                      placeholder="Add notes, links, or reminders for this document"
                    />
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocsView;
