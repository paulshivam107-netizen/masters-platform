import React from 'react';

function HomeView({
  selectedApplication,
  essaysForSelectedApplication,
  selectedEssay,
  setSelectedEssay,
  setReview,
  setShowVersions,
  setShowForm,
  handleOpenNewEssayForm,
  handleOpenApplicationForm,
  handleNavChange,
  parseDate,
  getApplicationReadiness,
  user,
  applications,
  applicationSummary,
  docProgressOverall,
  DOC_TEMPLATES,
  essays,
  resolveEssayApplicationId,
  setSelectedApplicationId,
  showHomeChecklist,
  onboardingDismissed,
  setOnboardingDismissed,
  onboardingHidden,
  setOnboardingHidden
}) {
  const onboardingSteps = [
    {
      id: 'applications',
      label: 'Add your first application',
      complete: applications.length > 0,
      actionLabel: 'Add application',
      onAction: () => handleOpenApplicationForm()
    },
    {
      id: 'essay',
      label: 'Draft your first essay',
      complete: essays.length > 0,
      actionLabel: 'Open essay composer',
      onAction: () => handleOpenNewEssayForm()
    },
    {
      id: 'profile',
      label: 'Set target intake and countries',
      complete: Boolean((user?.target_intake || '').trim() && (user?.target_countries || '').trim()),
      actionLabel: 'Open profile',
      onAction: () => handleNavChange('profile')
    },
    {
      id: 'reminders',
      label: 'Enable reminder emails',
      complete: Boolean(user?.email_reminders_enabled),
      actionLabel: 'Configure reminders',
      onAction: () => handleNavChange('settings')
    }
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.complete).length;
  const isOnboardingIncomplete = completedOnboardingSteps < onboardingSteps.length;
  const showOnboardingCard = !onboardingDismissed && isOnboardingIncomplete;
  const showExpandedOnboarding = showOnboardingCard && !onboardingHidden;
  const showCollapsedOnboarding = showOnboardingCard && onboardingHidden;
  const nextStep = onboardingSteps.find((step) => !step.complete);
  const onboardingProgress = Math.round((completedOnboardingSteps / onboardingSteps.length) * 100);

  return (
            selectedApplication ? (
              <div className="application-home-panel" data-testid="home-application-panel">
                <div className="home-welcome-card home-hero-card" data-testid="home-application-hero">
                  <h2 data-testid="home-application-title">{selectedApplication.school_name}</h2>
                  <p>
                    {selectedApplication.program_name} | {selectedApplication.application_round || 'Round not set'}
                  </p>
                  <button
                    type="button"
                    className="new-essay-btn home-cta-btn"
                    data-testid="home-application-new-essay"
                    onClick={() => handleOpenNewEssayForm(selectedApplication.id)}
                  >
                    + New Essay for This Application
                  </button>
                </div>
                <div className="home-metrics-grid home-stats-card home-stats-wide" data-testid="home-application-metrics">
                  <div className="home-metric-card" data-testid="home-application-metric-essays">
                    <h3>Essays</h3>
                    <p className="metric-value">{essaysForSelectedApplication.length}</p>
                  </div>
                  <div className="home-metric-card" data-testid="home-application-metric-reviewed">
                    <h3>Reviewed</h3>
                    <p className="metric-value">{essaysForSelectedApplication.filter((essay) => essay.review_score).length}</p>
                  </div>
                  <div className="home-metric-card home-metric-card--deadline" data-testid="home-application-metric-deadline">
                    <h3>Deadline</h3>
                    <p className="metric-value metric-value-date">{parseDate(selectedApplication.deadline)?.toLocaleDateString() || 'Not set'}</p>
                  </div>
                  <div className="home-metric-card" data-testid="home-application-metric-readiness">
                    <h3>Readiness</h3>
                    <p className="metric-value">{getApplicationReadiness(selectedApplication).readiness}%</p>
                  </div>
                </div>
                <div className="application-essay-list-card home-recent-card home-recent-full" data-testid="home-application-essays-card">
                  <h3>Essays for this school</h3>
                  {essaysForSelectedApplication.length === 0 ? (
                    <p data-testid="home-application-essays-empty">No essays yet. Start your first draft for this application.</p>
                  ) : (
                    <div className="application-essay-list school-essay-list">
                      {essaysForSelectedApplication.map((essay) => (
                        <button
                          type="button"
                          key={essay.id}
                          className={`application-essay-item school-essay-item ${selectedEssay?.id === essay.id ? 'active' : ''}`}
                          data-testid="home-application-essay-item"
                          onClick={() => {
                            setSelectedEssay(essay);
                            setReview(null);
                            setShowVersions(false);
                            setShowForm(false);
                          }}
                        >
                          <span>{essay.essay_prompt || 'Untitled Prompt'}</span>
                          <small>Updated {new Date(essay.created_at).toLocaleDateString()}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="home-dashboard" data-testid="home-dashboard">
                <div className="home-welcome-card home-hero-card" data-testid="home-dashboard-hero">
                  <h2>Welcome back, {user.name}</h2>
                  <p>Plan your entire Master's application cycle: schools, deadlines, essays, recommendations, and documents.</p>
                  <div className="home-hero-actions">
                    <button
                      type="button"
                      className="new-essay-btn home-cta-btn"
                      data-testid="home-dashboard-start-essay"
                      onClick={() => handleOpenNewEssayForm()}
                    >
                      Start a New Essay
                    </button>
                    <button
                      type="button"
                      className="secondary-action-btn"
                      data-testid="home-dashboard-start-application"
                      onClick={() => handleOpenApplicationForm()}
                    >
                      Start a New Application
                    </button>
                  </div>
                </div>

                <div className="home-metrics-grid home-stats-card" data-testid="home-dashboard-metrics">
                  <div className="home-metric-card" data-testid="home-dashboard-metric-applications">
                    <h3>Applications</h3>
                    <p>{applications.length}</p>
                  </div>
                  <div className="home-metric-card" data-testid="home-dashboard-metric-upcoming-deadlines">
                    <h3>Upcoming Deadlines</h3>
                    <p>{applicationSummary.upcoming}</p>
                  </div>
                  <div className="home-metric-card" data-testid="home-dashboard-metric-docs-ready">
                    <h3>Documents Ready</h3>
                    <p>
                      {docProgressOverall.ready}/
                      {Math.max(applications.length, 1) * DOC_TEMPLATES.length}
                    </p>
                  </div>
                </div>

                {showExpandedOnboarding && (
                  <div className="home-tips-card home-onboarding-card" data-testid="home-onboarding-card">
                    <div className="onboarding-header">
                      <div className="onboarding-header-top">
                        <h3>Pilot Setup Guide</h3>
                        <div className="onboarding-header-actions">
                          <button
                            type="button"
                            className="dismiss-onboarding-btn onboarding-hide-inline"
                            data-testid="home-onboarding-hide"
                            onClick={() => setOnboardingHidden(true)}
                          >
                            Hide steps
                          </button>
                          <button
                            type="button"
                            className="dismiss-onboarding-btn onboarding-dismiss-inline"
                            data-testid="home-onboarding-dismiss"
                            onClick={() => {
                              setOnboardingDismissed(true);
                              setOnboardingHidden(false);
                            }}
                          >
                            Dismiss guide
                          </button>
                        </div>
                      </div>
                      <p>Complete {completedOnboardingSteps}/{onboardingSteps.length} to unlock the full workflow.</p>
                      <div className="onboarding-progress">
                        <div className="onboarding-progress-bar">
                          <div className="onboarding-progress-fill" style={{ width: `${onboardingProgress}%` }} />
                        </div>
                        <span>{onboardingProgress}%</span>
                      </div>
                    </div>
                    {nextStep && (
                      <div className="onboarding-next-step">
                        <div>
                          <strong>Next step:</strong> {nextStep.label}
                        </div>
                        <button type="button" className="history-btn" onClick={nextStep.onAction}>
                          {nextStep.actionLabel}
                        </button>
                      </div>
                    )}
                    <div className="onboarding-steps">
                      {onboardingSteps.map((step) => (
                        <div
                          key={step.id}
                          className={`onboarding-step ${step.complete ? 'complete' : ''}`}
                          data-testid={`home-onboarding-step-${step.id}`}
                        >
                          <span className="onboarding-step-label">
                            {step.complete ? 'Done' : 'Pending'}: {step.label}
                          </span>
                          {!step.complete && (
                            <button type="button" data-testid={`home-onboarding-action-${step.id}`} onClick={step.onAction}>
                              {step.actionLabel}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showCollapsedOnboarding && (
                  <div className="home-tips-card home-onboarding-card" data-testid="home-onboarding-restore">
                    <div className="onboarding-header">
                      <h3>Setup Guide Hidden</h3>
                      <p>Bring back the setup guide if you want the checklist again.</p>
                    </div>
                    <button
                      type="button"
                      className="history-btn"
                      onClick={() => setOnboardingHidden(false)}
                    >
                      Show setup guide
                    </button>
                  </div>
                )}

                {essays.length > 0 && (
                  <div className="application-essay-list-card home-recent-card" data-testid="home-recent-essays-card">
                    <h3>Recent Essays</h3>
                    <div className="application-essay-list recent-essay-list">
                      {essays.slice(0, 5).map((essay) => (
                        <button
                          type="button"
                          key={essay.id}
                          className="application-essay-item recent-essay-item"
                          data-testid="home-recent-essay-item"
                          onClick={() => {
                            setSelectedEssay(essay);
                            setSelectedApplicationId(resolveEssayApplicationId(essay));
                            setReview(null);
                            setShowVersions(false);
                            setShowForm(false);
                          }}
                        >
                          <span>{essay.school_name} | {essay.program_type}</span>
                          <small>Updated {new Date(essay.created_at).toLocaleDateString()}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showHomeChecklist && (
                  <div className="home-tips-card home-checklist-card" data-testid="home-checklist-card">
                    <h3>Home Checklist</h3>
                    <p>1. Add schools in Applications and set realistic deadlines.</p>
                    <p>2. Track essays/LOR targets in Requirements and keep drafts moving.</p>
                    <p>3. Keep core files updated in Docs before submission windows.</p>
                  </div>
                )}
              </div>
            )
  );
}

export default HomeView;
