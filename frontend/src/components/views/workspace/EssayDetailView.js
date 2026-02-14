import React from 'react';

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
  review
}) {
  return (
            <div className="essay-detail">
              <div className="essay-header" data-testid="essay-detail-header">
                <div className="essay-header-top essay-header-layout">
                  <div className="essay-title-section essay-title-block">
                    <div className="essay-title-line">
                      <h2 data-testid="essay-detail-title">{selectedEssay.school_name}</h2>
                      <span className="version-badge">{selectedEssay.program_type}</span>
                    </div>
                  </div>
                  <div className="essay-actions essay-action-group">
                    <button data-testid="essay-review-button" className="review-btn" onClick={() => handleReview(selectedEssay.id)} disabled={loading}>
                      {loading ? 'Reviewing...' : 'Get AI Review'}
                    </button>
                    <button
                      data-testid="essay-versions-toggle"
                      className="history-btn"
                      onClick={() => (showVersions ? setShowVersions(false) : fetchVersions(selectedEssay.id))}
                    >
                      {showVersions ? 'Hide Versions' : 'Versions'}
                    </button>
                    <button data-testid="essay-delete-button" className="delete-btn" onClick={() => handleDelete(selectedEssay.id)}>Delete</button>
                  </div>
                </div>
              </div>
              {showVersions && (
                <div className="versions-panel" data-testid="essay-versions-panel">
                  <h3>Version History</h3>
                  {versions.length > 0 ? (
                    <div className="versions-list">
                      {versions.map((version, idx) => (
                        <button
                          type="button"
                          key={version.id || `${version.created_at}-${idx}`}
                          data-testid="essay-version-item"
                          className={`version-item ${selectedEssay?.id === version.id ? 'current' : ''}`}
                          onClick={() => handleSelectVersion(version)}
                        >
                          <div className="version-header">
                            <strong>{version.school_name || selectedEssay.school_name}</strong>
                            {idx === 0 && <span className="latest-badge">Latest</span>}
                          </div>
                          <div className="version-meta">
                            <span>{new Date(version.created_at).toLocaleDateString()}</span>
                            {version.review_score && <span className="version-score">⭐ {version.review_score}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-main">
                      <h2>No previous versions yet</h2>
                      <p>Create a new draft to start version history for this essay.</p>
                      <div className="empty-state-actions">
                        <button
                          type="button"
                          className="history-btn"
                          onClick={() => handleCreateNewVersion(selectedEssay)}
                        >
                          Create New Draft
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="versions-footer">
                    <p className="versions-helper-text">
                      Opens the latest saved version in the editor as a new draft, without overwriting history.
                    </p>
                    <button
                      type="button"
                      data-testid="essay-version-create-new"
                      className="version-btn"
                      onClick={() => handleCreateNewVersion(versions[0] || selectedEssay)}
                    >
                      Edit Latest as New Draft
                    </button>
                  </div>
                  {versionOptionRows.length > 0 && (
                    <div className="version-diff-panel">
                      <div className="version-diff-header">
                        <h4>Version Diff</h4>
                        <span>
                          +{versionDiffSummary.added} / -{versionDiffSummary.removed} / ~{versionDiffSummary.changed}
                        </span>
                      </div>
                      <div className="version-diff-controls">
                        <label>
                          Base
                          <select
                            data-testid="essay-version-base-select"
                            value={selectedDiffBaseId}
                            onChange={(e) =>
                              setVersionDiffSelection((prev) => ({ ...prev, base: e.target.value }))
                            }
                          >
                            {versionOptionRows.map((version) => (
                              <option key={`base-${version.__identity}`} value={version.__identity}>
                                {new Date(version.created_at).toLocaleDateString()} • {version.school_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Compare
                          <select
                            data-testid="essay-version-compare-select"
                            value={selectedDiffCompareId}
                            onChange={(e) =>
                              setVersionDiffSelection((prev) => ({ ...prev, compare: e.target.value }))
                            }
                          >
                            {versionOptionRows.map((version) => (
                              <option key={`compare-${version.__identity}`} value={version.__identity}>
                                {new Date(version.created_at).toLocaleDateString()} • {version.school_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="version-diff-list">
                        {versionDiffRows.slice(0, 120).map((row) => (
                          <div key={row.id} className={`version-diff-row ${row.type}`}>
                            <pre>{row.before || ' '}</pre>
                            <pre>{row.after || ' '}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="essay-section">
                <h3>Essay Prompt</h3>
                <p>{selectedEssay.essay_prompt}</p>
              </div>
              <div className="essay-section">
                <h3>Your Essay</h3>
                <p className="essay-text">{selectedEssay.essay_content}</p>
              </div>
              {review && (
                <div className="review-section">
                  <h3>AI Review</h3>
                  {review.review_score && <div className="score">Score: {review.review_score}</div>}
                  <div className="review-content">{review.review_content}</div>
                </div>
              )}
            </div>
  );
}

export default EssayDetailView;
