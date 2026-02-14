import React from 'react';

function DeadlinesView({
  deadlineBuckets,
  handleExportDeadlinesICS,
  setTimelineMonthOffset,
  timelineMonthLabel,
  timelineCells,
  setSelectedApplicationId,
  setDocsApplicationId,
  setActiveNav,
  applicationsByDeadline,
  getDaysUntilDeadline,
  parseDate
}) {
  return (
            <div className="deadlines-panel">
              <h2 className="sr-only" data-testid="deadlines-heading">Deadlines</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <h3>Overdue</h3>
                  <p>{deadlineBuckets.overdue.length}</p>
                </div>
                <div className="insight-card">
                  <h3>Due in 14 Days</h3>
                  <p>{deadlineBuckets.critical.length}</p>
                </div>
                <div className="insight-card">
                  <h3>Upcoming</h3>
                  <p>{deadlineBuckets.upcoming.length}</p>
                </div>
              </div>
              <div className="deadlines-actions-row">
                <button type="button" data-testid="deadlines-export-ics" className="history-btn" onClick={handleExportDeadlinesICS}>
                  Sync to Calendar (.ics)
                </button>
              </div>

              <div className="detail-list-card timeline-card">
                <div className="timeline-header">
                  <h3>Application Timeline</h3>
                  <div className="timeline-controls">
                    <button type="button" data-testid="deadlines-timeline-prev" className="secondary-action-btn timeline-nav-btn" onClick={() => setTimelineMonthOffset((prev) => prev - 1)}>
                      Previous
                    </button>
                    <span>{timelineMonthLabel}</span>
                    <button type="button" data-testid="deadlines-timeline-next" className="secondary-action-btn timeline-nav-btn" onClick={() => setTimelineMonthOffset((prev) => prev + 1)}>
                      Next
                    </button>
                  </div>
                </div>
                <div className="timeline-grid timeline-grid-head">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                    <div key={weekday} className="timeline-weekday">{weekday}</div>
                  ))}
                </div>
                <div className="timeline-grid timeline-grid-days">
                  {timelineCells.map((cell) =>
                    cell.kind === 'empty' ? (
                      <div key={cell.key} className="timeline-day-cell empty" />
                    ) : (
                      <div key={cell.key} className={`timeline-day-cell ${cell.applications.length ? 'has-deadline' : ''}`}>
                        <div className="timeline-day-number">{cell.day}</div>
                        <div className="timeline-day-events">
                          {cell.applications.slice(0, 2).map((application) => (
                            <button
                              type="button"
                              data-testid="deadlines-timeline-event"
                              key={`timeline-${application.id}-${cell.key}`}
                              className="timeline-event-chip"
                              onClick={() => {
                                setSelectedApplicationId(application.id);
                                setDocsApplicationId(application.id);
                                setActiveNav('home');
                              }}
                            >
                              {application.school_name}
                            </button>
                          ))}
                          {cell.applications.length > 2 && (
                            <span className="timeline-more">+{cell.applications.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="detail-list-card">
                <h3>Timeline</h3>
                {applicationsByDeadline.length === 0 ? (
                  <div className="empty-state-main">
                    <h2>No deadlines yet</h2>
                    <p>Add applications and set deadlines to see your timeline.</p>
                    <div className="empty-state-actions">
                      <button type="button" className="history-btn" onClick={() => setActiveNav('tracker')}>
                        Go to Applications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-list">
                    {applicationsByDeadline.map((application) => {
                      const days = getDaysUntilDeadline(application.deadline);
                      const urgencyClass = days !== null && days < 0 ? 'late' : days !== null && days <= 14 ? 'critical' : 'upcoming';
                      const urgencyLabel =
                        days === null
                          ? 'No deadline'
                          : days < 0
                            ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                            : days === 0
                              ? 'Due today'
                              : `${days} day${days === 1 ? '' : 's'} left`;
                      return (
                        <article
                          key={`deadline-${application.id}`}
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
                          <div className="detail-item-meta">
                            <span>{parseDate(application.deadline)?.toLocaleDateString() || 'No date'}</span>
                            <span className={`urgency-chip ${urgencyClass}`}>{urgencyLabel}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
  );
}

export default DeadlinesView;
