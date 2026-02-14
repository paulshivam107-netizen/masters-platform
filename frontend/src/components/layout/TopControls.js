import React, { useState } from 'react';
import { BellIcon, UserIcon } from '../../app/icons';

function TopControls({
  globalSearch,
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  onCreateEssay,
  onCreateApplication,
  notificationCount,
  onOpenNotifications,
  profileMenuRef,
  isProfileMenuOpen,
  onToggleProfileMenu,
  onGoProfile,
  onGoSettings,
  onLogout,
  user
}) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  return (
    <div className="workspace-top-controls">
      <form className="header-search-form" onSubmit={onGlobalSearchSubmit}>
        <input
          data-testid="global-search-input"
          type="text"
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          placeholder="Search schools or programs..."
          aria-label="Search schools or programs"
        />
        <button type="submit" data-testid="global-search-submit">Search</button>
      </form>
      <div
        className="header-create-menu"
        onMouseEnter={() => setIsCreateMenuOpen(true)}
        onMouseLeave={() => setIsCreateMenuOpen(false)}
      >
        <button
          type="button"
          className="header-create-btn"
          data-testid="header-create-button"
          aria-haspopup="menu"
          aria-expanded={isCreateMenuOpen}
          onClick={() => setIsCreateMenuOpen((prev) => !prev)}
        >
          + Create
        </button>
        {isCreateMenuOpen && (
          <div className="header-create-dropdown" role="menu">
            <button
              type="button"
              className="header-create-option"
              data-testid="create-essay-option"
              role="menuitem"
              onClick={() => {
                setIsCreateMenuOpen(false);
                onCreateEssay();
              }}
            >
              New Essay
            </button>
            <button
              type="button"
              className="header-create-option"
              data-testid="create-application-option"
              role="menuitem"
              onClick={() => {
                setIsCreateMenuOpen(false);
                onCreateApplication();
              }}
            >
              New Application
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="header-icon-btn"
        data-testid="open-notifications-button"
        aria-label={`Open notifications${notificationCount ? ` (${notificationCount})` : ''}`}
        onClick={onOpenNotifications}
      >
        <BellIcon />
        {notificationCount > 0 && <span className="header-icon-badge">{notificationCount}</span>}
      </button>
      <div className="header-profile-menu" ref={profileMenuRef}>
        <button
          type="button"
          className="header-profile-trigger"
          data-testid="profile-menu-trigger"
          aria-label="Open account menu"
          aria-expanded={isProfileMenuOpen}
          onClick={onToggleProfileMenu}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="header-profile-avatar-image" />
          ) : (
            <span className="header-profile-avatar-fallback" aria-hidden="true">
              <UserIcon />
            </span>
          )}
        </button>
        {isProfileMenuOpen && (
          <div className="header-profile-dropdown" role="menu">
            <button type="button" data-testid="profile-menu-go-profile" className="header-profile-action" role="menuitem" onClick={onGoProfile}>
              Profile
            </button>
            <button type="button" data-testid="profile-menu-go-settings" className="header-profile-action" role="menuitem" onClick={onGoSettings}>
              Settings
            </button>
            <button type="button" data-testid="profile-menu-logout" className="header-profile-action danger" role="menuitem" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopControls;
