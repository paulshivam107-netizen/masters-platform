import React from 'react';

function InterviewsView({
  applications,
  interviewPrepByApplication,
  interviewApplications,
  getDefaultInterviewPrep,
  updateInterviewPrepField,
  handleNavChange,
  handleOpenApplicationForm
}) {
  return (
            <div className="interview-panel">
              <h2 className="sr-only" data-testid="interviews-heading">Interviews</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <h3>Interview Required</h3>
                  <p>{applications.filter((application) => application.interview_required).length}</p>
                </div>
                <div className="insight-card">
                  <h3>Interview Completed</h3>
                  <p>{applications.filter((application) => application.interview_completed).length}</p>
                </div>
                <div className="insight-card">
                  <h3>Prep Notes Saved</h3>
                  <p>{Object.keys(interviewPrepByApplication).length}</p>
                </div>
              </div>

              <div className="detail-list-card">
                <h3>Interview Prep by School</h3>
                {interviewApplications.length === 0 ? (
                  <div className="empty-state-main">
                    <h2>No interview prep yet</h2>
                    <p>Mark interview-required schools in Applications to start prep notes.</p>
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
                  <div className="detail-list interview-list">
                    {interviewApplications.map((application) => {
                      const prep = {
                        ...getDefaultInterviewPrep(),
                        ...(interviewPrepByApplication[application.id] || {})
                      };
                      return (
                        <article key={`interview-${application.id}`} data-testid="interview-card" className="interview-card">
                          <div className="interview-card-header">
                            <div>
                              <strong>{application.school_name}</strong>
                              <span>{application.program_name}</span>
                            </div>
                            <span className={`urgency-chip ${application.interview_completed ? 'done' : 'critical'}`}>
                              {application.interview_completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                          <div className="tracker-form-grid">
                            <div className="form-group">
                              <label>Interview Date & Time</label>
                              <input
                                data-testid="interview-scheduled-input"
                                type="datetime-local"
                                value={prep.scheduled_at}
                                onChange={(e) =>
                                  updateInterviewPrepField(application.id, 'scheduled_at', e.target.value)
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Story Bank</label>
                              <textarea
                                data-testid="interview-stories-input"
                                value={prep.stories_bank}
                                onChange={(e) =>
                                  updateInterviewPrepField(application.id, 'stories_bank', e.target.value)
                                }
                                placeholder="Leadership, teamwork, failure, impact examples..."
                              />
                            </div>
                            <div className="form-group">
                              <label>Strategy Notes</label>
                              <textarea
                                data-testid="interview-strategy-input"
                                value={prep.strategy_notes}
                                onChange={(e) =>
                                  updateInterviewPrepField(application.id, 'strategy_notes', e.target.value)
                                }
                                placeholder="Program-specific talking points and questions to ask."
                              />
                            </div>
                            <div className="form-group">
                              <label>Mock Feedback</label>
                              <textarea
                                data-testid="interview-feedback-input"
                                value={prep.mock_feedback}
                                onChange={(e) =>
                                  updateInterviewPrepField(application.id, 'mock_feedback', e.target.value)
                                }
                                placeholder="Practice feedback, weak points, follow-up action."
                              />
                            </div>
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

export default InterviewsView;
