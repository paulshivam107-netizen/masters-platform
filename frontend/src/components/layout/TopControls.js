import React, { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  PlusIcon,
  SearchIcon,
  EssaysIcon,
  ApplicationsIcon,
  UserIcon,
  SettingsIcon,
} from "../../app/icons";
import Brand from "../common/Brand";

export default function TopControls({
  onGoHome,
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
  user,
}) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "keydown" ||
        !createRef.current?.contains(event.target)
      )
        setIsCreateMenuOpen(false);
      if (event.type === "keydown" && isProfileMenuOpen) {
        onToggleProfileMenu();
        profileMenuRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isProfileMenuOpen, onToggleProfileMenu, profileMenuRef]);
  const initials = (user?.name || "You")
    .split(/\s+/)
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <header className="ws-topbar">
      <div className="ws-topbar__brand">
        <Brand compact to="/app/today" onClick={onGoHome} />
      </div>
      <form
        className="ws-search"
        onSubmit={onGlobalSearchSubmit}
        role="search"
      >
        <SearchIcon />
        <input
          data-testid="global-search-input"
          type="search"
          value={globalSearch}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder="Search"
          aria-label="Search schools or programmes"
        />
        <button
          type="submit"
          data-testid="global-search-submit"
          aria-label="Search applications"
        >
          ↵
        </button>
      </form>
      <div className="ws-topbar__actions">
        <button
          type="button"
          className="ws-btn ws-btn--icon ws-bell"
          data-testid="open-notifications-button"
          aria-label={`Open notifications${notificationCount ? ` (${notificationCount})` : ""}`}
          onClick={onOpenNotifications}
        >
          <BellIcon />
          {notificationCount > 0 && <span className="ws-bell__dot" />}
        </button>
        <div className="ws-menu" ref={createRef}>
          <button
            type="button"
            className="ws-btn ws-btn--primary ws-new"
            data-testid="header-create-button"
            aria-label="Create new essay or application"
            aria-expanded={isCreateMenuOpen}
            onClick={() => setIsCreateMenuOpen((open) => !open)}
          >
            <PlusIcon />
            <span>New</span>
          </button>
          {isCreateMenuOpen && (
            <div className="ws-popover ws-popover--create">
              <p className="ws-popover__label">Make a little progress</p>
              <button
                data-testid="create-application-option"
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  onCreateApplication();
                }}
              >
                <ApplicationsIcon /> Add application
              </button>
              <button
                data-testid="create-essay-option"
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  onCreateEssay();
                }}
              >
                <EssaysIcon /> Write an essay
              </button>
            </div>
          )}
        </div>
        <div className="ws-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="ws-avatar-btn"
            data-testid="profile-menu-trigger"
            aria-label="Open account menu"
            aria-expanded={isProfileMenuOpen}
            onClick={onToggleProfileMenu}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="ws-avatar-img"
              />
            ) : (
              <span className="ws-avatar">{initials}</span>
            )}
          </button>
          {isProfileMenuOpen && (
            <div className="ws-popover ws-popover--account">
              <div className="ws-popover__summary">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button
                data-testid="profile-menu-go-profile"
                onClick={onGoProfile}
              >
                <UserIcon /> Your profile
              </button>
              <button
                data-testid="profile-menu-go-settings"
                onClick={onGoSettings}
              >
                <SettingsIcon /> Settings
              </button>
              <button
                data-testid="profile-menu-logout"
                className="is-danger"
                onClick={onLogout}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
