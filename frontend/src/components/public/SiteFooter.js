import React from "react";
import { Link } from "react-router-dom";
import { ThemeSwitch, sectionHref } from "./SiteHeader";
import { contactEmail } from "../../content/site";
import "./SiteChrome.css";

export default function SiteFooter({ home = false }) {
  return (
    <footer className="site-footer">
      <div className="site-frame">
        <nav className="site-footer-cols" aria-label="Footer">
          <div>
            <h3>Explore</h3>
            <a href={sectionHref(home, "how_it_works")}>How it works</a>
            <a href={sectionHref(home, "routes")}>Routes</a>
            <Link to="/mba-interview-practice">MBA interview practice</Link>
          </div>
          <div>
            <h3>Product</h3>
            <Link to="/auth?mode=login&next=%2Fapp%2Finterviews">Sign in</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div>
            <h3>Resources</h3>
            <Link to="/guides">Guides</Link>
            <Link to="/schools">Schools</Link>
            <Link to="/guides/mba-application-checklist-india">
              Application checklist
            </Link>
            <Link to="/help">Getting started and help</Link>
          </div>
          <div>
            <h3>Say hello</h3>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            <Link to="/help">Getting started and help</Link>
            <p>Made for MBA, EMBA and MiM applicants</p>
          </div>
        </nav>
        <div className="site-footer-bottom">
          <p>
            © 2026 MockMBA. Free during the pilot.
            <br />
            MockMBA is independent and not affiliated with any business school.
          </p>
          <ThemeSwitch />
        </div>
        <p className="site-wordmark" aria-hidden="true">
          mockMBA.
        </p>
      </div>
    </footer>
  );
}
