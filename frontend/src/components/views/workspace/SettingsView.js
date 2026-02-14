import React from 'react';

function SettingsView({
  applications,
  essays,
  profileFormData,
  handleProfileFieldChange,
  isDarkMode,
  setIsDarkMode,
  reducedMotion,
  setReducedMotion,
  confirmDelete,
  setConfirmDelete,
  showHomeChecklist,
  setShowHomeChecklist,
  onboardingDismissed,
  setOnboardingDismissed,
  setOnboardingHidden,
  fetchReminderPreview,
  reminderLoading,
  sendTestReminder,
  reminderSending,
  reminderPreview,
  profileMessage,
  user,
  feedbackCategory,
  setFeedbackCategory,
  feedbackMessage,
  setFeedbackMessage,
  feedbackSending,
  feedbackStatus,
  submitPilotFeedback
}) {
  return (
            <div className="settings-panel">
              <h2 data-testid="settings-heading">Settings</h2>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Workspace</h3>
                  <p><strong>Tracked applications:</strong> {applications.length}</p>
                  <p><strong>Reviewed essays:</strong> {essays.filter((essay) => essay.review_score).length}</p>
                  <p><strong>Programs tracked:</strong> {[...new Set(essays.map((essay) => essay.program_type))].length}</p>
                </div>
                <div className="settings-card">
                  <h3>Progress</h3>
                  <p>
                    <strong>Reviewed essays:</strong>{' '}
                    {essays.filter((essay) => essay.review_score).length}
                  </p>
                  <p>
                    <strong>Programs tracked:</strong>{' '}
                    {[...new Set(essays.map((essay) => essay.program_type))].length}
                  </p>
                  <p>
                    <strong>Tracked applications:</strong> {applications.length}
                  </p>
                </div>
                <div className="settings-card">
                  <h3>Writing Tips</h3>
                  <p>Use concrete examples for leadership impact.</p>
                  <p>Keep each paragraph focused on one core idea.</p>
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Notifications</h3>
                  <div className="setting-row">
                    <span>Enable Email Reminders</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-email-reminders-toggle"
                        type="checkbox"
                        checked={profileFormData.email_reminders_enabled}
                        onChange={(e) => handleProfileFieldChange('email_reminders_enabled', e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Reminder Days</label>
                    <input
                      data-testid="settings-reminder-days-input"
                      type="text"
                      value={profileFormData.reminder_days}
                      onChange={(e) => handleProfileFieldChange('reminder_days', e.target.value)}
                      placeholder="30,14,7,1"
                    />
                  </div>
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Appearance</h3>
                  <div className="setting-row">
                    <span>Dark mode</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-dark-mode-toggle"
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={(e) => setIsDarkMode(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                  <div className="setting-row">
                    <span>Reduce animations</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-reduced-motion-toggle"
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Preferences</h3>
                  <div className="setting-row">
                    <span>Confirm before delete</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-confirm-delete-toggle"
                        type="checkbox"
                        checked={confirmDelete}
                        onChange={(e) => setConfirmDelete(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                  <div className="setting-row">
                    <span>Show Home Checklist</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-home-checklist-toggle"
                        type="checkbox"
                        checked={showHomeChecklist}
                        onChange={(e) => setShowHomeChecklist(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                  <div className="setting-row">
                    <span>Show Setup Guide</span>
                    <label className="theme-switch">
                      <input
                        data-testid="settings-onboarding-toggle"
                        type="checkbox"
                        checked={!onboardingDismissed}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setOnboardingDismissed(!enabled);
                          if (enabled) {
                            setOnboardingHidden(false);
                          }
                        }}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Email Reminders</h3>
                  <p>Linked inbox: <strong>{profileFormData.notification_email || user.email}</strong></p>
                  <div className="form-actions">
                    <button type="button" data-testid="settings-preview-reminders" onClick={fetchReminderPreview} disabled={reminderLoading}>
                      {reminderLoading ? 'Loading...' : 'Preview Reminders'}
                    </button>
                    <button type="button" data-testid="settings-send-test-reminder" onClick={sendTestReminder} disabled={reminderSending}>
                      {reminderSending ? 'Sending...' : 'Send Test Reminder'}
                    </button>
                  </div>
                  {reminderPreview?.error && <p>{reminderPreview.error}</p>}
                  {reminderPreview && !reminderPreview.error && (
                    <div className="settings-reminders-list">
                      <p>
                        <strong>{reminderPreview.total_matches}</strong> reminder match(es)
                      </p>
                      {reminderPreview.items.length === 0 ? (
                        <p>No reminders due for current window.</p>
                      ) : (
                        reminderPreview.items.slice(0, 5).map((item) => (
                          <p key={`reminder-${item.application_id}-${item.deadline}`}>
                            {item.school_name} ({item.program_name}) | {item.reason}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                  {profileMessage && <p>{profileMessage}</p>}
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Pilot Feedback</h3>
                  <p>Share UX issues, missing features, or confusing flows while you test.</p>
                  <form className="feedback-form" onSubmit={submitPilotFeedback}>
                    <div className="form-group">
                      <label>Feedback Type</label>
                      <select data-testid="settings-feedback-category" value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
                        <option value="general">General</option>
                        <option value="ux">UX / UI</option>
                        <option value="bug">Bug</option>
                        <option value="feature">Feature request</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Message</label>
                      <textarea
                        data-testid="settings-feedback-message"
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="What happened, what you expected, and where in the app?"
                        rows="4"
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" data-testid="settings-submit-feedback" disabled={feedbackSending}>
                        {feedbackSending ? 'Sending...' : 'Submit Feedback'}
                      </button>
                    </div>
                    {feedbackStatus && <p>{feedbackStatus}</p>}
                  </form>
                </div>
              </div>
            </div>
  );
}

export default SettingsView;
