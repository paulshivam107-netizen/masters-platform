import React from "react";
import "./WorkspaceAccount.css";

const countWords = (text) => (text || "").trim().split(/\s+/).filter(Boolean).length;

function EssaysView({
  essays,
  handleOpenNewEssayForm,
  setSelectedEssay,
  setSelectedApplicationId,
  setReview,
  setShowVersions,
  setShowForm,
  resolveEssayApplicationId,
}) {
  const sortedEssays = [...essays].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  return (
    <div className="wac-page ws-stack">
      {sortedEssays.length > 0 && (
        <div className="ws-row ws-row--between wac-toolbar">
          <div>
            <h3 className="sr-only" data-testid="essays-heading">
              Your essays
            </h3>
            <p className="ws-muted wac-toolbar__text">
              {sortedEssays.length} essay{sortedEssays.length === 1 ? "" : "s"}{" "}
              across your target schools, most recently edited first.
            </p>
          </div>
          <button
            type="button"
            data-testid="essays-create-button"
            className="ws-btn ws-btn--primary"
            onClick={() => handleOpenNewEssayForm()}
          >
            New essay
          </button>
        </div>
      )}

      {sortedEssays.length === 0 ? (
        <div className="ws-card ws-empty wac-empty">
          <h3 className="ws-empty__title">No essays yet</h3>
          <p>
            Start with one question from one school. A rough first draft is
            enough; every save is kept as a version you can return to.
          </p>
          <div className="ws-row">
            <button
              type="button"
              data-testid="essays-empty-create-button"
              className="ws-btn ws-btn--primary"
              onClick={() => handleOpenNewEssayForm()}
            >
              Start first essay
            </button>
          </div>
        </div>
      ) : (
        <ul className="ws-card ws-card--pad-0 wac-list">
          {sortedEssays.map((essay) => {
            const words = countWords(essay.essay_content);
            return (
              <li key={essay.id}>
                <button
                  type="button"
                  className="wac-essay"
                  data-testid="essay-list-item"
                  onClick={() => {
                    setSelectedEssay(essay);
                    setSelectedApplicationId(resolveEssayApplicationId(essay));
                    setReview(null);
                    setShowVersions(false);
                    setShowForm(false);
                  }}
                >
                  <span className="wac-essay__top">
                    <strong className="wac-essay__school">
                      {essay.school_name || "Untitled School"}
                    </strong>
                    <span className="ws-chip">
                      {essay.program_type || "Programme"}
                    </span>
                  </span>
                  <span className="wac-essay__prompt">
                    {essay.essay_prompt || "Untitled prompt"}
                  </span>
                  <span className="wac-essay__meta ws-small ws-muted">
                    <span>
                      Updated{" "}
                      {new Date(
                        essay.updated_at || essay.created_at,
                      ).toLocaleDateString()}
                    </span>
                    {words > 0 && <span className="ws-num">{words} words</span>}
                    {essay.review_score ? (
                      <span className="ws-chip ws-chip--ok">
                        Review {essay.review_score}
                      </span>
                    ) : (
                      <span>No review yet</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default EssaysView;
