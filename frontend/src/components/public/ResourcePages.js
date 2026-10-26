import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowIcon, CheckIcon } from "../../app/icons";
import { guides, faqs } from "../../content/guides";
import { practice } from "../../content/practice";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { LandingPhoto } from "./LandingPanels";
import { schoolGroups } from "../../content/schools";
import { contactEmail } from "../../content/site";
import FocusedPractice from "../views/workspace/FocusedPractice";
import "../views/Workspace.css";
import "../views/workspace/InterviewStudio.css";
import "./PublicPages.css";
import "./ResourcePages.css";

function Eyebrow({ children }) {
  return (
    <p className="rp-eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

const CATEGORIES = {
  "mba-application-checklist-india": "Indian MBA routes",
  "mba-interview-story-bank": "Interview preparation",
  "mba-interview-from-resume": "Interview preparation",
  "mba-interview-for-freshers": "Early-career route",
  "mba-interview-work-experience": "Experienced route",
};
const categoryOf = (slug) => CATEGORIES[slug] || "Practical guide";

export function PublicFaq() {
  return (
    <section className="rp-faq" aria-labelledby="faq-heading">
      <div className="rp-frame rp-faq-grid">
        <div>
          <Eyebrow>Before you start</Eyebrow>
        </div>
        <div>
          <h2 id="faq-heading">A few useful answers</h2>
          <div className="rp-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span className="rp-faq-icon" aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
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
      className="rp-btn"
      to={user ? next : `/auth?mode=signup&next=${encodeURIComponent(next)}`}
    >
      {children}
      <ArrowIcon />
    </Link>
  );
}
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
// Deterministic (no locale/ICU dependency) so prerendered and client HTML match.
export function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}
function GuideCard({ guide, featured = false }) {
  return (
    <article className={`rp-card${featured ? " rp-card--featured" : ""}`}>
      <div className="rp-card-text">
        <p className="rp-category">
          <span aria-hidden="true" /> {categoryOf(guide.slug)}
        </p>
        <h2>
          <Link to={`/guides/${guide.slug}`}>{guide.title}</Link>
        </h2>
        <p className="rp-meta">
          {guide.readingTime} read · Updated {formatDate(guide.updated)}
        </p>
        <p className="rp-card-summary">{guide.description}</p>
        <Link className="rp-link" to={`/guides/${guide.slug}`}>
          Read the guide <ArrowIcon />
        </Link>
      </div>
      {featured && (
        <div className="rp-card-photo">
          <LandingPhoto
            id="photo_resume_printout"
            alt="A laptop and printed résumé on a wooden desk"
            width={1600}
            height={900}
          />
        </div>
      )}
    </article>
  );
}
export function GuideCards() {
  const featured = guides.find((g) => g.slug === "mba-interview-from-resume");
  const rest = guides.filter((g) => g !== featured);
  return (
    <div className="rp-guide-grid">
      {featured && <GuideCard guide={featured} featured />}
      {rest.map((guide) => (
        <GuideCard guide={guide} key={guide.slug} />
      ))}
    </div>
  );
}
export function RelatedLinks({ links, heading = "Related reading" }) {
  if (!links?.length) return null;
  return (
    <nav className="rp-related" aria-label={heading}>
      <h2>{heading}</h2>
      <ul>
        {links.map(([href, label]) => (
          <li key={href}>
            <Link to={href}>
              {label} <ArrowIcon />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
export function ExampleBlock({ example }) {
  return (
    <figure className="rp-example">
      <figcaption>{example.label}</figcaption>
      <dl>
        {example.lines.map(([who, text], index) => (
          <div key={index}>
            <dt>{who}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      {example.note && <p className="rp-example-note">{example.note}</p>}
    </figure>
  );
}
function GuideSection({ section }) {
  const List = section.ordered ? "ol" : "ul";
  return (
    <section id={section.id}>
      <h2>{section.title}</h2>
      {section.paragraphs?.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {section.example && <ExampleBlock example={section.example} />}
      {section.after?.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {section.ladder && (
        <ol className="rp-ladder">
          {section.ladder.map((step) => (
            <li key={step.level}>
              <h3>{step.level}</h3>
              <p className="rp-ladder-purpose">{step.purpose}</p>
              <ul>
                {step.questions.map((q) => (
                  <li key={q}>“{q}”</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {section.list && (
        <List>
          {section.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      )}
      {section.closing?.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </section>
  );
}
export function ResourceShell({ children, current = "" }) {
  return (
    <div className="rp-page">
      <SiteHeader current={current} />
      <main id="public-main" className="rp">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
export function SchoolList({ heading = "Schools" }) {
  return (
    <div className="sp-regions" aria-label={heading}>
      {schoolGroups().map((group) => (
        <section key={group.id} aria-labelledby={`region-${group.id}`}>
          <h3 className="sp-region" id={`region-${group.id}`}>
            {group.heading}
          </h3>
          <ul className="sp-list">
            {group.items.map(({ school, programmes }) => (
              <li key={school.slug}>
                <Link to={`/schools/${school.slug}`}>
                  <strong>{school.shortName}</strong>
                  <span>
                    {programmes.map((p) => p.name).join(", ")} · {school.city}
                  </span>
                  <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function GuidesPage() {
  return (
    <ResourceShell current="guides">
      <section className="rp-hero">
        <div className="rp-frame rp-hero-grid">
          <div className="rp-hero-copy">
            <Eyebrow>Guides and templates</Eyebrow>
            <h1>
              A little structure.
              <br />A clearer next step.
            </h1>
            <p className="rp-lead">
              Practical guides and free templates for MBA, EMBA and MiM
              interviews and applications. Start with the part you need today.
            </p>
            <Link className="rp-link" to="/mba-interview-practice">
              See how résumé-based interview practice works <ArrowIcon />
            </Link>
          </div>
          <div className="rp-hero-photo">
            <LandingPhoto
              id="photo_practice_at_laptop"
              alt="A young woman practising on a laptop outdoors"
              width={1920}
              height={1280}
              eager
            />
          </div>
        </div>
      </section>
      <section className="rp-library" aria-label="All guides">
        <div className="rp-frame">
          <GuideCards />
        </div>
      </section>
      <section className="rp-library" aria-label="School interview pages">
        <div className="rp-frame">
          <h2 className="rp-section-title">Schools</h2>
          <SchoolList />
        </div>
      </section>
    </ResourceShell>
  );
}

export function ArticleLayout({
  eyebrow,
  title,
  summary,
  toc,
  children,
  header,
  tocLabel = "In this guide",
}) {
  return (
    <article className="rp-article">
      <header className="rp-article-head">
        <div className="rp-frame">
          {header}
          <p className="rp-eyebrow">
            <span aria-hidden="true" />
            <span>{eyebrow}</span>
          </p>
          <h1>{title}</h1>
          <p className="rp-lead rp-summary">{summary}</p>
        </div>
      </header>
      <div className="rp-frame rp-article-grid">
        <nav className="rp-toc" aria-label="On this page">
          <strong>{tocLabel}</strong>
          <ol>
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="rp-prose">{children}</div>
      </div>
    </article>
  );
}

function ClosingCta({ heading, next, cta, note }) {
  return (
    <section className="rp-closing">
      <div className="rp-frame rp-closing-inner">
        <h2>{heading}</h2>
        <p>{note}</p>
        <ResourceCta next={next}>{cta}</ResourceCta>
      </div>
    </section>
  );
}

export function GuidePage() {
  const { slug } = useParams();
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) return <NotFoundPage />;
  return (
    <ResourceShell current="guides">
      <ArticleLayout
        header={
          <nav className="rp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/guides">Guides</Link>
            <span aria-hidden="true"> / </span>
            <span>{guide.title}</span>
          </nav>
        }
        eyebrow={
          <>
            {categoryOf(guide.slug)} · {guide.readingTime} · Updated{" "}
            <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
          </>
        }
        title={guide.title}
        summary={guide.summary}
        toc={guide.sections.map((s) => [s.id, s.title])}
      >
        {guide.sections.map((section) => (
          <GuideSection section={section} key={section.id} />
        ))}
        {guide.template && (
          <aside className="rp-callout">
            <CheckIcon />
            <div>
              <h2>Make it your own</h2>
              <p>A blank template, with no email required.</p>
              <a className="rp-link" download href={guide.template.href}>
                {guide.template.label} ↓
              </a>
            </div>
          </aside>
        )}
        <RelatedLinks links={guide.related} />
        <Link className="rp-link" to="/guides">
          Browse all guides <ArrowIcon />
        </Link>
      </ArticleLayout>
      <ClosingCta
        heading="Put one step into practice"
        next={guide.next}
        cta={guide.cta}
        note="Free during the pilot. Check programme-specific instructions with your school."
      />
    </ResourceShell>
  );
}

const HELP_STEPS = [
  [
    "01",
    "Add your first application",
    "Open Applications and add the school, exact programme and official application deadline. Keep the year and source URL in your notes. An entrance test registration and a school application are often separate steps.",
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
];
export function HelpPage() {
  return (
    <ResourceShell>
      <section className="rp-hero rp-hero--text">
        <div className="rp-frame">
          <div className="rp-hero-copy">
            <Eyebrow>Getting started</Eyebrow>
            <h1>
              Your first useful
              <br />
              five minutes.
            </h1>
            <p className="rp-lead">
              Start with one programme. Build the rest of your plan as you go.
            </p>
          </div>
        </div>
      </section>
      <section className="rp-steps" aria-label="Getting started steps">
        <div className="rp-frame">
          <ol className="rp-step-list">
            {HELP_STEPS.map(([number, title, detail, next, cta]) => (
              <li className="rp-step" key={number}>
                <span className="rp-step-num" aria-hidden="true">
                  {number}
                </span>
                <div>
                  <p className="rp-category">
                    <span aria-hidden="true" /> Step {number}
                  </p>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                  <ResourceCta next={next}>{cta}</ResourceCta>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <PublicFaq />
      <section className="rp-support" aria-labelledby="support-heading">
        <div className="rp-frame rp-support-inner">
          <h2 id="support-heading">Something feels confusing?</h2>
          <div>
            <p>
              Write to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>,
              or, once signed in, open Settings → Help shape this space. Include
              the page and what you expected to happen; leave passwords and
              private application documents out. Keep your own copies of
              important work during the pilot.
            </p>
            <p>
              MockMBA is an independent planning tool, not affiliated with an
              admissions office, exam provider or school.
            </p>
            <Link className="rp-link" to="/app/settings">
              Open settings and feedback <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </ResourceShell>
  );
}
const PRIVACY_UPDATED = "2026-10-17";
const PRIVACY_TOC = [
  ["what-we-store", "What we store"],
  ["what-we-dont", "What we don't store"],
  ["ai", "How AI is used"],
  ["providers", "Who helps us run MockMBA"],
  ["browser", "Cookies and browser storage"],
  ["your-choices", "Export, edit or delete"],
  ["contact", "Questions and changes"],
];

export function PrivacyPage() {
  return (
    <ResourceShell>
      <ArticleLayout
        eyebrow={`Privacy · Updated ${formatDate(PRIVACY_UPDATED)}`}
        title="Your data on MockMBA"
        summary="What MockMBA stores, why, who processes it and how to take it with you or delete it. Written for the pilot in plain language."
        toc={PRIVACY_TOC}
        tocLabel="On this page"
      >
        <section id="what-we-store">
          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your account:</strong> email address, name, and either a
              securely hashed password or your Google sign-in. Profile details
              you choose to add, such as target intake, countries, currency,
              timezone, a short bio and a notification email.
            </li>
            <li>
              <strong>Your work:</strong> the applications, deadlines,
              checklists and essays (with their versions) you save.
            </li>
            <li>
              <strong>Your practice:</strong> each mock interview's setup, the
              questions, your answers as text, and the debrief. For résumé-based
              practice we keep the questions and the short résumé excerpts they
              are based on. Any optional extra context you add, such as SOP or
              essay excerpts, is saved with that interview.
            </li>
            <li>
              <strong>Feedback you send</strong> from Settings.
            </li>
            <li>
              <strong>Product events</strong> linked to your account, such as
              "interview started", so we can see which parts of the pilot help.
            </li>
            <li>
              <strong>Security and cost records:</strong> sign-in sessions,
              one-time email links, short-lived rate-limit counters that use
              your IP address, and the cost of each AI request.
            </li>
          </ul>
        </section>
        <section id="what-we-dont">
          <h2>What we don't store</h2>
          <ul>
            <li>
              Your original résumé file and its full text. You review the text
              before anything is sent, and only the questions and short excerpts
              are kept.
            </li>
            <li>
              Voice recordings. Audio is sent for transcription and then
              discarded; only the text of your answer is saved.
            </li>
            <li>
              No advertising, no third-party analytics or tracking cookies, and
              we don't sell your data.
            </li>
          </ul>
        </section>
        <section id="ai">
          <h2>How AI is used</h2>
          <p>
            When you run an AI interview or generate résumé questions, the text
            needed for that step (the programme you chose, your answers, any
            extra context you added, and the résumé text you reviewed) goes to
            OpenAI to draft questions, follow-ups and the debrief. Voice answers
            are transcribed by OpenAI, including answers you dictate. We send
            these requests with OpenAI's storage option turned off.
          </p>
          <p>
            AI output can be wrong. It is practice material, not an admissions
            assessment, and it does not predict any outcome.
          </p>
        </section>
        <section id="providers">
          <h2>Who helps us run MockMBA</h2>
          <p>These services process data on our behalf, only to run MockMBA:</p>
          <ul>
            <li>
              <strong>Neon:</strong> the database, hosted in Singapore.
            </li>
            <li>
              <strong>Railway:</strong> the application server, currently in the
              United States.
            </li>
            <li>
              <strong>Cloudflare:</strong> the website and the mockmba.com
              domain.
            </li>
            <li>
              <strong>Resend:</strong> account and reminder emails.
            </li>
            <li>
              <strong>OpenAI:</strong> AI interviews, résumé questions and
              transcription.
            </li>
            <li>
              <strong>Google:</strong> only if you choose to sign in with
              Google.
            </li>
          </ul>
        </section>
        <section id="browser">
          <h2>Cookies and browser storage</h2>
          <p>
            MockMBA sets one cookie that keeps you signed in. Your browser also
            stores your theme and motion settings, unsent drafts, and the
            interview preparation notes marked "saved in this browser". Those
            notes stay on your device; clearing your browser data removes them.
          </p>
        </section>
        <section id="your-choices">
          <h2>Export, edit or delete</h2>
          <ul>
            <li>
              <strong>Export:</strong> Settings → Your data → Download my data
              gives you a JSON file of what we hold for your account.
            </li>
            <li>
              <strong>Edit:</strong> change your profile, applications and
              essays at any time.
            </li>
            <li>
              <strong>Delete:</strong> Settings → Your data → Delete my account
              permanently removes your account and your work. We keep only
              records with no link to you: a count of deleted items and AI cost
              totals. Database backups that already contain your data expire on
              their normal schedule.
            </li>
          </ul>
        </section>
        <section id="contact">
          <h2>Questions and changes</h2>
          <p>
            MockMBA is an independent pilot, not affiliated with any business
            school, exam body or admissions office. For a privacy question or
            request, write to{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>, or use
            Settings → Help shape this space while signed in.
          </p>
          <p>
            We will update this page when anything changes, and the date at the
            top shows the latest version.
          </p>
        </section>
      </ArticleLayout>
    </ResourceShell>
  );
}

export function NotFoundPage() {
  return (
    <ResourceShell>
      <section className="rp-notfound">
        <div className="rp-frame rp-notfound-inner">
          {/* Drawn via CSS so the faint decorative numeral isn't text for contrast checks. */}
          <p className="rp-notfound-code" aria-hidden="true" data-code="404" />
          <Eyebrow>Page not found</Eyebrow>
          <h1>
            Let’s get you
            <br />
            back on track.
          </h1>
          <p className="rp-lead">This address doesn’t point to a page here.</p>
          <div className="rp-actions">
            <Link className="rp-btn" to="/">
              Go to home <ArrowIcon />
            </Link>
            <Link className="rp-btn rp-btn--ghost" to="/guides">
              Browse guides
            </Link>
          </div>
          <ul className="rp-notfound-links">
            <li>
              <Link to="/mba-interview-practice">Interview practice</Link>
            </li>
            <li>
              <Link to="/help">Help</Link>
            </li>
          </ul>
        </div>
      </section>
    </ResourceShell>
  );
}

export function PracticePage() {
  const { how, example, routes, limits, privacy } = practice;
  return (
    <ResourceShell>
      <ArticleLayout
        eyebrow={
          <>
            Interview practice · Updated{" "}
            <time dateTime={practice.updated}>
              {formatDate(practice.updated)}
            </time>
          </>
        }
        title="Practise MBA interviews that follow your résumé"
        summary={practice.answer}
        header={null}
        toc={[
          ["how-it-works", how.title],
          ["try", "Try one question now"],
          ["example", "A short example"],
          ["routes", routes.title],
          ["limits", limits.title],
          ["privacy", privacy.title],
        ]}
      >
        <section id="how-it-works">
          <h2>{how.title}</h2>
          <ol>
            {how.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{how.note}</p>
        </section>
        <section id="try">
          <h2>Try one question now</h2>
          <p>
            No account needed. Pick a question, record your answer, listen back
            and try again. Recordings stay in your browser; nothing is uploaded
            and no AI is involved.
          </p>
          <div className="rp-try">
            <FocusedPractice defaultOpen />
          </div>
        </section>
        <section id="example">
          <h2>A short example</h2>
          <p>{example.intro}</p>
          <ExampleBlock example={example} />
        </section>
        <section id="routes">
          <h2>{routes.title}</h2>
          <div className="rp-routes">
            {routes.items.map(([name, text, href, label]) => (
              <div className="rp-route" key={name}>
                <h3>{name}</h3>
                <p>{text}</p>
                <Link className="rp-link" to={href}>
                  {label} <ArrowIcon />
                </Link>
              </div>
            ))}
          </div>
          <p>{routes.note}</p>
        </section>
        <section id="limits">
          <h2>{limits.title}</h2>
          <ul>
            {limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section id="privacy">
          <h2>{privacy.title}</h2>
          <ul>
            {privacy.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{privacy.note}</p>
        </section>
        <RelatedLinks links={practice.related} />
      </ArticleLayout>
      <ClosingCta
        heading="Try it on your own résumé"
        next={practice.next}
        cta={practice.cta}
        note="Questions are drafted by AI during a pilot. They are practice material, not a prediction of any admission outcome."
      />
    </ResourceShell>
  );
}
