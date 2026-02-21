import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../app/telemetry';
import './PublicPages.css';

const WORKFLOW_STEPS = [
  {
    title: 'Program planning',
    description: 'Build your shortlist with deadlines, fees, and intake targets in one board.'
  },
  {
    title: 'Drafting + versioning',
    description: 'Write essays inside the workspace and keep clean versions as you iterate.'
  },
  {
    title: 'AI review loop',
    description: 'Run structured feedback, tighten your story, and submit with more confidence.'
  }
];

const HERO_SIGNALS = [
  'No card required',
  'Free during pilot',
  'Honest product, no fake stats'
];

function buildDemoReview(prompt, draft) {
  const trimmedPrompt = (prompt || '').trim();
  const trimmedDraft = (draft || '').trim();
  const wordCount = trimmedDraft ? trimmedDraft.split(/\s+/).filter(Boolean).length : 0;
  const sentenceCount = trimmedDraft ? trimmedDraft.split(/[.!?]+/).filter((s) => s.trim()).length : 0;
  const avgSentenceLength = sentenceCount ? Math.round(wordCount / sentenceCount) : 0;
  const hasNumbers = /\d/.test(trimmedDraft);
  const hasPersonalVoice = /\b(I|my|me)\b/i.test(trimmedDraft);
  const hasProgramWhy = /\b(program|school|mba|masters|university)\b/i.test(trimmedDraft);

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
    strengths.push('Draft has enough substance to evaluate narrative and clarity.');
  } else {
    improvements.push('Add detail: target at least 180-220 words for useful review depth.');
  }

  if (hasPersonalVoice) {
    strengths.push('Personal voice is visible, which helps authenticity.');
  } else {
    improvements.push('Use first-person examples to make the response feel specific and personal.');
  }

  if (hasNumbers) {
    strengths.push('Includes concrete facts or metrics, which improves credibility.');
  } else {
    improvements.push('Add one measurable detail (result, timeline, or scope).');
  }

  if (hasProgramWhy) {
    strengths.push('Mentions program fit, which aligns well with admissions expectations.');
  } else if (trimmedPrompt) {
    improvements.push('Tie your story back to program fit and why now.');
  }

  if (avgSentenceLength > 22) {
    improvements.push('Shorten long sentences to improve readability.');
  } else if (avgSentenceLength >= 10) {
    strengths.push('Sentence length is balanced and readable.');
  }

  return {
    score,
    wordCount,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 4)
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoPrompt, setDemoPrompt] = React.useState('Describe a time you led through uncertainty. What did you learn?');
  const [demoDraft, setDemoDraft] = React.useState('');
  const [demoResult, setDemoResult] = React.useState(null);
  const [demoError, setDemoError] = React.useState('');
  const [typedText, setTypedText] = React.useState('');

  const fullPreviewText = '"Describe a time you led through uncertainty. What changed in your approach?"';

  React.useEffect(() => {
    document.body.classList.remove('dark-body');
    document.body.classList.add('public-body');
    return () => {
      document.body.classList.remove('public-body');
    };
  }, []);

  React.useEffect(() => {
    let currentIdx = 0;
    const intervalId = setInterval(() => {
      if (currentIdx <= fullPreviewText.length) {
        setTypedText(fullPreviewText.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(intervalId);
      }
    }, 45); // typing speed

    return () => clearInterval(intervalId);
  }, []);

  const handleRunDemo = () => {
    setDemoError('');
    if (!demoDraft.trim()) {
      setDemoResult(null);
      setDemoError('Paste a short draft first to get a sample review.');
      return;
    }
    const result = buildDemoReview(demoPrompt, demoDraft);
    setDemoResult(result);
    trackEvent('public_demo_review_run', { wordCount: result.wordCount });
  };

  const handleContinue = () => {
    trackEvent('public_cta_clicked', { location: 'landing_hero', signedIn: Boolean(user) });
    if (user) {
      navigate('/app');
      return;
    }
    const next = encodeURIComponent('/app');
    navigate(`/auth?mode=signup&next=${next}`);
  };

  return (
    <div className="public-page public-page--landing">
      {/* Background Orbs */}
      <div className="landing-orb orb-1"></div>
      <div className="landing-orb orb-2"></div>

      <div className="public-shell public-shell--landing">
        <header className="public-topbar landing-topbar">
          <div className="public-brand">
            Masters App
            <span>Command Center</span>
          </div>
          <nav className="public-nav" aria-label="Public navigation">
            <Link className="public-link-btn" to="/programs">Explore Programs</Link>
            <Link className="public-link-btn" to="/auth?mode=login&next=%2Fapp">Login</Link>
            <Link className="public-link-btn primary" to="/auth?mode=signup&next=%2Fapp">Start Free</Link>
          </nav>
        </header>

        <section className="landing-hero">
          <article className="landing-copy">
            <p className="landing-kicker">Pilot access is open</p>
            <h1>Your admissions workflow, finally in one place.</h1>
            <p className="landing-lead">
              Track programs, draft essays, run AI review loops, and stay deadline-ready without juggling ten tools.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="public-btn primary" onClick={handleContinue}>
                {user ? 'Open Workspace' : 'Start Free'}
              </button>
              <Link className="public-btn" to="/programs">See Program Data</Link>
            </div>

            <ul className="landing-signal-row" aria-label="Key benefits">
              {HERO_SIGNALS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <aside className="landing-stage" aria-label="Workspace preview">
            <div className="landing-stage-top">
              <span>Live workspace preview</span>
              <span>Pilot mode</span>
            </div>

            <div className="landing-stage-mockups">
              <div className="mockup-card left">
                <div className="mockup-header">
                  <span>Kanban board</span>
                  <span className="mockup-badge">On Track</span>
                </div>
                <div className="mockup-body">
                  <div className="mockup-box">
                    <div className="mockup-line short"></div>
                  </div>
                  <div className="mockup-box">
                    <div className="mockup-line medium"></div>
                  </div>
                  <div className="mockup-box">
                    <div className="mockup-line"></div>
                  </div>
                </div>
              </div>

              <div className="mockup-card right">
                <div className="mockup-header">
                  <span>AI Review Scores</span>
                </div>
                <div className="mockup-body">
                  <div className="mockup-box" style={{ flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '24px 12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #5E6AD2', borderTopColor: '#4ade80' }}></div>
                    <div className="mockup-line short"></div>
                  </div>
                  <div className="mockup-line medium" style={{ marginTop: '8px' }}></div>
                  <div className="mockup-line"></div>
                </div>
              </div>

              <div className="mockup-card center">
                <div className="mockup-header">
                  <span>INSEAD · Essay 1</span>
                  <span className="mockup-badge" style={{ background: 'rgba(94, 106, 210, 0.2)', color: '#A5B4FC' }}>Score: 8.5/10</span>
                </div>
                <div className="mockup-body" style={{ gap: '16px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#D1D1D6', lineHeight: 1.5, minHeight: '40px' }}>
                    {typedText}
                  </p>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '12px', borderLeft: '3px solid #5E6AD2' }}>
                    <div className="mockup-line" style={{ marginBottom: '8px' }}></div>
                    <div className="mockup-line medium" style={{ marginBottom: '8px' }}></div>
                    <div className="mockup-line short"></div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="landing-flow">
          <p className="landing-section-eyebrow">How it works</p>
          <h2>Simple linear flow. No dashboard chaos.</h2>
          <div className="landing-steps">
            {WORKFLOW_STEPS.map((step, index) => (
              <article key={step.title} className="landing-step">
                <span>{`0${index + 1}`}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-demo">
          <div className="landing-demo-head">
            <p className="landing-section-eyebrow">Try the review loop</p>
            <h2>Paste a draft. Get structured feedback.</h2>
            <p>No signup needed for this preview.</p>
          </div>

          <div className="public-card landing-demo-card">
            <div className="public-demo">
              <div className="public-field">
                <label htmlFor="public-demo-prompt">Essay prompt</label>
                <textarea
                  id="public-demo-prompt"
                  value={demoPrompt}
                  onChange={(event) => setDemoPrompt(event.target.value)}
                  placeholder="Paste your target prompt"
                />
              </div>
              <div className="public-field">
                <label htmlFor="public-demo-draft">Draft text</label>
                <textarea
                  id="public-demo-draft"
                  value={demoDraft}
                  onChange={(event) => setDemoDraft(event.target.value)}
                  placeholder="Paste 1-2 paragraphs"
                />
              </div>
            </div>

            <div className="public-demo-actions">
              <button type="button" className="public-btn primary" onClick={handleRunDemo}>Run demo review</button>
              <button type="button" className="public-btn secondary" onClick={handleContinue}>
                {user ? 'Save in workspace' : 'Save and continue'}
              </button>
            </div>

            {demoError && <p className="public-auth-next">{demoError}</p>}

            {demoResult && (
              <div className="public-feedback" data-testid="public-demo-feedback">
                <strong>Sample review score: {demoResult.score}/100</strong>
                <p>Word count: {demoResult.wordCount}</p>
                {!!demoResult.strengths.length && (
                  <>
                    <p>What is working:</p>
                    <ul>
                      {demoResult.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {!!demoResult.improvements.length && (
                  <>
                    <p>What to improve next:</p>
                    <ul>
                      {demoResult.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="landing-footer">
          <p>Pilot access is free while we validate workflow quality. Keep what works, ignore what does not.</p>
          <Link className="public-link-btn primary" to="/auth?mode=signup&next=%2Fapp">Create free account</Link>
        </footer>
      </div>
    </div>
  );
}
