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
import { landingFaqs } from "../../content/guides";
import { LandingPhoto, StepPreview } from "./LandingPanels";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import "./PublicPages.css";
import LiveInterview from "./LiveInterview";
import HeroDots from "./HeroDots";
import { DebriefSpotlight, SchoolBand } from "./LandingBands";

const SIGNUP_PATH = "/auth?mode=signup&next=%2Fapp%2Finterviews";

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

function Faq() {
  const items = landingFaqs;
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
              <details key={question} open={index < 3}>
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
  return (
    <section className="lp-closing" aria-labelledby="closing-heading">
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
        <HeroDots />
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
            <p className="lp-hero-note">
              Free during the pilot · Five questions · Résumé optional
            </p>
          </div>
          <LiveInterview />
        </div>
      </div>
      <main id="main">
        <DebriefSpotlight action={<StartButton location="debrief" />} />
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
                <p className="lp-why-privacy">
                  Your résumé goes to OpenAI only to write your questions, with
                  contact details removed. We keep the highlights, not the file,
                  and you can delete your account at any time.
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
        <Routes />
        <SchoolBand />
        <Faq />
        <Closing />
      </main>
      <SiteFooter home />
    </div>
  );
}
