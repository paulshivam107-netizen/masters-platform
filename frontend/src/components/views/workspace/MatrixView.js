import React from 'react';

function MatrixView({
  decisionMatrixWeights,
  setDecisionMatrixWeights,
  applicationDecisionMatrixRows,
  handleNavChange,
  handleOpenApplicationForm
}) {
  return (
            <div className="matrix-panel" data-testid="matrix-panel">
              <div className="detail-list-card matrix-weights-card" data-testid="matrix-weights-card">
                <h3 data-testid="matrix-heading">Weight Controls</h3>
                <p>Adjust how strongly each factor influences your school ranking.</p>
                <div className="matrix-weights-grid">
                  {[
                    { key: 'readiness', label: 'Readiness' },
                    { key: 'deadline', label: 'Deadline Urgency' },
                    { key: 'affordability', label: 'Affordability' },
                    { key: 'decision', label: 'Decision Signal' },
                    { key: 'documents', label: 'Documents' }
                  ].map((weight) => (
                    <label key={weight.key} className="matrix-weight-item">
                      <span>{weight.label}</span>
                      <input
                        data-testid={`matrix-weight-${weight.key}`}
                        type="range"
                        min="0"
                        max="100"
                        value={decisionMatrixWeights[weight.key]}
                        onChange={(e) =>
                          setDecisionMatrixWeights((prev) => ({
                            ...prev,
                            [weight.key]: Number(e.target.value)
                          }))
                        }
                      />
                      <strong>{decisionMatrixWeights[weight.key]}</strong>
                    </label>
                  ))}
                </div>
              </div>

              <div className="detail-list-card">
                <h3 data-testid="matrix-ranked-programs-heading">Ranked Programs</h3>
                {applicationDecisionMatrixRows.length === 0 ? (
                  <div className="empty-state-main" data-testid="matrix-empty">
                    <h2>No programs ranked yet</h2>
                    <p>Add applications to generate your decision matrix.</p>
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
                    {applicationDecisionMatrixRows.map((row) => (
                      <article key={`matrix-${row.application.id}`} className="detail-item matrix-item" data-testid="matrix-row">
                        <div className="detail-item-main">
                          <strong>{row.application.school_name}</strong>
                          <span>{row.application.program_name}</span>
                        </div>
                        <div className="detail-item-meta matrix-meta">
                          <span className="urgency-chip done">Score {row.weightedScore}</span>
                          <span>Readiness {row.readinessScore}</span>
                          <span>Deadline {row.deadlineScore}</span>
                          <span>Affordability {row.affordabilityScore}</span>
                          <span>Decision {row.decisionScore}</span>
                          <span>Docs {row.docsScore}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
  );
}

export default MatrixView;
