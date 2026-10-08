import React, { useEffect, useRef, useState } from "react";
import Brand from "../common/Brand";
import ThemeToggle from "../common/ThemeToggle";
import { BellIcon, CloseIcon, SettingsIcon } from "../../app/icons";

export default function SidebarNav({
  navGroups,
  activeNav,
  expandedNavGroups,
  onToggleGroup,
  onNavigate,
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
      className={`${mobile ? "mobile-nav-more-item" : "nav-drawer-item"} ${activeNav === item.id ? "active" : ""}`}
      data-testid={`${mobile ? "mobile-nav-overflow" : "nav-item"}-${item.id}`}
      aria-current={activeNav === item.id ? "page" : undefined}
      onClick={() => {
        setIsMobileMoreOpen(false);
        onNavigate(item.id);
      }}
    >
      <span className="nav-icon-glyph" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
  return (
    <>
      <aside className="nav-sidebar" data-testid="sidebar-nav">
        <Brand to="/app/today" onClick={() => onNavigate("home")} />
        <nav className="soft-nav-list" aria-label="Workspace navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.id}>
              {group.id === "core" ? (
                <p className="nav-group-label">Your workspace</p>
              ) : (
                <button
                  className="nav-group-toggle"
                  type="button"
                  aria-expanded={Boolean(expandedNavGroups[group.id])}
                  aria-controls={`nav-${group.id}`}
                  onClick={() => onToggleGroup(group.id)}
                  data-testid={`nav-group-${group.id}`}
                >
                  <span>{group.label}</span>
                  <span aria-hidden="true">
                    {expandedNavGroups[group.id] ? "−" : "+"}
                  </span>
                </button>
              )}
              {(group.id === "core" || expandedNavGroups[group.id]) && (
                <div className="nav-group-items" id={`nav-${group.id}`}>
                  {group.items.map((item) => navButton(item))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className={`nav-drawer-item ${activeNav === "settings" ? "active" : ""}`}
            onClick={() => onNavigate("settings")}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
          <ThemeToggle showLabel />
        </div>
      </aside>
      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
        data-testid="mobile-bottom-nav"
      >
        {primary.map((item) => (
          <button
            key={item.id}
            className={`mobile-bottom-nav-item ${activeNav === item.id ? "active" : ""}`}
            data-testid={`mobile-nav-item-${item.id}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>
              {item.id === "tracker"
                ? "Applications"
                : item.id === "interviews"
                  ? "Interviews"
                  : item.label}
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-bottom-nav-item ${!primary.some((item) => item.id === activeNav) ? "active" : ""}`}
          data-testid="mobile-nav-item-more"
          aria-haspopup="dialog"
          aria-expanded={isMobileMoreOpen}
          onClick={() => setIsMobileMoreOpen(true)}
        >
          <span className="more-icon" aria-hidden="true">
            ···
          </span>
          <span>More</span>
        </button>
      </nav>
      <dialog
        ref={dialogRef}
        className="mobile-nav-more-dialog"
        aria-labelledby="more-nav-title"
        onClose={() => setIsMobileMoreOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsMobileMoreOpen(false);
        }}
      >
        <div
          className="mobile-nav-more-sheet"
          data-testid="mobile-nav-more-overlay"
        >
          <header>
            <h2 id="more-nav-title">Your workspace</h2>
            <button
              className="icon-button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileMoreOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>
          {overflow.map((group) => (
            <div key={group.id}>
              <p className="nav-group-label">{group.label}</p>
              <div className="mobile-nav-more-items">
                {group.items.map((item) => navButton(item, true))}
              </div>
            </div>
          ))}
          <div className="mobile-sheet-footer">
            <button
              className="secondary-action-btn"
              onClick={() => {
                setIsMobileMoreOpen(false);
                onNavigate("notifications");
              }}
            >
              <BellIcon /> Updates
            </button>
            <button
              className="secondary-action-btn"
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
