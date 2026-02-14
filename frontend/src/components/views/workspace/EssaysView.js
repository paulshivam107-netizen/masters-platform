import React from 'react';

function EssaysView({
  essays,
  handleOpenNewEssayForm,
  setSelectedEssay,
  setSelectedApplicationId,
  setReview,
  setShowVersions,
  setShowForm,
  resolveEssayApplicationId
}) {
  const sortedEssays = [...essays].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  return (
    <div className="essays-page">
      <div className="essays-page-top">
        <div className="essays-page-summary">
          <h3 data-testid="essays-heading">Your Essays</h3>
          <p>Browse and manage all essay drafts across your target schools.</p>
        </div>
        <button type="button" data-testid="essays-create-button" className="new-essay-btn essays-page-create-btn" onClick={() => handleOpenNewEssayForm()}>
          + New Essay
        </button>
      </div>

      {sortedEssays.length === 0 ? (
        <div className="application-essay-list-card essays-empty-state">
          <h3>No essays yet</h3>
          <p>Create your first essay draft to start building your application portfolio.</p>
          <button type="button" data-testid="essays-empty-create-button" className="new-essay-btn" onClick={() => handleOpenNewEssayForm()}>
            Start First Essay
          </button>
        </div>
      ) : (
        <div className="application-essay-list-card essays-list-card">
          <div className="application-essay-list essays-master-list">
            {sortedEssays.map((essay) => (
              <button
                type="button"
                key={essay.id}
                className="application-essay-item essays-master-item"
                data-testid="essay-list-item"
                onClick={() => {
                  setSelectedEssay(essay);
                  setSelectedApplicationId(resolveEssayApplicationId(essay));
                  setReview(null);
                  setShowVersions(false);
                  setShowForm(false);
                }}
              >
                <div className="essays-master-item-top">
                  <strong>{essay.school_name || 'Untitled School'}</strong>
                  <span className="program-type">{essay.program_type || 'Program'}</span>
                </div>
                <p className="essays-master-item-prompt">{essay.essay_prompt || 'Untitled prompt'}</p>
                <div className="essays-master-item-meta">
                  <small>Updated {new Date(essay.updated_at || essay.created_at).toLocaleDateString()}</small>
                  {essay.review_score ? <small>Review {essay.review_score}</small> : <small>No review yet</small>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EssaysView;
