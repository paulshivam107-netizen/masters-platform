import React from "react";
import "./WorkspaceAccount.css";

function EssayDetailView({
  selectedEssay,
  loading,
  handleReview,
  showVersions,
  setShowVersions,
  fetchVersions,
  handleDelete,
  versions,
  handleSelectVersion,
  handleCreateNewVersion,
  versionOptionRows,
  versionDiffSummary,
  selectedDiffBaseId,
  setVersionDiffSelection,
  selectedDiffCompareId,
  versionDiffRows,
  review,
}) {
  const displayedReview =
    review ||
    (selectedEssay.ai_review
      ? {
          review_content: selectedEssay.ai_review,
          score: selectedEssay.review_score,
        }
      : null);
  const sortedVersions = [...versions].sort(
    (a, b) => (b.version || 0) - (a.version || 0),
  );
  const wordCount = (selectedEssay.essay_content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return (
    <div className="wac-page wac-detail ws-stack">
      <div className="wac-detail__head" data-testid="essay-detail-header">
        <div className="wac-detail__title">
          <h2 className="ws-h2" data-testid="essay-detail-title">
            {selectedEssay.school_name}
          </h2>
          <span className="ws-chip">{selectedEssay.program_type}</span>
        </div>
        <div className="ws-row wac-detail__actions">
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            data-testid="essay-continue-writing"
            onClick={() => handleCreateNewVersion(selectedEssay)}
          >
            Continue writing
          </button>
          <button
            type="button"
            className="ws-btn"
            data-testid="essay-review-button"
            onClick={() => handleReview(selectedEssay.id)}
            disabled={loading}
          >
            {loading ? "Reviewing..." : "Get AI Review"}
          </button>
          <button
            type="button"
            className="ws-btn"
            data-testid="essay-versions-toggle"
            aria-expanded={showVersions}
            onClick={() =>
              showVersions
                ? setShowVersions(false)
                : fetchVersions(selectedEssay.id)
            }
          >
            {showVersions ? "Hide Versions" : "Versions"}
          </button>
        </div>
      </div>
      <p className="ws-help">
        Continue writing opens this version as a new draft. Your saved version
        is kept.
      </p>

      {showVersions && (
        <section
          className="ws-card ws-stack ws-stack--sm"
          data-testid="essay-versions-panel"
        >
          <h3 className="ws-h3">Version History</h3>
          {versions.length > 0 ? (
            <ol className="wac-versions">
              {sortedVersions.map((version, idx) => (
                <li key={version.id || `${version.created_at}-${idx}`}>
                  <button
                    type="button"
                    data-testid="essay-version-item"
                    className={`wac-version ${selectedEssay?.id === version.id ? "is-current" : ""}`}
                    aria-current={
                      selectedEssay?.id === version.id ? "true" : undefined
                    }
                    onClick={() => handleSelectVersion(version)}
                  >
                    <span className="wac-version__dot" aria-hidden="true" />
                    <span className="wac-version__main">
                      <strong>
                        {version.school_name || selectedEssay.school_name}
                      </strong>
                      <span className="ws-small ws-muted">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    {version.review_score && (
                      <span className="ws-chip ws-chip--ok">
                        Score {version.review_score}
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="ws-chip ws-chip--accent">Latest</span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="ws-empty">
              <h4 className="ws-empty__title">No previous versions yet</h4>
              <p>Create a new draft to start version history for this essay.</p>
              <div className="ws-row">
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => handleCreateNewVersion(selectedEssay)}
                >
                  Create New Draft
                </button>
              </div>
            </div>
          )}
          <div className="ws-row ws-row--between wac-versions-foot">
            <p className="ws-help">
              Opens the latest saved version in the editor as a new draft,
              without overwriting history.
            </p>
            <button
              type="button"
              className="ws-btn"
              data-testid="essay-version-create-new"
              onClick={() =>
                handleCreateNewVersion(sortedVersions[0] || selectedEssay)
              }
            >
              Edit Latest as New Draft
            </button>
          </div>
          {versionOptionRows.length > 0 && (
            <div className="wac-diff">
              <div className="ws-row ws-row--between">
                <h4 className="ws-h3">Version diff</h4>
                <span className="ws-small ws-num wac-diff__sum">
                  <span className="wac-add">+{versionDiffSummary.added}</span>
                  <span className="wac-del">-{versionDiffSummary.removed}</span>
                  <span className="wac-chg">~{versionDiffSummary.changed}</span>
                </span>
              </div>
              <div className="ws-grid ws-grid--2">
                <div className="ws-field">
                  <label className="ws-label" htmlFor="wac-diff-base">
                    Base
                  </label>
                  <select
                    id="wac-diff-base"
                    className="ws-select"
                    data-testid="essay-version-base-select"
                    value={selectedDiffBaseId}
                    onChange={(e) =>
                      setVersionDiffSelection((prev) => ({
                        ...prev,
                        base: e.target.value,
                      }))
                    }
                  >
                    {versionOptionRows.map((version) => (
                      <option
                        key={`base-${version.__identity}`}
                        value={version.__identity}
                      >
                        {new Date(version.created_at).toLocaleDateString()} •{" "}
                        {version.school_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ws-field">
                  <label className="ws-label" htmlFor="wac-diff-compare">
                    Compare
                  </label>
                  <select
                    id="wac-diff-compare"
                    className="ws-select"
                    data-testid="essay-version-compare-select"
                    value={selectedDiffCompareId}
                    onChange={(e) =>
                      setVersionDiffSelection((prev) => ({
                        ...prev,
                        compare: e.target.value,
                      }))
                    }
                  >
                    {versionOptionRows.map((version) => (
                      <option
                        key={`compare-${version.__identity}`}
                        value={version.__identity}
                      >
                        {new Date(version.created_at).toLocaleDateString()} •{" "}
                        {version.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="wac-diff__list">
                {versionDiffRows.slice(0, 120).map((row) => (
                  <div key={row.id} className={`wac-diff__row ${row.type}`}>
                    <pre>{row.before || " "}</pre>
                    <pre>{row.after || " "}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="ws-card ws-card--soft ws-stack ws-stack--sm">
        <h3 className="ws-eyebrow">Essay prompt</h3>
        <p className="wac-prompt">{selectedEssay.essay_prompt}</p>
      </section>

      <section className="ws-card wac-reader">
        <div className="ws-row ws-row--between">
          <h3 className="ws-eyebrow">Your essay</h3>
          <span className="ws-small ws-muted ws-num">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
        <div className="wac-essay-text">{selectedEssay.essay_content}</div>
      </section>

      {displayedReview && (
        <section className="ws-card ws-stack ws-stack--sm wac-review">
          <div className="ws-row ws-row--between">
            <h3 className="ws-h3">AI review</h3>
            {displayedReview.score != null && (
              <span className="ws-chip ws-chip--ok ws-num">
                Score: {displayedReview.score}
              </span>
            )}
          </div>
          <div className="wac-review__body">{displayedReview.review_content}</div>
        </section>
      )}

      <details className="wac-manage">
        <summary>Manage this version</summary>
        <div className="wac-manage__body">
          <p className="ws-help">
            Remove this version of the essay from your workspace.
          </p>
          <button
            type="button"
            className="ws-btn ws-btn--danger"
            data-testid="essay-delete-button"
            onClick={() => handleDelete(selectedEssay.id)}
          >
            Delete
          </button>
        </div>
      </details>
    </div>
  );
}

export default EssayDetailView;
