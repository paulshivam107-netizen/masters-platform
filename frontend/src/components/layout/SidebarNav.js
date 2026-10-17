import React, { useEffect, useRef, useState } from "react";
import Brand from "../common/Brand";
import ThemeToggle from "../common/ThemeToggle";
import { BellIcon, CloseIcon, SettingsIcon } from "../../app/icons";

function initialsOf(name) {
  return (name || "You")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function SidebarNav({
  navGroups,
  activeNav,
  expandedNavGroups,
  onToggleGroup,
  onNavigate,
  user,
}) {
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const dialogRef = useRef(null);
  const primary = navGroups
    .flatMap((group) => group.items)
    .filter((item) =>
      ["home", "tracker", "essays", "interviews"].includes(item.id),
    );
  const overflow = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !primary.some((nav) => nav.id === item.id),
      ),
    }))
    .filter((group) => group.items.length);
  useEffect(() => setIsMobileMoreOpen(false), [activeNav]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isMobileMoreOpen && !dialog.open) dialog.showModal();
    else if (!isMobileMoreOpen && dialog.open) dialog.close();
  }, [isMobileMoreOpen]);
  const navButton = (item, mobile = false) => (
    <button
      key={item.id}
      type="button"
      className={`${mobile ? "ws-sheet-item" : "ws-nav-item"} ${activeNav === item.id ? "is-active" : ""}`}
      data-testid={`${mobile ? "mobile-nav-overflow" : "nav-item"}-${item.id}`}
      aria-current={activeNav === item.id ? "page" : undefined}
      onClick={() => {
        setIsMobileMoreOpen(false);
        onNavigate(item.id);
      }}
    >
      <span className="ws-nav-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
  return (
    <>
      <aside className="ws-sidebar" data-testid="sidebar-nav">
        <Brand to="/app/today" onClick={() => onNavigate("home")} />
        <nav className="ws-nav" aria-label="Workspace navigation">
          {navGroups.map((group) => (
            <div className="ws-nav-group" key={group.id}>
              {group.id === "core" ? (
                <p className="ws-nav-label">Your workspace</p>
              ) : (
                <button
                  className="ws-nav-label ws-nav-toggle"
                  type="button"
                  aria-expanded={Boolean(expandedNavGroups[group.id])}
                  aria-controls={`nav-${group.id}`}
                  onClick={() => onToggleGroup(group.id)}
                  data-testid={`nav-group-${group.id}`}
                >
                  <span>{group.label}</span>
                  <span className="ws-nav-toggle__mark" aria-hidden="true">
                    {expandedNavGroups[group.id] ? "−" : "+"}
                  </span>
                </button>
              )}
              {(group.id === "core" || expandedNavGroups[group.id]) && (
                <div className="ws-nav-items" id={`nav-${group.id}`}>
                  {group.items.map((item) => navButton(item))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ws-sidebar-foot">
          <button
            type="button"
            className={`ws-nav-item ${activeNav === "settings" ? "is-active" : ""}`}
            aria-current={activeNav === "settings" ? "page" : undefined}
            onClick={() => onNavigate("settings")}
          >
            <span className="ws-nav-icon" aria-hidden="true">
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </button>
          <ThemeToggle showLabel />
          {user && (
            <button
              type="button"
              className={`ws-account ${activeNav === "profile" ? "is-active" : ""}`}
              data-testid="sidebar-account"
              aria-label={`Your profile, ${user.name || user.email}`}
              onClick={() => onNavigate("profile")}
            >
              <span className="ws-avatar" aria-hidden="true">
                {initialsOf(user.name)}
              </span>
              <span className="ws-account__text">
                <strong>{user.name || "Your profile"}</strong>
                <small>{user.email}</small>
              </span>
            </button>
          )}
        </div>
      </aside>
      <nav
        className="ws-tabbar"
        aria-label="Mobile navigation"
        data-testid="mobile-bottom-nav"
      >
        {primary.map((item) => (
          <button
            key={item.id}
            className={`ws-tab ${activeNav === item.id ? "is-active" : ""}`}
            data-testid={`mobile-nav-item-${item.id}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="ws-tab__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              {item.id === "home"
                ? "Today"
                : item.id === "tracker"
                  ? "Applications"
                  : item.label}
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`ws-tab ${!primary.some((item) => item.id === activeNav) ? "is-active" : ""}`}
          data-testid="mobile-nav-item-more"
          aria-haspopup="dialog"
          aria-expanded={isMobileMoreOpen}
          onClick={() => setIsMobileMoreOpen(true)}
        >
          <span className="ws-tab__icon ws-tab__more" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>More</span>
        </button>
      </nav>
      <dialog
        ref={dialogRef}
        className="ws-sheet"
        aria-labelledby="more-nav-title"
        onClose={() => setIsMobileMoreOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsMobileMoreOpen(false);
        }}
      >
        <div className="ws-sheet__body" data-testid="mobile-nav-more-overlay">
          <header className="ws-sheet__head">
            <h2 id="more-nav-title">Your workspace</h2>
            <button
              type="button"
              className="ws-btn ws-btn--icon"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileMoreOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>
          {overflow.map((group) => (
            <div key={group.id}>
              <p className="ws-nav-label">{group.label}</p>
              <div className="ws-sheet__items">
                {group.items.map((item) => navButton(item, true))}
              </div>
            </div>
          ))}
          <div className="ws-sheet__foot">
            <button
              type="button"
              className="ws-btn"
              onClick={() => {
                setIsMobileMoreOpen(false);
                onNavigate("notifications");
              }}
            >
              <BellIcon /> Updates
            </button>
            <button
              type="button"
              className="ws-btn"
              onClick={() => {
                setIsMobileMoreOpen(false);
                onNavigate("settings");
              }}
            >
              <SettingsIcon /> Settings
            </button>
            <ThemeToggle showLabel />
          </div>
        </div>
      </dialog>
    </>
  );
}
