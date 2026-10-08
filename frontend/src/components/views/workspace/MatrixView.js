import React from "react";
export default function MatrixView({
  decisionMatrixWeights,
  setDecisionMatrixWeights,
  applicationDecisionMatrixRows,
  handleOpenApplicationForm,
}) {
  if (!applicationDecisionMatrixRows.length)
    return (
      <div className="empty-state-main" data-testid="matrix-empty">
        <h2>Start your shortlist</h2>
        <p>Add programmes to compare the next steps in each application.</p>
        <button
          className="history-btn"
          onClick={() => handleOpenApplicationForm()}
        >
          Add application
        </button>
      </div>
    );
  const currencies = new Set(
    applicationDecisionMatrixRows.map((row) => row.application.fee_currency),
  );
  return (
    <div className="matrix-panel" data-testid="matrix-panel">
      <p className="field-help">
        This is a planning score based on your saved checklist, deadlines and
        fees. It does not measure programme quality or admission chances.
      </p>
      {currencies.size > 1 && (
        <p className="data-status" role="status">
          Fees use different currencies. Set the fee weight to zero before using
          this comparison; currency conversion is not available.
        </p>
      )}
      <section className="detail-list-card">
        <h2 className="sr-only" data-testid="matrix-ranked-programs-heading">
          Application priorities
        </h2>
        <div className="detail-list">
          {applicationDecisionMatrixRows.map((row) => (
            <article
              key={row.application.id}
              className="detail-item matrix-item"
              data-testid="matrix-row"
            >
              <div className="detail-item-main">
                <strong>{row.application.school_name}</strong>
                <span>{row.application.program_name}</span>
              </div>
              <div className="detail-item-meta matrix-meta">
                <span className="urgency-chip">
                  Planning score {row.weightedScore}/100
                </span>
                <details className="score-details">
                  <summary>Score breakdown</summary>
                  <dl>
                    <div>
                      <dt>Checklist</dt>
                      <dd>{row.readinessScore}</dd>
                    </div>
                    <div>
                      <dt>Deadline</dt>
                      <dd>{row.deadlineScore}</dd>
                    </div>
                    <div>
                      <dt>Relative fees</dt>
                      <dd>{row.affordabilityScore}</dd>
                    </div>
                    <div>
                      <dt>Decision status</dt>
                      <dd>{row.decisionScore}</dd>
                    </div>
                    <div>
                      <dt>Documents</dt>
                      <dd>{row.docsScore}</dd>
                    </div>
                  </dl>
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>
      <details
        className="detail-list-card matrix-weights-card"
        data-testid="matrix-weights-card"
      >
        <summary data-testid="matrix-heading">
          Adjust how priorities are calculated
        </summary>
        <p className="field-help">
          Higher weights give a factor more influence. A higher checklist score
          favours applications closer to completion; fees are compared within
          your shortlist.
        </p>
        <div className="matrix-weights-grid">
          {[
            { key: "readiness", label: "Checklist" },
            { key: "deadline", label: "Deadline urgency" },
            { key: "affordability", label: "Relative fees" },
            { key: "decision", label: "Decision status" },
            { key: "documents", label: "Documents" },
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
                    [weight.key]: Number(e.target.value),
                  }))
                }
              />
              <strong>{decisionMatrixWeights[weight.key]}</strong>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
