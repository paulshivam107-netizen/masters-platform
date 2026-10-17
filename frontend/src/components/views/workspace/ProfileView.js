import React from "react";
import "./WorkspaceAccount.css";

function Field({ id, label, help, children }) {
  return (
    <div className="ws-field">
      <label className="ws-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {help && <p className="ws-help">{help}</p>}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="wac-section">
      <div className="wac-section__intro">
        <h3 className="ws-h3">{title}</h3>
        {description && <p className="ws-help">{description}</p>}
      </div>
      <div className="ws-card ws-stack ws-stack--sm wac-section__body">
        {children}
      </div>
    </section>
  );
}

function ProfileView({
  user,
  essays,
  logout,
  profileFormData,
  handleProfileSave,
  handleProfileFieldChange,
  profileSaving,
}) {
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="wac-page ws-stack wac-profile">
      <h2 className="sr-only" data-testid="profile-heading">
        Profile
      </h2>
      <div className="ws-card wac-summary">
        <span className="wac-avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="wac-summary__who">
          <strong className="wac-summary__name">{user.name}</strong>
          <span className="ws-muted wac-summary__email">{user.email}</span>
        </div>
        <dl className="wac-summary__stats">
          <div>
            <dt className="ws-small ws-muted">Essays</dt>
            <dd className="ws-num">{essays.length}</dd>
          </div>
          <div>
            <dt className="ws-small ws-muted">Target intake</dt>
            <dd>{profileFormData.target_intake || "Not set"}</dd>
          </div>
          <div>
            <dt className="ws-small ws-muted">Countries</dt>
            <dd>{profileFormData.target_countries || "Not set"}</dd>
          </div>
          <div>
            <dt className="ws-small ws-muted">Currency</dt>
            <dd>{profileFormData.preferred_currency || "USD"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="ws-btn ws-btn--sm"
          data-testid="profile-logout-button"
          onClick={logout}
        >
          Log out
        </button>
      </div>

      <form
        className="ws-stack wac-form"
        onSubmit={handleProfileSave}
      >
        <Section
          title="About you"
          description="How you appear in the workspace and in exports."
        >
          <Field id="profileview-field-1" label="Name">
            <input
              id="profileview-field-1"
              className="ws-input"
              data-testid="profile-name-input"
              type="text"
              value={profileFormData.name}
              onChange={(e) => handleProfileFieldChange("name", e.target.value)}
            />
          </Field>
          <Field
            id="profileview-field-2"
            label="Avatar URL"
            help="Optional. Link to a square image."
          >
            <input
              id="profileview-field-2"
              className="ws-input"
              data-testid="profile-avatar-input"
              type="url"
              value={profileFormData.avatar_url}
              onChange={(e) =>
                handleProfileFieldChange("avatar_url", e.target.value)
              }
              placeholder="https://..."
            />
          </Field>
          <Field
            id="profileview-field-9"
            label="Bio"
            help="A short note on your background, goals and admissions strategy."
          >
            <textarea
              id="profileview-field-9"
              className="ws-textarea"
              data-testid="profile-bio-input"
              value={profileFormData.bio}
              onChange={(e) => handleProfileFieldChange("bio", e.target.value)}
              placeholder="Brief profile note, goals, and your admissions strategy."
            />
          </Field>
        </Section>

        <Section
          title="Admissions focus"
          description="Used for suggestions, deadlines and cost comparisons."
        >
          <div className="ws-grid ws-grid--2">
            <Field id="profileview-field-4" label="Target intake">
              <input
                id="profileview-field-4"
                className="ws-input"
                data-testid="profile-intake-input"
                type="text"
                value={profileFormData.target_intake}
                onChange={(e) =>
                  handleProfileFieldChange("target_intake", e.target.value)
                }
                placeholder="2027 intake"
              />
            </Field>
            <Field id="profileview-field-6" label="Preferred currency">
              <select
                id="profileview-field-6"
                className="ws-select"
                data-testid="profile-currency-select"
                value={profileFormData.preferred_currency}
                onChange={(e) =>
                  handleProfileFieldChange("preferred_currency", e.target.value)
                }
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </Field>
          </div>
          <Field
            id="profileview-field-5"
            label="Target countries"
            help="Separate with commas."
          >
            <input
              id="profileview-field-5"
              className="ws-input"
              data-testid="profile-countries-input"
              type="text"
              value={profileFormData.target_countries}
              onChange={(e) =>
                handleProfileFieldChange("target_countries", e.target.value)
              }
              placeholder="India, Singapore"
            />
          </Field>
          <Field
            id="profileview-field-3"
            label="Timezone"
            help="Deadlines and reminders follow this timezone."
          >
            <input
              id="profileview-field-3"
              className="ws-input"
              data-testid="profile-timezone-input"
              type="text"
              value={profileFormData.timezone}
              onChange={(e) =>
                handleProfileFieldChange("timezone", e.target.value)
              }
              placeholder="e.g., Asia/Kolkata"
            />
          </Field>
        </Section>

        <Section
          title="Email"
          description="Where reminders and alerts are sent."
        >
          <Field
            id="profileview-field-7"
            label="Notification email"
            help="Leave empty to use your sign-in email."
          >
            <input
              id="profileview-field-7"
              className="ws-input"
              data-testid="profile-notification-email-input"
              type="email"
              value={profileFormData.notification_email}
              onChange={(e) =>
                handleProfileFieldChange("notification_email", e.target.value)
              }
              placeholder="alerts@example.com"
            />
          </Field>
          <Field id="profileview-field-8" label="Email provider">
            <select
              id="profileview-field-8"
              className="ws-select"
              data-testid="profile-email-provider-select"
              value={profileFormData.email_provider}
              onChange={(e) =>
                handleProfileFieldChange("email_provider", e.target.value)
              }
            >
              <option value="manual">Manual</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
            </select>
          </Field>
        </Section>

        <div className="wac-savebar">
          <p className="ws-small ws-muted" role="status">
            {profileSaving ? "Saving your profile…" : "Changes are saved when you select Save profile."}
          </p>
          <button
            type="submit"
            className="ws-btn ws-btn--primary"
            data-testid="profile-save-button"
            disabled={profileSaving}
          >
            {profileSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileView;
