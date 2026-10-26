import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { trackEvent } from "../../app/telemetry";
import {
  ArrowIcon,
  BrandLogoIcon,
  InterviewIcon,
  PlusIcon,
  ShareIcon,
} from "../../app/icons";
import { guides, faqs } from "../../content/guides";
import { practice } from "../../content/practice";
import Brand from "../common/Brand";
import { formatDate } from "./ResourcePages";
import {
  EssayPanel,
  HistoryPanel,
  LandingPhoto,
  StepPreview,
  TrackerPanel,
} from "./LandingPanels";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import "./PublicPages.css";
import LiveInterview from "./LiveInterview";
import { DebriefSpotlight, SchoolBand } from "./LandingBands";

const SIGNUP_PATH = "/auth?mode=signup&next=%2Fapp%2Finterviews";

function buildDemoReview(prompt, draft) {
  const trimmedPrompt = (prompt || "").trim();
  const trimmedDraft = (draft || "").trim();
  const wordCount = trimmedDraft
    ? trimmedDraft.split(/\s+/).filter(Boolean).length
    : 0;
  const sentenceCount = trimmedDraft
    ? trimmedDraft.split(/[.!?]+/).filter((s) => s.trim()).length
    : 0;
  const avgSentenceLength = sentenceCount
    ? Math.round(wordCount / sentenceCount)
    : 0;
  const hasNumbers = /\d/.test(trimmedDraft);
  const hasPersonalVoice = /\b(I|my|me)\b/i.test(trimmedDraft);
  const hasProgramWhy = /\b(program|school|mba|masters|university)\b/i.test(
    trimmedDraft,
  );

  const strengths = [];
  const improvements = [];

  if (wordCount >= 180) {
    strengths.push(
      "Draft has enough substance to evaluate narrative and clarity.",
    );
  } else {
    improvements.push(
      "Add detail: target at least 180-220 words for useful review depth.",
    );
  }

  if (hasPersonalVoice) {
    strengths.push("Personal voice is visible, which helps authenticity.");
  } else {
    improvements.push(
      "Use first-person examples to make the response feel specific and personal.",
    );
  }

  if (hasNumbers) {
    strengths.push(
      "Includes concrete facts or metrics, which improves credibility.",
    );
  } else {
    improvements.push(
      "Add one measurable detail (result, timeline, or scope).",
    );
  }

  if (hasProgramWhy) {
    strengths.push(
      "Mentions program fit, which aligns well with admissions expectations.",
    );
  } else if (trimmedPrompt) {
    improvements.push("Tie your story back to program fit and why now.");
  }

  if (avgSentenceLength > 22) {
    improvements.push("Shorten long sentences to improve readability.");
  } else if (avgSentenceLength >= 10) {
    strengths.push("Sentence length is balanced and readable.");
  }

  return {
    wordCount,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 4),
  };
}

// Elements marked data-reveal rise and fade in once, the first time they scroll into view.
// Only elements that start below the viewport are hidden, and only after JavaScript runs, so
// the prerendered page and no-JS visitors always see the final state.
function useReveal(rootRef) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.reducedMotion === "true";
    if (reduced) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.classList.add("is-pending");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [rootRef]);
}

function useCompact() {
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return compact;
}

// Signed-out visitors can rehearse one question in the browser first (no AI, no account).
function TryLink() {
  const { user } = useAuth();
  return user ? (
    <a className="lp-link" href="#how_it_works">
      See how a session works <ArrowIcon />
    </a>
  ) : (
    <Link className="lp-link" to="/mba-interview-practice#try">
      Try one question, no sign-up <ArrowIcon />
    </Link>
  );
}

