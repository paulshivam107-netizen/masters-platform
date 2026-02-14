import React from 'react';

function RightSidebar({
  onViewAllApplications,
  onViewAllEssays,
  onSelectApplication,
  onSelectEssay,
  visibleSidebarApplications,
  selectedApplicationId,
  essays,
  selectedEssayId,
  getEssayCountForApplication,
  parseDate,
  hasMoreSidebarApplications,
  sidebarApplications,
  applications,
  applicationSearch
}) {
  const recentEssays = essays.slice(0, 6);

  return (
    <div className="right-sidebar" data-testid="right-sidebar">
      <div className="essay-list right-rail-card" data-testid="right-sidebar-applications-section">
        <div className="essay-list-header">
          <h3>Your Applications</h3>
          <button type="button" className="view-all-apps-btn" data-testid="right-sidebar-view-all-applications" onClick={onViewAllApplications}>
            View All
          </button>
        </div>
        {visibleSidebarApplications.map((application) => (
          <div
            key={application.id}
            className={`essay-item application-item ${selectedApplicationId === application.id ? 'selected' : ''}`}
            data-testid="right-sidebar-application-card"
            onClick={() => onSelectApplication(application.id)}
          >
            <div className="essay-card-header">
              <strong>{application.school_name}</strong>
              <span className="score-pill">{getEssayCountForApplication(application)} essays</span>
            </div>
            <span className="program-type">{application.program_name}</span>
            <small style={{ display: 'block', marginTop: '8px', opacity: 0.7 }}>
              Deadline {parseDate(application.deadline)?.toLocaleDateString() || 'Not set'}
            </small>
          </div>
        ))}
        {hasMoreSidebarApplications && (
          <button
            type="button"
            className="view-all-apps-btn view-all-apps-btn-wide"
            data-testid="right-sidebar-view-all-applications-wide"
            onClick={onViewAllApplications}
          >
            View All {sidebarApplications.length} Applications
          </button>
        )}
        {!applications.length && (
          <div className="essay-item application-item" data-testid="right-sidebar-applications-empty">
            <div className="essay-card-header">
              <strong>No applications yet</strong>
            </div>
            <small style={{ display: 'block', marginTop: '8px', opacity: 0.7 }}>
              Add your first school to begin tracking.
            </small>
          </div>
        )}
        {applicationSearch.trim() && sidebarApplications.length === 0 && (
          <div className="essay-item application-item" data-testid="right-sidebar-applications-no-matches">
            <div className="essay-card-header">
              <strong>No matches</strong>
            </div>
            <small style={{ display: 'block', marginTop: '8px', opacity: 0.7 }}>
              Try a different search term in Applications Tracker.
            </small>
          </div>
        )}
      </div>

      <div className="essay-list right-rail-card" data-testid="right-sidebar-essays-section">
        <div className="essay-list-header">
          <h3>Your Essays</h3>
          <button type="button" className="view-all-apps-btn" data-testid="right-sidebar-view-all-essays" onClick={onViewAllEssays}>
            View All
          </button>
        </div>
        {recentEssays.map((essay) => (
          <div
            key={essay.id}
            className={`essay-item application-item ${selectedEssayId === essay.id ? 'selected' : ''}`}
            data-testid="right-sidebar-essay-card"
            onClick={() => onSelectEssay(essay)}
          >
            <div className="essay-card-header">
              <strong>{essay.school_name || 'Untitled school'}</strong>
              <span className="score-pill">{essay.program_type || 'Program'}</span>
            </div>
            <span className="program-type">{essay.essay_prompt || 'Untitled prompt'}</span>
            <small style={{ display: 'block', marginTop: '8px', opacity: 0.7 }}>
              Updated {parseDate(essay.updated_at || essay.created_at)?.toLocaleDateString() || 'Recently'}
            </small>
          </div>
        ))}
        {!essays.length && (
          <div className="essay-item application-item" data-testid="right-sidebar-essays-empty">
            <div className="essay-card-header">
              <strong>No essays yet</strong>
            </div>
            <small style={{ display: 'block', marginTop: '8px', opacity: 0.7 }}>
              Create your first draft from the + Create menu above.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

export default RightSidebar;
