import React from 'react';

function ProfileView({
  user,
  essays,
  logout,
  profileFormData,
  handleProfileSave,
  handleProfileFieldChange,
  profileSaving
}) {
  return (
            <div className="settings-panel profile-panel">
              <h2 data-testid="profile-heading">Profile</h2>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Account</h3>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Total essays:</strong> {essays.length}</p>
                  <div className="form-actions" style={{ marginTop: '12px' }}>
                    <button type="button" data-testid="profile-logout-button" onClick={logout}>Logout</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Admissions Focus</h3>
                  <p><strong>Target intake:</strong> {profileFormData.target_intake || 'Not set'}</p>
                  <p><strong>Target countries:</strong> {profileFormData.target_countries || 'Not set'}</p>
                  <p><strong>Preferred currency:</strong> {profileFormData.preferred_currency || 'USD'}</p>
                </div>
                <div className="settings-card settings-card-wide">
                  <h3>Profile Details</h3>
                  <form className="profile-settings-form" onSubmit={handleProfileSave}>
                    <div className="tracker-form-grid">
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          data-testid="profile-name-input"
                          type="text"
                          value={profileFormData.name}
                          onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Avatar URL</label>
                        <input
                          data-testid="profile-avatar-input"
                          type="url"
                          value={profileFormData.avatar_url}
                          onChange={(e) => handleProfileFieldChange('avatar_url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Timezone</label>
                        <input
                          data-testid="profile-timezone-input"
                          type="text"
                          value={profileFormData.timezone}
                          onChange={(e) => handleProfileFieldChange('timezone', e.target.value)}
                          placeholder="e.g., America/New_York"
                        />
                      </div>
                      <div className="form-group">
                        <label>Target Intake</label>
                        <input
                          data-testid="profile-intake-input"
                          type="text"
                          value={profileFormData.target_intake}
                          onChange={(e) => handleProfileFieldChange('target_intake', e.target.value)}
                          placeholder="Fall 2027"
                        />
                      </div>
                      <div className="form-group">
                        <label>Target Countries</label>
                        <input
                          data-testid="profile-countries-input"
                          type="text"
                          value={profileFormData.target_countries}
                          onChange={(e) => handleProfileFieldChange('target_countries', e.target.value)}
                          placeholder="USA, UK, Canada"
                        />
                      </div>
                      <div className="form-group">
                        <label>Preferred Currency</label>
                        <select
                          data-testid="profile-currency-select"
                          value={profileFormData.preferred_currency}
                          onChange={(e) => handleProfileFieldChange('preferred_currency', e.target.value)}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Notification Email</label>
                        <input
                          data-testid="profile-notification-email-input"
                          type="email"
                          value={profileFormData.notification_email}
                          onChange={(e) => handleProfileFieldChange('notification_email', e.target.value)}
                          placeholder="alerts@example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email Provider</label>
                        <select
                          data-testid="profile-email-provider-select"
                          value={profileFormData.email_provider}
                          onChange={(e) => handleProfileFieldChange('email_provider', e.target.value)}
                        >
                          <option value="manual">Manual</option>
                          <option value="gmail">Gmail</option>
                          <option value="outlook">Outlook</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Bio</label>
                      <textarea
                        data-testid="profile-bio-input"
                        value={profileFormData.bio}
                        onChange={(e) => handleProfileFieldChange('bio', e.target.value)}
                        placeholder="Brief profile note, goals, and your admissions strategy."
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" data-testid="profile-save-button" disabled={profileSaving}>
                        {profileSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
  );
}

export default ProfileView;
