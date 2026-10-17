import React from "react";
import "./WorkspacePlanning.css";
export default function MatrixView({
  decisionMatrixWeights,
  setDecisionMatrixWeights,
  applicationDecisionMatrixRows,
  handleOpenApplicationForm,
}) {
  if (!applicationDecisionMatrixRows.length)
    return (
      <div className="wpl wpl-empty-wrap">
        <div className="ws-empty wpl-empty" data-testid="matrix-empty">
          <h2 className="ws-empty__title">Start your shortlist</h2>
          <p>Add programmes to compare the next steps in each application.</p>
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
  const currencies = new Set(
    applicationDecisionMatrixRows.map((row) => row.application.fee_currency),
  );
  return (
    <div className="wpl wpl-matrix" data-testid="matrix-panel">
      <p className="ws-muted wpl-lede">
        This is a planning score based on your saved checklist, deadlines and
        fees. It does not measure programme quality or admission chances.
      </p>
      {currencies.size > 1 && (
        <p className="ws-alert ws-alert--warn" role="status">
          Fees use different currencies. Set the fee weight to zero before using
          this comparison; currency conversion is not available.
        </p>
      )}
      <section className="ws-card ws-card--pad-0 wpl-table-card">
        <h2 className="sr-only" data-testid="matrix-ranked-programs-heading">
          Application priorities
        </h2>
        <p className="wpl-scroll-hint">
          Swipe the table sideways for the full breakdown.
        </p>
        <div
          className="wpl-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Comparison table, scrolls sideways"
        >
          <table className="wpl-table">
            <thead>
              <tr>
                <th scope="col">Programme</th>
                <th scope="col">Planning score</th>
                <th scope="col">Checklist</th>
                <th scope="col">Deadline</th>
                <th scope="col">Relative fees</th>
                <th scope="col">Decision status</th>
                <th scope="col">Documents</th>
              </tr>
            </thead>
            <tbody>
              {applicationDecisionMatrixRows.map((row) => (
                <tr key={row.application.id} data-testid="matrix-row">
                  <th scope="row">
                    <strong>{row.application.school_name}</strong>
                    <span>{row.application.program_name}</span>
                  </th>
                  <td>
                    <span className="wpl-score">
                      <strong className="ws-num">{row.weightedScore}</strong>
                      <span className="ws-small ws-muted">/100</span>
                    </span>
                    <span className="wpl-progress__bar" aria-hidden="true">
                      <span style={{ width: `${row.weightedScore}%` }} />
                    </span>
                  </td>
                  <td className="ws-num">{row.readinessScore}</td>
                  <td className="ws-num">{row.deadlineScore}</td>
                  <td className="ws-num">{row.affordabilityScore}</td>
                  <td className="ws-num">{row.decisionScore}</td>
                  <td className="ws-num">{row.docsScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details
        className="ws-card wpl-weights"
        data-testid="matrix-weights-card"
      >
        <summary data-testid="matrix-heading">
          Adjust how priorities are calculated
        </summary>
        <p className="ws-help">
          Higher weights give a factor more influence. A higher checklist score
          favours applications closer to completion; fees are compared within
          your shortlist.
        </p>
        <div className="wpl-weights__grid">
          {[
            { key: "readiness", label: "Checklist" },
            { key: "deadline", label: "Deadline urgency" },
            { key: "affordability", label: "Relative fees" },
            { key: "decision", label: "Decision status" },
            { key: "documents", label: "Documents" },
          ].map((weight) => (
            <label key={weight.key} className="wpl-weight">
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
