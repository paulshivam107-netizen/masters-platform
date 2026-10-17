import React from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../../app/icons";
import { ThemeSwitch, sectionHref } from "./SiteHeader";
import "./SiteChrome.css";

export default function SiteFooter({ home = false }) {
  return (
    <footer className="site-footer">
      <div className="site-frame">
        <div className="site-footer-top">
          <h2>Tell us what to fix in the pilot.</h2>
          <div className="site-footer-contact">
            <p>Questions, bugs or ideas?</p>
            <Link className="site-btn" to="/help">
              Write to us <ArrowIcon />
            </Link>
          </div>
        </div>
        <nav className="site-footer-cols" aria-label="Footer">
          <div>
            <h3>Explore</h3>
            <a href={sectionHref(home, "how_it_works")}>How it works</a>
            <a href={sectionHref(home, "routes")}>Routes</a>
            <Link to="/mba-interview-practice">MBA interview practice</Link>
          </div>
          <div>
            <h3>Product</h3>
            <Link to="/programs">Programmes</Link>
            <Link to="/auth?mode=login&next=%2Fapp">Sign in</Link>
            <Link to="/help">Privacy</Link>
          </div>
          <div>
            <h3>Resources</h3>
            <Link to="/guides">Guides</Link>
            <Link to="/guides/mba-application-checklist-india">Application checklist</Link>
            <Link to="/help">Getting started and help</Link>
          </div>
          <div>
            <h3>Say hello</h3>
            <Link to="/help">Contact and help</Link>
            <p>Made for MBA, EMBA and MiM applicants</p>
          </div>
        </nav>
        <div className="site-footer-bottom">
          <p>
            © 2026 Masters. Free during the pilot.
            <br />
            Masters is independent and not affiliated with any business school.
          </p>
          <ThemeSwitch />
        </div>
        <p className="site-wordmark" aria-hidden="true">
          masters.
        </p>
      </div>
    </footer>
  );
}
