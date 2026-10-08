import { Link } from "react-router-dom";
import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { CheckIcon, MoonIcon, SunIcon } from "../../../app/icons";

function Toggle({ label, detail, checked, onChange, testId }) {
  return (
    <div className="setting-row">
      <div>
        <span>{label}</span>
        {detail && <p className="setting-detail">{detail}</p>}
      </div>
      <label className="theme-switch">
        <input
          type="checkbox"
          data-testid={testId}
          aria-label={label}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="switch-slider" />
      </label>
    </div>
  );
}

export default function SettingsView({
  profileFormData,
  handleProfileFieldChange,
  handleProfileSave,
  profileSaving,
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
  submitPilotFeedback,
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="settings-panel">
      <h2 className="sr-only" data-testid="settings-heading">
        Settings
      </h2>
      <Link className="text-button" to="/help">
        Getting started and help →
      </Link>
      <section className="settings-card">
        <div className="section-heading">
          <div>
            <h3>Appearance</h3>
            <p>
              Choose your view. Your preference follows you around this browser.
            </p>
          </div>
        </div>
        <div
          className="theme-options"
          role="group"
          aria-label="Choose appearance"
        >
          {[
            ["light", "Light", <SunIcon />],
            ["dark", "Dark", <MoonIcon />],
            [
              "system",
              "System",
              <span className="system-theme-icon" aria-hidden="true">
                ◐
              </span>,
            ],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              className={`theme-option ${theme === value ? "selected" : ""}`}
              aria-pressed={theme === value}
              data-testid={`theme-choice-${value}`}
              onClick={() => setTheme(value)}
            >
              <div
                className={`theme-preview preview-${value}`}
                aria-hidden="true"
              >
                <i />
                <div>
                  <b />
                  <span />
                  <span />
                </div>
              </div>
              <span className="theme-option-label">
                {icon}
                {label}
                {theme === value && <CheckIcon />}
              </span>
            </button>
          ))}
        </div>
        <Toggle
          label="Reduce animations"
          detail="Use a quieter interface with less movement. Your device’s reduced-motion setting is always respected."
          checked={reducedMotion}
          onChange={setReducedMotion}
          testId="settings-reduced-motion-toggle"
        />
      </section>
      <div className="settings-grid">
        <section className="settings-card">
          <h3>Your workspace</h3>
          <Toggle
            label="Confirm before deleting"
            checked={confirmDelete}
            onChange={setConfirmDelete}
            testId="settings-confirm-delete-toggle"
          />
          <Toggle
            label="Show practice suggestions"
            checked={showHomeChecklist}
            onChange={setShowHomeChecklist}
            testId="settings-home-checklist-toggle"
          />
          <Toggle
            label="Show setup guide"
            checked={!onboardingDismissed}
            onChange={(enabled) => {
              setOnboardingDismissed(!enabled);
              if (enabled) setOnboardingHidden(false);
            }}
            testId="settings-onboarding-toggle"
          />
          <p className="settings-footnote">
            These preferences are saved on this device.
          </p>
        </section>
        <section className="settings-card">
          <h3>Reminder preferences</h3>
          <p>Choose your preferences and preview upcoming reminders.</p>
          <form onSubmit={handleProfileSave}>
            <Toggle
              label="Enable email reminders"
              checked={profileFormData.email_reminders_enabled}
              onChange={(checked) =>
                handleProfileFieldChange("email_reminders_enabled", checked)
              }
              testId="settings-email-reminders-toggle"
            />
            <div className="form-group">
              <label htmlFor="reminder-days">Days before a deadline</label>
              <input
                id="reminder-days"
                data-testid="settings-reminder-days-input"
                value={profileFormData.reminder_days}
                onChange={(event) =>
                  handleProfileFieldChange("reminder_days", event.target.value)
                }
                placeholder="30,14,7,1"
              />
              <small>Separate days with commas, for example 14,7,1.</small>
            </div>
            <p className="settings-footnote">
              Email: {profileFormData.notification_email || user?.email}
            </p>
            <button
              type="submit"
              className="new-essay-btn"
              disabled={profileSaving}
            >
              {profileSaving ? "Saving…" : "Save reminder preferences"}
            </button>
          </form>
          {profileMessage && (
            <p className="settings-footnote" role="status">
              {profileMessage}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              data-testid="settings-preview-reminders"
              onClick={fetchReminderPreview}
              disabled={reminderLoading}
            >
              {reminderLoading ? "Loading…" : "Preview"}
            </button>
            <button
              type="button"
              data-testid="settings-send-test-reminder"
              onClick={sendTestReminder}
              disabled={reminderSending}
            >
              {reminderSending ? "Sending…" : "Send a test"}
            </button>
          </div>
          {reminderPreview?.error && (
            <p className="error-message" role="alert">
              {reminderPreview.error}
            </p>
          )}
          {reminderPreview && !reminderPreview.error && (
            <div className="settings-reminders-list" role="status">
              <p>{reminderPreview.total_matches} matching reminders</p>
              {reminderPreview.items?.slice(0, 5).map((item) => (
                <p key={`${item.application_id}-${item.deadline}`}>
                  {item.school_name} · {item.reason}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="settings-card">
        <h3>Help shape this space</h3>
        <p>
          Tell us what feels useful, what feels confusing, or what you’d like
          next.
        </p>
        <form className="feedback-form" onSubmit={submitPilotFeedback}>
          <div className="form-group">
            <label htmlFor="feedback-type">Feedback type</label>
            <select
              id="feedback-type"
              data-testid="settings-feedback-category"
              value={feedbackCategory}
              onChange={(event) => setFeedbackCategory(event.target.value)}
            >
              <option value="general">General feedback</option>
              <option value="bug">Something went wrong</option>
              <option value="ux">Usability</option>
              <option value="feature">An idea for a feature</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="feedback-message">Your message</label>
            <textarea
              id="feedback-message"
              data-testid="settings-feedback-message"
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              placeholder="A little context helps us understand…"
              rows="4"
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              data-testid="settings-submit-feedback"
              disabled={feedbackSending}
            >
              {feedbackSending ? "Sending…" : "Send feedback"}
            </button>
          </div>
          {feedbackStatus && <p role="status">{feedbackStatus}</p>}
        </form>
      </section>
    </div>
  );
}
