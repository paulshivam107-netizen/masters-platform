import React from "react";

function ProfileView({
  user,
  essays,
  logout,
  profileFormData,
  handleProfileSave,
  handleProfileFieldChange,
  profileSaving,
}) {
  return (
    <div className="settings-panel">
      <h2 className="sr-only" data-testid="profile-heading">
        Profile
      </h2>
      <div className="settings-grid">
        <div className="settings-card">
          <h3>Account</h3>
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Total essays:</strong> {essays.length}
          </p>
          <div className="form-actions" style={{ marginTop: "12px" }}>
            <button
              type="button"
              data-testid="profile-logout-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="settings-card">
          <h3>Admissions Focus</h3>
          <p>
            <strong>Target intake:</strong>{" "}
            {profileFormData.target_intake || "Not set"}
          </p>
          <p>
            <strong>Target countries:</strong>{" "}
            {profileFormData.target_countries || "Not set"}
          </p>
          <p>
            <strong>Preferred currency:</strong>{" "}
            {profileFormData.preferred_currency || "USD"}
          </p>
        </div>
        <div className="settings-card settings-card-wide">
          <h3>Profile Details</h3>
          <form className="profile-settings-form" onSubmit={handleProfileSave}>
            <div className="tracker-form-grid">
              <div className="form-group">
                <label htmlFor="profileview-field-1">Name</label>
                <input
                  id="profileview-field-1"
                  data-testid="profile-name-input"
                  type="text"
                  value={profileFormData.name}
                  onChange={(e) =>
                    handleProfileFieldChange("name", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-2">Avatar URL</label>
                <input
                  id="profileview-field-2"
                  data-testid="profile-avatar-input"
                  type="url"
                  value={profileFormData.avatar_url}
                  onChange={(e) =>
                    handleProfileFieldChange("avatar_url", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-3">Timezone</label>
                <input
                  id="profileview-field-3"
                  data-testid="profile-timezone-input"
                  type="text"
                  value={profileFormData.timezone}
                  onChange={(e) =>
                    handleProfileFieldChange("timezone", e.target.value)
                  }
                  placeholder="e.g., Asia/Kolkata"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-4">Target Intake</label>
                <input
                  id="profileview-field-4"
                  data-testid="profile-intake-input"
                  type="text"
                  value={profileFormData.target_intake}
                  onChange={(e) =>
                    handleProfileFieldChange("target_intake", e.target.value)
                  }
                  placeholder="2027 intake"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-5">Target Countries</label>
                <input
                  id="profileview-field-5"
                  data-testid="profile-countries-input"
                  type="text"
                  value={profileFormData.target_countries}
                  onChange={(e) =>
                    handleProfileFieldChange("target_countries", e.target.value)
                  }
                  placeholder="India, Singapore"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-6">Preferred Currency</label>
                <select
                  id="profileview-field-6"
                  data-testid="profile-currency-select"
                  value={profileFormData.preferred_currency}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      "preferred_currency",
                      e.target.value,
                    )
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-7">Notification Email</label>
                <input
                  id="profileview-field-7"
                  data-testid="profile-notification-email-input"
                  type="email"
                  value={profileFormData.notification_email}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      "notification_email",
                      e.target.value,
                    )
                  }
                  placeholder="alerts@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileview-field-8">Email Provider</label>
                <select
                  id="profileview-field-8"
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
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="profileview-field-9">Bio</label>
              <textarea
                id="profileview-field-9"
                data-testid="profile-bio-input"
                value={profileFormData.bio}
                onChange={(e) =>
                  handleProfileFieldChange("bio", e.target.value)
                }
                placeholder="Brief profile note, goals, and your admissions strategy."
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                data-testid="profile-save-button"
                disabled={profileSaving}
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileView;
