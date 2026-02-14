import React from 'react';
import { BrandLogoIcon, MoonIcon, SunIcon } from '../../app/icons';

function SidebarNav({
  navGroups,
  activeNav,
  expandedNavGroups,
  onToggleGroup,
  onNavigate,
  isDarkMode,
  onToggleTheme
}) {
  return (
    <div className="nav-sidebar soft-sidebar" data-testid="sidebar-nav">
      <div className="sidebar-brand" aria-hidden="true">
        <span className="sidebar-brand-mark">
          <span className="sidebar-brand-logo">
            <BrandLogoIcon />
          </span>
          <span className="sidebar-brand-text" data-testid="sidebar-brand-title">Dashboard</span>
        </span>
      </div>
      <div className="nav-drawer soft-nav-drawer open" aria-hidden={false}>
        <div className="nav-drawer-list soft-nav-list">
          {navGroups.map((group) => (
            <div key={`group-${group.id}`} className="nav-group">
              <button
                type="button"
                className={`nav-group-toggle ${expandedNavGroups[group.id] ? 'open' : ''}`}
                data-testid={`nav-group-${group.id}`}
                onClick={() => onToggleGroup(group.id)}
              >
                <span>{group.label}</span>
                <span className="nav-group-chevron" aria-hidden="true">
                  {expandedNavGroups[group.id] ? '▾' : '▸'}
                </span>
              </button>
              {expandedNavGroups[group.id] && (
                <div className="nav-group-items">
                  {group.items.map((item) => (
                    <button
                      key={`drawer-${item.id}`}
                      type="button"
                      className={`nav-drawer-item soft-nav-item ${activeNav === item.id ? 'active' : ''}`}
                      data-testid={`nav-item-${item.id}`}
                      onClick={() => onNavigate(item.id)}
                    >
                      <span className="nav-icon-glyph" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-theme-slot">
        <button
          type="button"
          className={`app-theme-toggle ${isDarkMode ? 'app-theme-toggle--dark' : 'app-theme-toggle--light'}`}
          data-testid="sidebar-theme-toggle"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDarkMode}
          onClick={onToggleTheme}
        >
          <span className="app-theme-toggle__thumb" aria-hidden="true" />
          <span className="app-theme-toggle__icon app-theme-toggle__icon--light" aria-hidden="true">
            <SunIcon />
          </span>
          <span className="app-theme-toggle__icon app-theme-toggle__icon--dark" aria-hidden="true">
            <MoonIcon />
          </span>
        </button>
      </div>
    </div>
  );
}

export default SidebarNav;
