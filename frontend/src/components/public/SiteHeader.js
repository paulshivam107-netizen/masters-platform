import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import Brand from "../common/Brand";
import "./SiteChrome.css";

/* On the landing page the section links are in-page anchors; everywhere else
   they point back to the landing page so they work from any route. */
export function sectionHref(home, id) {
  return home ? `#${id}` : `/#${id}`;
}

export function ThemeSwitch() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  return (
    <button
      type="button"
      className="site-theme"
      aria-pressed={isDarkMode}
      aria-label="Dark mode"
      onClick={() => setIsDarkMode(!isDarkMode)}
    >
      <span className={isDarkMode ? "" : "is-active"}>Light</span>
      {" / "}
      <span className={isDarkMode ? "is-active" : ""}>Dark</span>
    </button>
  );
}

/* home: rendered on the landing page itself.
   current: "guides" | "signin" marks the matching link aria-current="page". */
export default function SiteHeader({ home = false, current = "" }) {
  const { user } = useAuth();
  const mark = (name) => (current === name ? "page" : undefined);
  return (
    <header className="site-header">
      <div className="site-frame site-header-row">
        <nav className="site-nav" aria-label="Main navigation">
          <a
            className="site-nav-section"
            href={sectionHref(home, "how_it_works")}
          >
            How it works
          </a>
          <a className="site-nav-section" href={sectionHref(home, "routes")}>
            Routes
          </a>
          <Link
            className="site-nav-section"
            to="/guides"
            aria-current={mark("guides")}
          >
            Guides
          </Link>
          {user ? (
            <Link to="/app/today">Open workspace</Link>
          ) : (
            <Link
              to="/auth?mode=login&next=%2Fapp"
              aria-current={mark("signin")}
            >
              Sign in
            </Link>
          )}
        </nav>
        <div className="site-header-theme">
          <ThemeSwitch />
        </div>
        <div className="site-header-brand">
          <Brand />
        </div>
        <p className="site-pilot">
          <strong>Free during the pilot</strong>
          For MBA, EMBA and MiM applicants
        </p>
      </div>
    </header>
  );
}
