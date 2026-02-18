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
  const [isMobileMoreOpen, setIsMobileMoreOpen] = React.useState(false);
  const navItems = React.useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupLabel: group.label
        }))
      ),
    [navGroups]
  );
  const primaryMobileIds = React.useMemo(() => new Set(['home', 'essays', 'tracker', 'deadlines']), []);
  const primaryMobileItems = navItems.filter((item) => primaryMobileIds.has(item.id));
  const overflowMobileItems = navItems.filter((item) => !primaryMobileIds.has(item.id));

  const overflowByGroup = React.useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !primaryMobileIds.has(item.id))
        }))
        .filter((group) => group.items.length > 0),
    [navGroups, primaryMobileIds]
  );

  React.useEffect(() => {
    setIsMobileMoreOpen(false);
  }, [activeNav]);

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

      <div className="mobile-bottom-nav" data-testid="mobile-bottom-nav">
        {primaryMobileItems.map((item) => (
          <button
            key={`mobile-primary-${item.id}`}
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}
            data-testid={`mobile-nav-item-${item.id}`}
            onClick={() => {
              setIsMobileMoreOpen(false);
              onNavigate(item.id);
            }}
            aria-label={item.label}
          >
            <span className="nav-icon-glyph" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-bottom-nav-item mobile-bottom-nav-item--more ${isMobileMoreOpen ? 'active' : ''}`}
          data-testid="mobile-nav-item-more"
          aria-haspopup="dialog"
          aria-expanded={isMobileMoreOpen}
          onClick={() => setIsMobileMoreOpen((prev) => !prev)}
          aria-label="More navigation options"
        >
          <span className="mobile-more-glyph" aria-hidden="true">⋯</span>
          <span className="mobile-bottom-nav-label">More</span>
        </button>
      </div>

      {isMobileMoreOpen && (
        <div className="mobile-nav-more-overlay" role="dialog" aria-modal="true" data-testid="mobile-nav-more-overlay">
          <button
            type="button"
            className="mobile-nav-more-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMoreOpen(false)}
          />
          <div className="mobile-nav-more-sheet">
            <header className="mobile-nav-more-header">
              <strong>More</strong>
              <button
                type="button"
                className="mobile-nav-more-close"
                onClick={() => setIsMobileMoreOpen(false)}
                aria-label="Close navigation menu"
              >
                Close
              </button>
            </header>
            {overflowByGroup.map((group) => (
              <div key={`mobile-overflow-group-${group.id}`} className="mobile-nav-more-group">
                <p className="mobile-nav-more-group-label">{group.label}</p>
                <div className="mobile-nav-more-items">
                  {group.items.map((item) => (
                    <button
                      key={`mobile-overflow-item-${item.id}`}
                      type="button"
                      className={`mobile-nav-more-item ${activeNav === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setIsMobileMoreOpen(false);
                        onNavigate(item.id);
                      }}
                      data-testid={`mobile-nav-overflow-${item.id}`}
                    >
                      <span className="nav-icon-glyph" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {overflowMobileItems.length > 0 && (
              <div className="mobile-nav-theme-row">
                <button type="button" className="mobile-nav-theme-toggle-btn" onClick={onToggleTheme}>
                  Switch to {isDarkMode ? 'Light' : 'Dark'} mode
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SidebarNav;
