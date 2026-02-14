import React from 'react';

function RequirementsView({
  requirementsSummary,
  essays,
  averageReadiness,
  applications,
  getApplicationReadiness,
  setSelectedApplicationId,
  setDocsApplicationId,
  setActiveNav,
  applicationReadinessRows,
  DOC_TEMPLATES,
  handleOpenApplicationForm
}) {
  return (
            <div className="requirements-panel">
              <h2 className="sr-only" data-testid="requirements-heading">Requirements</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <h3>Total Applications</h3>
                  <p>{requirementsSummary.totalApplications}</p>
                </div>
                <div className="insight-card">
                  <h3>Essays Required</h3>
                  <p>{requirementsSummary.totalEssaysRequired}</p>
                </div>
                <div className="insight-card">
                  <h3>LORs Required</h3>
                  <p>{requirementsSummary.totalLorsRequired}</p>
                </div>
                <div className="insight-card">
                  <h3>LORs Submitted</h3>
                  <p>{requirementsSummary.totalLorsSubmitted}</p>
                </div>
                <div className="insight-card">
                  <h3>Essays Drafted</h3>
                  <p>{essays.length}</p>
                </div>
                <div className="insight-card">
                  <h3>Interviews Done</h3>
                  <p>{requirementsSummary.interviewsCompleted}/{requirementsSummary.interviewsRequired}</p>
                </div>
                <div className="insight-card">
                  <h3>Average Readiness</h3>
                  <p>{averageReadiness}%</p>
                </div>
              </div>

              <div className="detail-list-card">
                <h3>By School</h3>
                {applications.length === 0 ? (
                  <div className="empty-state-main">
                    <h2>No applications yet</h2>
                    <p>Add your first school to start tracking requirements.</p>
                    <div className="empty-state-actions">
                      <button type="button" className="history-btn" onClick={() => handleOpenApplicationForm()}>
                        Add Application
                      </button>
                      <button type="button" className="secondary-action-btn" onClick={() => setActiveNav('tracker')}>
                        Go to Applications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-list">
                    {applications.map((application) => {
                      const readiness = getApplicationReadiness(application);
                      return (
                        <article
                          key={`req-${application.id}`}
                          data-testid="requirements-school-item"
                          className="detail-item"
                          onClick={() => {
                            setSelectedApplicationId(application.id);
                            setDocsApplicationId(application.id);
                            setActiveNav('home');
                          }}
                        >
                          <div className="detail-item-main">
                            <strong>{application.school_name}</strong>
                            <span>{application.program_name}</span>
                          </div>
                          <div className="detail-item-meta requirements-meta">
                            <span>Essays: {readiness.essayDrafted}/{readiness.essayTarget}</span>
                            <span>LORs: {readiness.lorSubmitted}/{readiness.lorTarget}</span>
                            <span>Interview: {application.interview_required ? (application.interview_completed ? 'Done' : 'Pending') : 'N/A'}</span>
                            <span className={`urgency-chip ${readiness.readiness >= 80 ? 'done' : 'upcoming'}`}>
                              Readiness {readiness.readiness}%
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="detail-list-card">
                <h3>Readiness Scoreboard</h3>
                {applicationReadinessRows.length === 0 ? (
                  <div className="empty-state-main">
                    <h2>No readiness scores yet</h2>
                    <p>Add applications and start tracking essays, LORs, and docs to see readiness.</p>
                    <div className="empty-state-actions">
                      <button type="button" className="history-btn" onClick={() => handleOpenApplicationForm()}>
                        Add Application
                      </button>
                      <button type="button" className="secondary-action-btn" onClick={() => setActiveNav('docs')}>
                        Go to Documents
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-list">
                    {[...applicationReadinessRows]
                      .sort((a, b) => b.readiness.readiness - a.readiness.readiness)
                      .map(({ application, readiness }) => (
                        <article key={`readiness-${application.id}`} data-testid="requirements-readiness-item" className="detail-item">
                          <div className="detail-item-main">
                            <strong>{application.school_name}</strong>
                            <span>{application.program_name}</span>
                          </div>
                          <div className="detail-item-meta requirements-meta">
                            <span>Essays {readiness.essayDrafted}/{readiness.essayTarget}</span>
                            <span>LORs {readiness.lorSubmitted}/{readiness.lorTarget}</span>
                            <span>Docs {readiness.docsReady}/{DOC_TEMPLATES.length}</span>
                            <span className={`urgency-chip ${readiness.readiness >= 80 ? 'done' : readiness.readiness >= 60 ? 'upcoming' : 'critical'}`}>
                              {readiness.readiness}%
                            </span>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </div>
            </div>
  );
}

export default RequirementsView;
