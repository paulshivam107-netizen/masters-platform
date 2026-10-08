import React from "react";
import { Link } from "react-router-dom";
import Brand from "../common/Brand";
import ThemeToggle from "../common/ThemeToggle";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="public-topbar">
      <Brand />
      <nav className="public-nav" aria-label="Main navigation">
        <Link className="public-nav-link" to="/guides">
          Guides
        </Link>
        <Link className="public-nav-link" to="/help">
          Help
        </Link>
        <ThemeToggle />
        {user ? (
          <Link className="public-link-btn primary" to="/app/today">
            Workspace
          </Link>
        ) : (
          <>
            <Link
              className="public-nav-link public-login-link"
              to="/auth?mode=login&next=%2Fapp"
            >
              Sign in
            </Link>
            <Link
              className="public-link-btn primary"
              to="/auth?mode=signup&next=%2Fapp"
            >
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
