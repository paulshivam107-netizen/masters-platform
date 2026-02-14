import React from 'react';

function DocsView({
  applications,
  activeDocsApplicationId,
  setDocsApplicationId,
  setDocsCopySourceId,
  docsCopySourceId,
  copyDocsFromApplication,
  docProgress,
  activeDocsApplication,
  getApplicationReadiness,
  DOC_TEMPLATES,
  activeDocsMap,
  activeDocsScopeKey,
  updateDocStatus,
  handleOpenApplicationForm,
  handleNavChange
}) {
  return (
            <div className="docs-panel">
              <div className="docs-header-row">
                <div>
                  <h2 data-testid="docs-heading">Application Documents</h2>
                  <p>Track readiness of core files for each school separately.</p>
                </div>
                {applications.length > 0 ? (
                  <select
                    data-testid="docs-application-select"
                    className="docs-application-select"
                    value={activeDocsApplicationId || ''}
                    onChange={(e) => {
                      setDocsApplicationId(Number(e.target.value));
                      setDocsCopySourceId('');
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
                <div className="docs-copy-row">
                  <select
                    data-testid="docs-copy-source-select"
                    className="docs-application-select"
                    value={docsCopySourceId}
                    onChange={(e) => setDocsCopySourceId(e.target.value)}
                  >
                    <option value="">Copy from another application...</option>
                    {applications
                      .filter((application) => application.id !== activeDocsApplicationId)
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
              ) : null}

              <div className="insights-grid">
                <div className="insight-card">
                  <h3>Ready</h3>
                  <p>{docProgress.ready}</p>
                </div>
                <div className="insight-card">
                  <h3>In Progress</h3>
                  <p>{docProgress.inProgress}</p>
                </div>
                <div className="insight-card">
                  <h3>Missing</h3>
                  <p>{docProgress.missing}</p>
                </div>
                <div className="insight-card">
                  <h3>Readiness</h3>
                  <p>
                    {activeDocsApplication ? `${getApplicationReadiness(activeDocsApplication).readiness}%` : '0%'}
                  </p>
                </div>
              </div>

              <div className="detail-list-card">
                <h3>Core Documents</h3>
                {!applications.length ? (
                  <div className="empty-state-main">
                    <h2>No applications yet</h2>
                    <p>Add your first school to track document readiness by program.</p>
                    <div className="empty-state-actions">
                      <button type="button" className="history-btn" onClick={() => handleOpenApplicationForm()}>
                        Add Application
                      </button>
                      <button type="button" className="secondary-action-btn" onClick={() => handleNavChange('tracker')}>
                        Go to Applications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-list">
                    {DOC_TEMPLATES.map((doc) => {
                      const status = activeDocsMap[doc.id]?.status || 'missing';
                      const notes = activeDocsMap[doc.id]?.notes || '';
                      return (
                        <article key={`${activeDocsScopeKey}-${doc.id}`} className="doc-item">
                          <div className="doc-item-header">
                            <strong>{doc.label}</strong>
                            <select
                              data-testid="docs-item-status-select"
                              value={status}
                              onChange={(e) => updateDocStatus(doc.id, { status: e.target.value }, activeDocsApplicationId)}
                            >
                              <option value="missing">Missing</option>
                              <option value="in_progress">In Progress</option>
                              <option value="ready">Ready</option>
                            </select>
                          </div>
                          <textarea
                            data-testid="docs-item-notes-input"
                            value={notes}
                            onChange={(e) => updateDocStatus(doc.id, { notes: e.target.value }, activeDocsApplicationId)}
                            placeholder="Add notes, links, or reminders for this document"
                          />
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