function StartButton({ location, className = "" }) {
  const { user } = useAuth();
  return (
    <Link
      className={`lp-btn ${className}`.trim()}
      to={user ? "/app/interviews" : SIGNUP_PATH}
      onClick={() =>
        trackEvent("public_cta_clicked", { location, signedIn: Boolean(user) })
      }
    >
      Start a mock interview
      <ArrowIcon />
    </Link>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="lp-eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

const STEPS = [
  {
    title: "Add your résumé",
    text: "Upload it or paste the text. MockMBA picks out the lines a panel is most likely to ask about.",
  },
  {
    title: "Answer the opening question",
    text: "The first question starts from something you wrote. Type your answer, or speak it where your browser supports voice.",
  },
  {
    title: "Meet the follow-up",
    text: "The next question quotes what you just said and asks for more: how you measured it, what you would change.",
  },
  {
    title: "Read your debrief",
    text: "See what worked, what to tighten and one exercise for your next attempt. Transcripts can be exported or deleted.",
  },
];

function HowItWorks() {
  const compact = useCompact();
  const [active, setActive] = React.useState(2);
  const buttons = React.useRef([]);
  const onKeyDown = (event, index) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next =
      (index + (event.key === "ArrowDown" ? 1 : STEPS.length - 1)) %
      STEPS.length;
    buttons.current[next]?.focus();
  };
  return (
    <section className="lp-how" id="how_it_works" aria-labelledby="how-heading">
      <div className="lp-frame">
        <header className="lp-how-head">
          <Eyebrow>How a session works</Eyebrow>
          <h2 id="how-heading">Your résumé in. A debrief out.</h2>
          <p>
            Type your answers, or speak them where your browser supports voice.
            Every session saves a transcript you can export or delete.
          </p>
        </header>
        <div className="lp-how-body">
          <ol className="lp-steps" data-reveal>
            {STEPS.map((step, index) => {
              const open = compact || active === index;
              return (
                <li
                  key={step.title}
                  className={open ? "is-open" : ""}
                  style={{ "--i": index }}
                >
                  <span className="lp-step-number">0{index + 1}</span>
                  <div className="lp-step-main">
                    <h3>
                      {compact ? (
                        step.title
                      ) : (
                        <button
                          type="button"
                          className="lp-step-title"
                          aria-expanded={open}
                          aria-controls={`step-text-${index}`}
                          ref={(node) => {
                            buttons.current[index] = node;
                          }}
                          onClick={() => setActive(index)}
                          onKeyDown={(event) => onKeyDown(event, index)}
                        >
                          {step.title}
                          <span className="lp-step-pill" aria-hidden="true">
                            <ArrowIcon />
                          </span>
                        </button>
                      )}
                    </h3>
                    <p id={`step-text-${index}`} className="lp-step-text">
                      {step.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {!compact && (
            <div className="lp-how-card">
              <StepPreview index={active} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Closeup() {
  return (
    <section className="lp-closeup" aria-labelledby="closeup-heading">
      <div className="lp-frame">
        <div className="lp-bento" data-reveal>
          <article className="lp-card lp-card--dark lp-card-a">
            <header>
              <Eyebrow>Illustrative example</Eyebrow>
              <p className="lp-card-title">Mock interview</p>
              <p>
                Mock interview, question 2 of 5. Illustrative example, not a
                real applicant.
              </p>
            </header>
            <h2 className="lp-display" id="closeup-heading">
              “six weeks to two”
            </h2>
            <figure
              className="lp-exchange"
              aria-label="Example exchange from a mock interview"
            >
              <p className="lp-turn lp-turn--panel">
                <span>Interviewer</span>
                Your résumé says you cleared a vendor payment backlog. What was
                the first thing you did?
              </p>
              <p className="lp-turn lp-turn--you">
                <span>Your answer</span>I sorted the unpaid invoices by vendor,
                cleared the oldest first and agreed a weekly payment run, so the
                backlog fell from six weeks to two.
              </p>
              <p className="lp-turn lp-turn--panel lp-turn--followup">
                <span>Follow-up</span>
                <q>six weeks to two.</q> How did you measure that, and what
                would you do differently now?
              </p>
            </figure>
            <footer>
              <Link
                className="lp-link lp-link--light"
                to="/mba-interview-practice"
              >
                See a full session <ArrowIcon />
              </Link>
              <strong>Every follow-up builds on what you just said.</strong>
            </footer>
          </article>
          <article className="lp-card lp-card-b">
            <h3 className="lp-label">What the follow-up did</h3>
            <p className="lp-card-display">
              Quoted your answer. Asked how you measured it.
            </p>
            <h3 className="lp-label">What it asks next</h3>
            <p className="lp-card-display">
              What would you do differently now?
            </p>
            <div className="lp-card-b-foot">
              <h3 className="lp-label">Your answer</h3>
              <p>
                I sorted the unpaid invoices by vendor and agreed a weekly
                payment run.
              </p>
            </div>
          </article>
          <article className="lp-card lp-card-c">
            <h3 className="lp-label">One exercise to practise</h3>
            <p className="lp-exercise">
              Retell the backlog story in 60 seconds: the decision, the
              alternative you rejected, the result.
            </p>
            <p className="lp-illustrative">
              Each debrief ends with a single drill. Illustrative example.
            </p>
          </article>
          <article className="lp-card lp-card-d">
            <h3 className="lp-card-heading">
              Your debrief <span className="lp-chip">Three parts</span>
            </h3>
            <ol className="lp-bars">
              <li>What worked</li>
              <li>What to tighten</li>
              <li className="is-accent">One exercise</li>
            </ol>
            <p className="lp-illustrative">Illustrative structure</p>
          </article>
        </div>
      </div>
    </section>
  );
}

const ROUTES = [
  {
    photo: "photo_route_fresher",
    size: [1600, 1065],
    alt: "A student studying at a library table with a laptop and notes",
    label: "Pre-experience MBA and MiM",
    title: "Freshers and early career",
    text: "Coursework, your final-year project, internships and why an MBA now.",
    chip: "Early career",
    to: "/guides/mba-interview-for-freshers",
    action: "Read the guide for freshers",
  },
  {
    photo: "photo_route_working_professional",
    size: [1600, 1067],
    alt: "A working professional reviewing a document at a desk",
    label: "MBA with work experience",
    title: "Working professionals",
    text: "What you owned, the alternatives you weighed and why this format.",
    chip: "Work experience",
    to: "/guides/mba-interview-work-experience",
    action: "Read the guide for experienced applicants",
  },
  {
    photo: "photo_route_experienced",
    size: [1600, 1067],
    alt: "A senior professional in a meeting room, seen from across the table",
    label: "Executive programmes",
    title: "Experienced applicants",
    text: "EMBA and one-year executive programmes, from INSEAD and LBS to ISB PGP and IIMA PGPX.",
    chip: "Executive",
    to: "/schools",
    action: "Read the school interview guides",
  },
];

function Routes() {
  const track = React.useRef(null);
  const [overflow, setOverflow] = React.useState(false);
  const [nearest, setNearest] = React.useState(0);
  const [edge, setEdge] = React.useState({ start: true, end: false });
  React.useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const update = () => {
      const cards = Array.from(el.children);
      setOverflow(el.scrollWidth > el.clientWidth + 2);
      setEdge({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, index) => {
        const distance = Math.abs(
          card.offsetLeft - el.offsetLeft - el.scrollLeft,
        );
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      setNearest(best);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const scrollToCard = (index) => {
    const el = track.current;
    const card = el?.children[Math.max(0, Math.min(ROUTES.length - 1, index))];
    if (card)
      el.scrollTo({
        left: card.offsetLeft - el.offsetLeft,
        behavior: "smooth",
      });
  };
  return (
    <section className="lp-routes" id="routes" aria-labelledby="routes-heading">
      <div className="lp-frame">
        <header className="lp-routes-head">
          <div>
            <Eyebrow>Your route</Eyebrow>
            <h2 id="routes-heading">Find your route</h2>
          </div>
          <p>
            A pre-experience MBA or MiM, an MBA after a few years of work, or an
            executive programme. The questions follow your résumé either way.
          </p>
          <div className="lp-carousel-controls" hidden={!overflow}>
            <button
              type="button"
              className="lp-round"
              aria-label="Previous route"
              disabled={edge.start}
              onClick={() => scrollToCard(nearest - 1)}
            >
              <span className="lp-flip">
                <ArrowIcon />
              </span>
            </button>
            <button
              type="button"
              className="lp-round"
              aria-label="Next route"
              disabled={edge.end}
              onClick={() => scrollToCard(nearest + 1)}
            >
              <ArrowIcon />
            </button>
          </div>
        </header>
        <div
          className="lp-route-track"
          ref={track}
          tabIndex={0}
          role="group"
          aria-label="Routes"
          data-reveal
        >
          {ROUTES.map((route, index) => (
            <article
              className="lp-route-card"
              key={route.title}
              style={{ "--i": index }}
            >
              <LandingPhoto
                id={route.photo}
                alt={route.alt}
                width={route.size[0]}
                height={route.size[1]}
              />
              <p className="lp-route-label">{route.label}</p>
              <Link className="lp-plus" to={route.to} aria-label={route.action}>
                <PlusIcon />
              </Link>
              <div className="lp-route-foot">
                <div>
                  <h3>{route.title}</h3>
                  <p>{route.text}</p>
                </div>
                <span className="lp-chip">{route.chip}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="lp-dots" hidden={!overflow}>
          {ROUTES.map((route, index) => (
            <button
              type="button"
              key={route.title}
              className={nearest === index ? "is-active" : ""}
              aria-label={`Show card ${index + 1} of ${ROUTES.length}`}
              aria-current={nearest === index}
              onClick={() => scrollToCard(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Workspace() {
  return (
    <section className="lp-workspace" aria-labelledby="workspace-heading">
      <div className="lp-frame">
        <header className="lp-workspace-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h2 id="workspace-heading">
              Your interviews, essays and deadlines.
              <br />
              <em>In one place.</em>
            </h2>
          </div>
          <StartButton location="workspace" className="lp-btn--pill" />
        </header>
        <div className="lp-workspace-grid">
          {[
            {
              panel: <TrackerPanel />,
              title: "Application tracker",
              text: "Deadlines and status by programme.",
              to: "/guides/mba-application-checklist-india",
              action: "Read the application checklist",
            },
            {
              panel: <EssayPanel />,
              title: "Essay drafts",
              text: "Every draft and its feedback together.",
            },
            {
              panel: <HistoryPanel />,
              title: "Interview Studio",
              text: "Transcripts you can export or delete.",
              to: "/mba-interview-practice",
              action: "How résumé-based practice works",
            },
          ].map((card, index) => (
            <article
              className="lp-ws-card"
              key={card.title}
              style={{ "--i": index }}
            >
              <div className="lp-ws-frame">{card.panel}</div>
              <div className="lp-ws-caption">
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
                {card.to && (
                  <Link
                    className="lp-square"
                    to={card.to}
                    aria-label={card.action}
                  >
                    <ArrowIcon />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
        <p className="lp-illustrative">
          Example screens with illustrative data.
        </p>
      </div>
    </section>
  );
}

const GUIDE_CARDS = ["mba-interview-from-resume", "mba-interview-story-bank"];
const GUIDE_PHOTOS = {
  "mba-interview-from-resume": [
    "photo_resume_printout",
    "A printed résumé on a desk with a pen beside it",
    1600,
    900,
  ],
  "mba-interview-story-bank": [
    "photo_story_cards_notebook",
    "Index cards and an open notebook on a desk",
    1600,
    1094,
  ],
};

function GuidesSection() {
  const picked = GUIDE_CARDS.map((slug) =>
    guides.find((g) => g.slug === slug),
  ).filter(Boolean);
  return (
    <section className="lp-guides" aria-labelledby="guides-heading">
      <div className="lp-frame">
        <header className="lp-guides-head">
          <h2 id="guides-heading">Guides for interview day</h2>
          <Link className="lp-label-link" to="/guides">
            <span aria-hidden="true" />
            All guides
          </Link>
        </header>
        <div className="lp-guide-grid" data-reveal>
          <article className="lp-guide lp-guide--large">
            <div className="lp-guide-text">
              <p className="lp-category">
                <span aria-hidden="true" /> Practice page
              </p>
              <h3>
                <Link to={practice.path}>{practice.title}</Link>
              </h3>
              <p className="lp-meta">Updated {formatDate(practice.updated)}</p>
              <p className="lp-guide-summary">{practice.description}</p>
              <Link className="lp-link" to={practice.path}>
                Read the guide <ArrowIcon />
              </Link>
            </div>
            <div className="lp-guide-photo">
              <LandingPhoto
                id="photo_interview_practice_pair"
                alt="Two people practising an interview across a table"
                width={1600}
                height={1103}
              />
            </div>
          </article>
          {picked.map((guide, index) => (
            <article
              className="lp-guide lp-guide--small"
              key={guide.slug}
              style={{ "--i": index + 1 }}
            >
              <div className="lp-guide-text">
                <p className="lp-category">
                  <span aria-hidden="true" /> Guide
                </p>
                <h3>
                  <Link to={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h3>
                <p className="lp-meta">
                  {guide.readingTime} read · Updated {formatDate(guide.updated)}
                </p>
              </div>
              <div className="lp-guide-thumb">
                <LandingPhoto
                  id={GUIDE_PHOTOS[guide.slug][0]}
                  alt={GUIDE_PHOTOS[guide.slug][1]}
                  width={GUIDE_PHOTOS[guide.slug][2]}
                  height={GUIDE_PHOTOS[guide.slug][3]}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = faqs.slice(0, 5);
  return (
    <section className="lp-faq" aria-labelledby="faq-heading">
      <div className="lp-frame lp-faq-grid">
        <div className="lp-faq-label">
          <Eyebrow>Before you start</Eyebrow>
        </div>
        <div>
          <h2 id="faq-heading">Questions applicants ask</h2>
          <div className="lp-faq-list">
            {items.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <span className="lp-faq-icon" aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          <Link className="lp-link" to="/help">
            Getting started and help <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const [prompt, setPrompt] = React.useState(
    "Describe a time you led through uncertainty. What did you learn?",
  );
  const [draft, setDraft] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const runCheck = () => {
    if (!draft.trim()) {
      setError("Add a few sentences to get started.");
      setResult(null);
      return;
    }
    setError("");
    setResult(buildDemoReview(prompt, draft));
  };
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return (
    <section
      className="lp-closing"
      id="writing-check"
      aria-labelledby="closing-heading"
    >
      <LandingPhoto
        id="photo_quiet_interview_room"
        alt=""
        width={1920}
        height={1280}
        className="lp-closing-photo"
      />
      <div className="lp-closing-scrim" aria-hidden="true" />
      <div className="lp-frame lp-closing-grid">
        <div className="lp-closing-copy">
          <h2 id="closing-heading">Your turn.</h2>
          <p className="lp-closing-lead">
            Create a free account, add your résumé and start your first mock
            interview. <span>Free during the pilot.</span>
          </p>
          <hr />
          <ul className="lp-closing-features">
            <li>
              <InterviewIcon />
              <h3>Questions from your résumé</h3>
              <p>The first question starts from something you wrote.</p>
            </li>
            <li>
              <ShareIcon />
              <h3>Follow-ups on your answers</h3>
              <p>Each one quotes what you said and asks for more.</p>
            </li>
          </ul>
          <div className="lp-signup">
            <div className="lp-signup-tile" aria-hidden="true">
              <BrandLogoIcon />
            </div>
            <div className="lp-signup-info">
              <p className="lp-signup-label">Pilot access</p>
              <p className="lp-signup-muted">Email or Google sign-in</p>
              <p className="lp-signup-title">Mock interview</p>
              <StartButton
                location="closing_try"
                className="lp-btn--pill lp-btn--block"
              />
            </div>
          </div>
        </div>
        <div className="lp-closing-form">
          <div className="lp-form-card">
            <Brand />
            <h3>
              Try one answer now<span>, in your own words</span>
            </h3>
            <div className="lp-field">
              <label htmlFor="public-demo-prompt">
                What are you writing about?
              </label>
              <textarea
                id="public-demo-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows="2"
              />
            </div>
            <div className="lp-field">
              <label htmlFor="public-demo-draft">Your first draft</label>
              <textarea
                id="public-demo-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Think of a moment that changed the way you work. What happened?"
                rows="5"
              />
            </div>
            <button
              type="button"
              className="lp-btn lp-btn--pill lp-btn--block"
              onClick={runCheck}
            >
              Check my draft <ArrowIcon />
            </button>
            <p className="lp-form-note">
              {wordCount} words. Your text stays on this page and is not saved.
              This is a basic writing check, not an assessment of admission
              chances.
            </p>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {result && (
              <div
                className="lp-feedback"
                data-testid="public-demo-feedback"
                role="status"
              >
                <h4>A few things to consider</h4>
                <ul>
                  {[...result.strengths, ...result.improvements].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>Basic writing check · {result.wordCount} words</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const rootRef = React.useRef(null);
  useReveal(rootRef);
  return (
    <div className="public-page public-page--landing lp" ref={rootRef}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="lp-hero">
        <SiteHeader home />
        <div className="lp-frame lp-hero-copy">
          <div className="lp-hero-text">
            <h1 id="hero-heading">
              Practise the MBA interview <br />
              before it counts.
            </h1>
            <p className="lp-hero-lead">
              Questions come from your résumé. Follow-ups quote what you just
              said. A debrief shows what to fix next.
            </p>
            <div className="lp-cta-row">
              <StartButton location="hero" />
              <TryLink />
            </div>
          </div>
          <LiveInterview />
        </div>
      </div>
      <main id="main">
        <section className="lp-why" aria-labelledby="why-heading">
          <div className="lp-frame lp-why-grid">
            <div className="lp-why-text" data-reveal>
              <Eyebrow>Why résumé-led practice</Eyebrow>
              <h2 id="why-heading">
                Panels read your résumé. <br />
                So does your practice.
              </h2>
              <div className="lp-why-body">
                <p>
                  Interviewers often start from what you wrote: a final-year
                  project, an internship, a role you held. MockMBA reads your
                  résumé first, asks about it, then follows up on your answer
                  the way a panel member might. It cannot predict an admit. It
                  gives you honest repetitions before the real conversation.
                </p>
                <Link
                  className="lp-btn lp-btn--ghost"
                  to="/mba-interview-practice"
                >
                  How résumé-based practice works
                </Link>
              </div>
            </div>
            <div className="lp-why-photo" data-reveal>
              <LandingPhoto
                id="photo_applicant_at_desk"
                alt="An applicant at a desk with a résumé and a notebook"
                width={1600}
                height={933}
              />
            </div>
          </div>
        </section>
        <HowItWorks />
        <DebriefSpotlight />
        <Closeup />
        <Routes />
        <Workspace />
        <SchoolBand />
        <GuidesSection />
        <section className="lp-pilot" aria-labelledby="pilot-heading">
          <div className="lp-frame">
            <h2 id="pilot-heading">
              Free during the pilot. No admit promises. <br />
              Just more practice before the real panel.
            </h2>
            <p className="lp-pilot-meta">
              <strong>The pilot</strong>
              <span>Prices are not decided yet</span>
            </p>
          </div>
        </section>
        <Faq />
        <Closing />
      </main>
      <SiteFooter home />
    </div>
  );
}
