import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../app/telemetry';
import './PublicPages.css';

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

  React.useEffect(() => {
    document.body.classList.remove('dark-body');
    document.body.classList.add('public-body');
    return () => {
      document.body.classList.remove('public-body');
    };
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
    if (user) {
      navigate('/app');
      return;
    }
    const next = encodeURIComponent('/app');
    navigate(`/auth?mode=signup&next=${next}`);
  };

  return (
    <div className="public-page">
      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-brand">Masters App Command Center</div>
          <nav className="public-nav" aria-label="Public navigation">
            <Link className="public-link-btn" to="/programs">Explore Programs</Link>
            <Link className="public-link-btn" to="/auth?mode=login&next=%2Fapp">Login</Link>
            <Link className="public-link-btn primary" to="/auth?mode=signup&next=%2Fapp">Start Free</Link>
          </nav>
        </header>

        <section className="public-hero">
          <article className="public-card">
            <h1>Plan applications, draft essays, and review faster.</h1>
            <p>
              Organize schools, deadlines, and essays in one workspace. Get AI review quality quickly,
              then save and iterate once you create your account.
            </p>
            <div className="public-hero-actions">
              <button type="button" className="public-btn primary" onClick={handleContinue}>
                {user ? 'Open Workspace' : 'Start Free'}
              </button>
              <Link className="public-btn" to="/programs">See Program Data</Link>
            </div>
          </article>

          <aside className="public-card public-kpi-grid">
            <div className="public-kpi">
              <strong>One workspace</strong>
              <span>Applications, essays, requirements, documents.</span>
            </div>
            <div className="public-kpi">
              <strong>AI review loop</strong>
              <span>Fast iteration for clarity, structure, and specificity.</span>
            </div>
            <div className="public-kpi">
              <strong>Save when ready</strong>
              <span>Demo first, then register to persist everything.</span>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <h2 className="public-section-title">How it works</h2>
          <div className="public-feature-grid">
            <article className="public-card public-feature">
              <h3>1. Explore</h3>
              <p>Browse program options and compare schools before building your shortlist.</p>
            </article>
            <article className="public-card public-feature">
              <h3>2. Draft</h3>
              <p>Use one workspace for essay drafts, deadlines, and requirements tracking.</p>
            </article>
            <article className="public-card public-feature">
              <h3>3. Improve</h3>
              <p>Run review loops and version updates to improve quality before submission windows.</p>
            </article>
          </div>
        </section>

        <section className="public-section">
          <h2 className="public-section-title">Try a sample review</h2>
          <div className="public-card">
            <div className="public-demo">
              <div className="public-field">
                <label htmlFor="public-demo-prompt">Essay prompt</label>
                <input
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

        <footer className="public-page-footer">
          Pilot access is free while we validate product flow and feedback quality.
        </footer>
      </div>
    </div>
  );
}
