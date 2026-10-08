import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowIcon, CheckIcon } from "../../app/icons";
import { guides, faqs } from "../../content/guides";
import PublicHeader from "./PublicHeader";
import Brand from "../common/Brand";
import "./PublicPages.css";

export function ResourceFooter() {
  return (
    <footer className="landing-footer">
      <Brand />
      <p>Your MBA applications, in one place.</p>
      <nav aria-label="Footer">
        <Link to="/guides">Guides</Link>
        <Link to="/help">Getting started & help</Link>
      </nav>
    </footer>
  );
}
export function PublicFaq() {
  return (
    <section className="public-faq" aria-labelledby="faq-heading">
      <span className="eyebrow">BEFORE YOU START</span>
      <h2 id="faq-heading">A few useful answers</h2>
      {faqs.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}
export function ResourceCta({
  next = "/app/today",
  children = "Create your application plan",
}) {
  const { user } = useAuth();
  return (
    <Link
      className="public-btn primary"
      to={user ? next : `/auth?mode=signup&next=${encodeURIComponent(next)}`}
    >
      {children}
      <ArrowIcon />
    </Link>
  );
}
export function GuideCards() {
  return (
    <div className="guide-grid">
      {guides.map((guide) => (
        <article className="public-card guide-card" key={guide.slug}>
          <span className="eyebrow">{guide.readingTime} · PRACTICAL GUIDE</span>
          <h2>
            <Link to={`/guides/${guide.slug}`}>{guide.title}</Link>
          </h2>
          <p>{guide.description}</p>
          <Link className="text-button" to={`/guides/${guide.slug}`}>
            Read the guide <ArrowIcon />
          </Link>
        </article>
      ))}
    </div>
  );
}
function ResourceShell({ children }) {
  return (
    <div className="public-page">
      <div className="public-shell">
        <PublicHeader />
        <main id="public-main">{children}</main>
        <ResourceFooter />
      </div>
    </div>
  );
}
export function GuidesPage() {
  return (
    <ResourceShell>
      <section className="resource-intro">
        <span className="eyebrow">INDIAN MBA APPLICATIONS</span>
        <h1>
          A little structure.
          <br />A clearer next step.
        </h1>
        <p>
          Practical guides and free templates for CAT-route, GMAT-route and
          executive MBA applications. Start with the part you need today.
        </p>
      </section>
      <GuideCards />
    </ResourceShell>
  );
}
export function GuidePage() {
  const { slug } = useParams();
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) return <NotFoundPage />;
  return (
    <ResourceShell>
      <article className="guide-article">
        <nav aria-label="Breadcrumb">
          <Link to="/guides">Guides</Link>
          <span aria-hidden="true"> / </span>
          <span>{guide.title}</span>
        </nav>
        <header>
          <span className="eyebrow">
            {guide.readingTime} · UPDATED{" "}
            <time dateTime={guide.updated}>8 October 2026</time>
          </span>
          <h1>{guide.title}</h1>
          <p className="guide-summary">{guide.summary}</p>
        </header>
        <nav className="guide-contents" aria-label="On this page">
          <strong>In this guide</strong>
          {guide.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>
        {guide.sections.map((section) => (
          <section id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <aside className="guide-download">
          <CheckIcon />
          <div>
            <h2>Make it your own</h2>
            <p>A blank template, with no email required.</p>
            <a className="text-button" download href={guide.template.href}>
              {guide.template.label} ↓
            </a>
          </div>
        </aside>
        <section className="guide-next">
          <h2>Put one step into practice</h2>
          <ResourceCta next={guide.next}>{guide.cta}</ResourceCta>
          <p>
            Free during the pilot. Check programme-specific instructions with
            your school.
          </p>
        </section>
        <Link className="text-button" to="/guides">
          Browse the other guide <ArrowIcon />
        </Link>
      </article>
    </ResourceShell>
  );
}
export function HelpPage() {
  return (
    <ResourceShell>
      <section className="resource-intro">
        <span className="eyebrow">GETTING STARTED</span>
        <h1>
          Your first useful
          <br />
          five minutes.
        </h1>
        <p>Start with one programme. Build the rest of your plan as you go.</p>
      </section>
      <div className="help-steps">
        {[
          [
            "01",
            "Add your first application",
            "Open Applications and add the school, exact programme and official application deadline. Keep the year and source URL in your notes. CAT registration and a school application may be separate steps.",
            "/app/tracker",
            "Add an application",
          ],
          [
            "02",
            "Save a draft, if your programme needs one",
            "Write a first paragraph in Essays and choose Save draft. You can return to it and save new versions. If you do not need an essay yet, move to interview notes instead. Unfinished forms can be recovered in this browser.",
            "/app/compose",
            "Start an essay",
          ],
          [
            "03",
            "Prepare one interview example",
            "Open Interviews to explore linked questions or try a short mock session. AI chat and turn-based voice are available when connected; otherwise, a labelled demo shows how the session works.",
            "/app/interviews",
            "Try interview practice",
          ],
          [
            "04",
            "Make your next visit easier",
            "Check Today for the next deadline and your latest drafts. Use Resources → Exports to download your application list or calendar file.",
            "/app/today",
            "Open Today",
          ],
        ].map(([number, title, detail, next, cta]) => (
          <article className="public-card" key={number}>
            <span className="eyebrow">STEP {number}</span>
            <h2>{title}</h2>
            <p>{detail}</p>
            <ResourceCta next={next}>{cta}</ResourceCta>
          </article>
        ))}
      </div>
      <PublicFaq />
      <section className="help-support public-card">
        <h2>Something feels confusing?</h2>
        <p>
          Open Settings → Help shape this space to send feedback. Include the
          page and what you expected to happen; leave passwords and private
          application documents out. Keep your own copies of important work
          during the pilot.
        </p>
        <p>
          Masters is an independent planning tool, not affiliated with an
          admissions office, exam provider or school.
        </p>
        <Link className="text-button" to="/app/settings">
          Open settings and feedback <ArrowIcon />
        </Link>
      </section>
    </ResourceShell>
  );
}
export function NotFoundPage() {
  return (
    <ResourceShell>
      <section className="resource-intro">
        <span className="eyebrow">PAGE NOT FOUND</span>
        <h1>
          Let’s get you
          <br />
          back on track.
        </h1>
        <p>This address doesn’t point to a page here.</p>
        <Link className="public-btn primary" to="/">
          Go to home <ArrowIcon />
        </Link>
        <Link className="text-button" to="/guides">
          Browse guides
        </Link>
      </section>
    </ResourceShell>
  );
}
