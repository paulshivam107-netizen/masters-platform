import React from 'react';

function ShareView({
  handleExportApplicationsCsv,
  handleExportDeadlinesICS,
  handleCopyShareSummary,
  researchApplications,
  interviewPrepByApplication,
  averageReadiness
}) {
  return (
            <div className="share-panel">
              <div className="detail-list-card">
                <h3 data-testid="share-heading">Export Portfolio</h3>
                <p>Download a summary of your plan or sync deadlines to your calendar.</p>
                <div className="share-actions">
                  <button type="button" data-testid="share-export-csv" className="history-btn" onClick={handleExportApplicationsCsv}>
                    Export CSV
                  </button>
                  <button type="button" data-testid="share-export-ics" className="history-btn" onClick={handleExportDeadlinesICS}>
                    Export Deadlines (.ics)
                  </button>
                  <button type="button" data-testid="share-copy-summary" className="secondary-action-btn" onClick={handleCopyShareSummary}>
                    Copy Summary
                  </button>
                </div>
              </div>
              <div className="detail-list-card">
                <div className="share-snapshot-header">
                  <div>
                    <h3>Snapshot Summary</h3>
                    <p>
                      {researchApplications.length} research cards • {Object.keys(interviewPrepByApplication).length} interview notes •{' '}
                      {averageReadiness}% readiness
                    </p>
                  </div>
                </div>
              </div>
              <div className="insights-grid">
                <div className="insight-card">
                  <h3>Research Cards</h3>
                  <p>{researchApplications.length}</p>
                </div>
                <div className="insight-card">
                  <h3>Interview Notes</h3>
                  <p>{Object.keys(interviewPrepByApplication).length}</p>
                </div>
                <div className="insight-card">
                  <h3>Readiness Avg</h3>
                  <p>{averageReadiness}%</p>
                </div>
              </div>
            </div>
  );
}

export default ShareView;
