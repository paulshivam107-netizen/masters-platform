import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { trackEvent } from "../../app/telemetry";
import {
  ApplicationsIcon,
  ArrowIcon,
  EssaysIcon,
  InterviewIcon,
  CheckIcon,
} from "../../app/icons";
import JourneyArtwork from "../common/JourneyArtwork";
import PublicHeader from "./PublicHeader";
import { GuideCards, PublicFaq, ResourceFooter } from "./ResourcePages";
import "./PublicPages.css";

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

  let score = 62;
  if (wordCount >= 180) score += 12;
  if (wordCount >= 260) score += 6;
  if (avgSentenceLength >= 11 && avgSentenceLength <= 20) score += 8;
  if (hasNumbers) score += 5;
  if (hasPersonalVoice) score += 4;
  if (hasProgramWhy) score += 3;
  score = Math.max(40, Math.min(96, score));

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
    score,
    wordCount,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 4),
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoPrompt, setDemoPrompt] = React.useState(
    "Describe a time you led through uncertainty. What did you learn?",
  );
  const [demoDraft, setDemoDraft] = React.useState("");
  const [demoResult, setDemoResult] = React.useState(null);
  const [demoError, setDemoError] = React.useState("");
  const handleContinue = () => {
    trackEvent("public_cta_clicked", {
      location: "landing_hero",
      signedIn: Boolean(user),
    });
    navigate(user ? "/app/today" : "/auth?mode=signup&next=%2Fapp");
  };
  const handleRunDemo = () => {
    if (!demoDraft.trim()) {
      setDemoError("Add a few sentences to get started.");
      setDemoResult(null);
      return;
    }
    setDemoError("");
    setDemoResult(buildDemoReview(demoPrompt, demoDraft));
  };
  return (
    <div className="public-page public-page--landing">
      <div className="public-shell">
        <PublicHeader />
        <main>
          <section className="landing-hero">
            <div className="landing-copy">
              <span className="landing-kicker">
                <span className="status-dot" /> YOUR AMBITION. A LITTLE MORE
                CLARITY.
              </span>
              <h1>
                Your MBA applications.
                <br />A <em>clearer</em> path.
              </h1>
              <p className="landing-lead">
                Track Indian MBA applications, essays and interview preparation
                in one workspace. Plan for CAT-route two-year programmes,
                GMAT-route applications and programmes for experienced
                professionals.
              </p>
              <div className="landing-cta-row">
                <button className="public-btn primary" onClick={handleContinue}>
                  {user
                    ? "Open your workspace"
                    : "Create your application plan"}
                  <ArrowIcon />
                </button>
                <Link className="public-btn secondary" to="/programs">
                  Explore programmes
                </Link>
              </div>
              <div className="landing-signals">
                <span>
                  <CheckIcon /> Free during the pilot
                </span>
                <span>
                  <CheckIcon /> Built around your journey
                </span>
              </div>
            </div>
            <div className="landing-visual">
              <JourneyArtwork />
              <div className="landing-visual-caption">
                <span className="status-dot" /> One thoughtful step at a time.
              </div>
            </div>
          </section>
          <section className="landing-workflow">
            <div className="landing-section-heading">
              <span className="eyebrow">
                A PLACE FOR EVERY PART OF THE PROCESS
              </span>
              <h2>
                Less scattered.
                <br />
                More focused.
              </h2>
              <p>
                Keep the details organised, so you can give your story the
                attention it deserves.
              </p>
            </div>
            <div className="landing-steps">
              {[
                {
                  icon: <ApplicationsIcon />,
                  number: "01",
                  title: "Find your direction",
                  text: "Bring your target programmes, application deadlines and requirements into one clear view.",
                },
                {
                  icon: <EssaysIcon />,
                  number: "02",
                  title: "Shape your story",
                  text: "Give every draft a home. Revisit your essays, explore feedback and keep working on the details.",
                },
                {
                  icon: <InterviewIcon />,
                  number: "03",
                  title: "Prepare with intention",
                  text: "Collect your best examples, practise a question aloud and reflect on what you want to say.",
                },
              ].map((item) => (
                <article className="landing-step" key={item.number}>
                  <div className="landing-step-top">
                    <span className="feature-icon">{item.icon}</span>
                    <span>{item.number}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="landing-demo" id="writing-check">
            <div className="landing-demo-head">
              <span className="eyebrow">START WITH A FEW WORDS</span>
              <h2>
                Every good story
                <br />
                starts somewhere.
              </h2>
              <p>
                Try a quick writing check. This preview looks at basic writing
                signals; it does not assess admissions chances.
              </p>
              <span className="demo-note">
                Your text stays on this page and is not saved.
              </span>
            </div>
            <div className="public-card landing-demo-card">
              <div className="public-field">
                <label htmlFor="public-demo-prompt">
                  What are you writing about?
                </label>
                <textarea
                  id="public-demo-prompt"
                  value={demoPrompt}
                  onChange={(event) => setDemoPrompt(event.target.value)}
                  rows="2"
                />
              </div>
              <div className="public-field">
                <label htmlFor="public-demo-draft">Your first draft</label>
                <textarea
                  id="public-demo-draft"
                  value={demoDraft}
                  onChange={(event) => setDemoDraft(event.target.value)}
                  placeholder="Think of a moment that changed the way you work. What happened?"
                  rows="5"
                />
              </div>
              <div className="public-demo-actions">
                <button className="public-btn primary" onClick={handleRunDemo}>
                  Check my draft <ArrowIcon />
                </button>
                <span>
                  {demoDraft.trim() ? demoDraft.trim().split(/\s+/).length : 0}{" "}
                  words
                </span>
              </div>
              {demoError && (
                <p className="error-message" role="alert">
                  {demoError}
                </p>
              )}
              {demoResult && (
                <div
                  className="public-feedback"
                  data-testid="public-demo-feedback"
                  role="status"
                >
                  <h3>A few things to consider</h3>
                  <ul>
                    {[...demoResult.strengths, ...demoResult.improvements].map(
                      (item) => (
                        <li key={item}>{item}</li>
                      ),
                    )}
                  </ul>
                  <small>
                    Basic writing check · {demoResult.wordCount} words
                  </small>
                </div>
              )}
            </div>
          </section>
          <section className="landing-resources">
            <span className="eyebrow">START WITH SOMETHING USEFUL</span>
            <h2>Guides for your next step</h2>
            <GuideCards />
          </section>
          <PublicFaq />
          <section className="landing-closing">
            <span className="eyebrow">YOUR NEXT CHAPTER IS YOURS TO WRITE</span>
            <h2>
              Make a little room
              <br />
              for what comes next.
            </h2>
            <button className="hero-primary" onClick={handleContinue}>
              {user ? "Back to your workspace" : "Create your free account"}
              <ArrowIcon />
            </button>
          </section>
        </main>
        <ResourceFooter />
      </div>
    </div>
  );
}
