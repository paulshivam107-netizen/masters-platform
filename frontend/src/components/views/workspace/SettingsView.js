import { Link } from "react-router-dom";
import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { CheckIcon, MoonIcon, SunIcon } from "../../../app/icons";
import AccountDataCard from "./AccountDataCard";
import "./WorkspaceAccount.css";

function Toggle({ label, detail, checked, onChange, testId }) {
  return (
    <label className="wac-toggle">
      <span className="wac-toggle__text">
        <span className="wac-toggle__label">{label}</span>
        {detail && <span className="ws-help">{detail}</span>}
      </span>
      <input
        type="checkbox"
        className="wac-toggle__input"
        data-testid={testId}
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="wac-toggle__track" aria-hidden="true" />
    </label>
  );
}

function Section({ title, description, children, id }) {
  return (
    <section className="wac-section" aria-labelledby={id}>
      <div className="wac-section__intro">
        <h3 className="ws-h3" id={id}>
          {title}
        </h3>
        {description && <p className="ws-help">{description}</p>}
      </div>
      <div className="ws-card ws-stack ws-stack--sm wac-section__body">
        {children}
      </div>
    </section>
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
  logout,
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="wac-page ws-stack wac-settings">
      <h2 className="sr-only" data-testid="settings-heading">
        Settings
      </h2>
      <p className="ws-small">
        <Link className="ws-link" to="/help">
          Getting started and help →
        </Link>
      </p>

      <Section
        id="wac-appearance"
        title="Appearance"
        description="Your preference follows you around this browser."
      >
        <div
          className="wac-themes"
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
              type="button"
              key={value}
              className={`wac-theme ${theme === value ? "is-selected" : ""}`}
              aria-pressed={theme === value}
              data-testid={`theme-choice-${value}`}
              onClick={() => setTheme(value)}
            >
              <span
                className={`wac-theme__preview wac-theme__preview--${value}`}
                aria-hidden="true"
              >
                <i />
                <span>
                  <b />
                  <b />
                </span>
              </span>
              <span className="wac-theme__label">
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
      </Section>

      <Section
        id="wac-workspace"
        title="Your workspace"
        description="Saved on this device only."
      >
        <Toggle
          label="Confirm before deleting"
          detail="Ask first, so nothing is removed by accident."
          checked={confirmDelete}
          onChange={setConfirmDelete}
          testId="settings-confirm-delete-toggle"
        />
        <Toggle
          label="Show practice suggestions"
          detail="Suggested next steps on your Today page."
          checked={showHomeChecklist}
          onChange={setShowHomeChecklist}
          testId="settings-home-checklist-toggle"
        />
        <Toggle
          label="Show setup guide"
          detail="The short first-steps card on Today."
          checked={!onboardingDismissed}
          onChange={(enabled) => {
            setOnboardingDismissed(!enabled);
            if (enabled) setOnboardingHidden(false);
          }}
          testId="settings-onboarding-toggle"
        />
      </Section>

      <Section
        id="wac-reminders"
        title="Reminder preferences"
        description="Choose when to be reminded, and preview what would be sent."
      >
        <form className="ws-stack ws-stack--sm" onSubmit={handleProfileSave}>
          <Toggle
            label="Enable email reminders"
            checked={profileFormData.email_reminders_enabled}
            onChange={(checked) =>
              handleProfileFieldChange("email_reminders_enabled", checked)
            }
            testId="settings-email-reminders-toggle"
          />
          <div className="ws-field">
            <label className="ws-label" htmlFor="reminder-days">
              Days before a deadline
            </label>
            <input
              id="reminder-days"
              className="ws-input"
              data-testid="settings-reminder-days-input"
              value={profileFormData.reminder_days}
              onChange={(event) =>
                handleProfileFieldChange("reminder_days", event.target.value)
              }
              placeholder="30,14,7,1"
            />
            <p className="ws-help">
              Separate days with commas, for example 14,7,1. Reminders go to{" "}
              {profileFormData.notification_email || user?.email}.
            </p>
          </div>
          <div className="ws-row">
            <button
              type="submit"
              className="ws-btn ws-btn--primary"
              disabled={profileSaving}
            >
              {profileSaving ? "Saving…" : "Save reminder preferences"}
            </button>
            {profileMessage && (
              <span className="ws-small ws-muted" role="status">
                {profileMessage}
              </span>
            )}
          </div>
        </form>
        <div className="ws-divider" />
        <div className="ws-row">
          <button
            type="button"
            className="ws-btn"
            data-testid="settings-preview-reminders"
            onClick={fetchReminderPreview}
            disabled={reminderLoading}
          >
            {reminderLoading ? "Loading…" : "Preview"}
          </button>
          <button
            type="button"
            className="ws-btn"
            data-testid="settings-send-test-reminder"
            onClick={sendTestReminder}
            disabled={reminderSending}
          >
            {reminderSending ? "Sending…" : "Send a test"}
          </button>
        </div>
        {reminderPreview?.error && (
          <p className="ws-error" role="alert">
            {reminderPreview.error}
          </p>
        )}
        {reminderPreview && !reminderPreview.error && (
          <div className="wac-preview" role="status">
            <p>
              <strong className="ws-num">{reminderPreview.total_matches}</strong>{" "}
              matching reminders
            </p>
            {reminderPreview.items?.slice(0, 5).map((item) => (
              <p className="ws-small ws-muted" key={`${item.application_id}-${item.deadline}`}>
                {item.school_name} · {item.reason}
              </p>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="wac-feedback"
        title="Help shape this space"
        description="Tell us what feels useful, what feels confusing, or what you’d like next."
      >
        <form className="ws-stack ws-stack--sm" onSubmit={submitPilotFeedback}>
          <div className="ws-field">
            <label className="ws-label" htmlFor="feedback-type">
              Feedback type
            </label>
            <select
              id="feedback-type"
              className="ws-select"
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
          <div className="ws-field">
            <label className="ws-label" htmlFor="feedback-message">
              Your message
            </label>
            <textarea
              id="feedback-message"
              className="ws-textarea"
              data-testid="settings-feedback-message"
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              placeholder="A little context helps us understand…"
              rows="4"
            />
          </div>
          <div className="ws-row">
            <button
              type="submit"
              className="ws-btn"
              data-testid="settings-submit-feedback"
              disabled={feedbackSending}
            >
              {feedbackSending ? "Sending…" : "Send feedback"}
            </button>
            {feedbackStatus && (
              <span className="ws-small ws-muted" role="status">
                {feedbackStatus}
              </span>
            )}
          </div>
        </form>
      </Section>

      <AccountDataCard user={user} logout={logout} />
    </div>
  );
}
