import React from 'react';

function ResearchView({
  applications,
  researchByApplication,
  getDefaultResearchCard,
  updateResearchField,
  handleNavChange,
  handleOpenApplicationForm
}) {
  return (
            <div className="research-panel">
              <div className="detail-list-card">
                <h3 data-testid="research-heading">School Research Cards</h3>
                <p>Capture the best-fit evidence before you commit to submissions.</p>
                {applications.length === 0 ? (
                  <div className="empty-state-main">
                    <h2>No applications yet</h2>
                    <p>Add a school to start building research notes and fit signals.</p>
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
                  <div className="detail-list research-list">
                    {applications.map((application) => {
                      const research = {
                        ...getDefaultResearchCard(),
                        ...(researchByApplication[application.id] || {})
                      };
                      return (
                        <article key={`research-${application.id}`} data-testid="research-card" className="research-card">
                          <div className="research-card-header">
                            <strong>{application.school_name}</strong>
                            <span>{application.program_name}</span>
                          </div>
                          <div className="tracker-form-grid">
                            <div className="form-group">
                              <label>Official Program Link</label>
                              <input
                                data-testid="research-website-input"
                                type="url"
                                value={research.website}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'website', e.target.value)
                                }
                                placeholder="https://program-website.edu"
                              />
                            </div>
                            <div className="form-group">
                              <label>Location</label>
                              <input
                                data-testid="research-location-input"
                                type="text"
                                value={research.location}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'location', e.target.value)
                                }
                                placeholder="City, Country"
                              />
                            </div>
                            <div className="form-group">
                              <label>Ranking / Reputation Notes</label>
                              <textarea
                                data-testid="research-ranking-input"
                                value={research.ranking_notes}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'ranking_notes', e.target.value)
                                }
                                placeholder="Rankings, prestige notes, faculty strengths."
                              />
                            </div>
                            <div className="form-group">
                              <label>Program Highlights</label>
                              <textarea
                                data-testid="research-highlights-input"
                                value={research.program_highlights}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'program_highlights', e.target.value)
                                }
                                placeholder="Curriculum, labs, clubs, specialization fit."
                              />
                            </div>
                            <div className="form-group">
                              <label>Career Outcomes</label>
                              <textarea
                                data-testid="research-outcomes-input"
                                value={research.career_outcomes}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'career_outcomes', e.target.value)
                                }
                                placeholder="Employment stats, hiring partners, salary trends."
                              />
                            </div>
                            <div className="form-group">
                              <label>Scholarship / Funding Notes</label>
                              <textarea
                                data-testid="research-scholarship-input"
                                value={research.scholarship_notes}
                                onChange={(e) =>
                                  updateResearchField(application.id, 'scholarship_notes', e.target.value)
                                }
                                placeholder="Scholarship options, assistantships, funding deadlines."
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

export default ResearchView;
