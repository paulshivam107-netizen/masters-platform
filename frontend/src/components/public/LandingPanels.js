import React from "react";

// Native, code-built interface panels for the landing page. Everything here is fictional,
// inert (not focusable, not clickable) and labelled as illustrative. No scores, ratings or
// admission predictions appear in any panel.

export function LandingPhoto({
  id,
  alt,
  width,
  height,
  eager = false,
  className = "",
}) {
  return (
    <img
      className={`lp-photo ${className}`.trim()}
      src={`/images/landing/${id}.jpg`}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(event) => {
        // The frame keeps its token colour until the file exists.
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function Panel({ label, className = "", children }) {
  return (
    <figure className={`lp-panel ${className}`.trim()} role="img" aria-label={label}>
      <div className="lp-panel-inner" inert="">
        {children}
      </div>
    </figure>
  );
}

export function QuestionPanel() {
  return (
    <Panel
      label="Illustrative Interview Studio screen: question 1 of 5, drawn from a résumé line about a summer internship in retail analytics"
    >
      <div className="lp-panel-head">
        <strong>Interview Studio</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <p className="lp-panel-meta">Question 1 of 5</p>
      <p className="lp-chip">From your résumé: Summer intern, retail analytics</p>
      <p className="lp-panel-question">
        You built a weekly sales dashboard in your internship. Who used it, and
        what changed because of it?
      </p>
    </Panel>
  );
}

export function AnswerPanel() {
  return (
    <Panel
      label="Illustrative answer screen: typed answer mode with a draft answer about a sales dashboard and a word count"
    >
      <div className="lp-panel-head">
        <strong>Your answer</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <div className="lp-segmented">
        <span className="is-active">Typed</span>
        <span>Voice</span>
      </div>
      <p className="lp-textarea">
        The regional manager opened it every Monday to decide which stores to
        restock first. Before that, she relied on…
      </p>
      <p className="lp-panel-meta">38 words</p>
      <p className="lp-send">Send answer</p>
    </Panel>
  );
}

export function DebriefPanel() {
  return (
    <Panel
      label="Illustrative debrief screen for five answers with three parts: what worked, what to tighten and one exercise"
    >
      <div className="lp-panel-head">
        <strong>Debrief, 5 answers</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <dl className="lp-debrief">
        <div>
          <dt>What worked</dt>
          <dd>You named who used the dashboard and the decision it changed.</dd>
        </div>
        <div>
          <dt>What to tighten</dt>
          <dd>Give one number for the result.</dd>
        </div>
        <div>
          <dt>One exercise</dt>
          <dd>Retell the dashboard story in 60 seconds.</dd>
        </div>
      </dl>
    </Panel>
  );
}

export function TrackerPanel() {
  return (
    <Panel
      label="Illustrative application tracker listing three programmes with example statuses"
    >
      <div className="lp-panel-head">
        <strong>Your applications</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <ul className="lp-rows">
        <li>
          <span>IIM Ahmedabad PGPX</span>
          <small>Interview 14 Nov</small>
          <em>Preparing</em>
        </li>
        <li>
          <span>ISB PGP</span>
          <small>Essays due 20 Nov</small>
          <em>Drafting</em>
        </li>
        <li>
          <span>IIM Bangalore EPGP</span>
          <small>&nbsp;</small>
          <em>Submitted</em>
        </li>
      </ul>
    </Panel>
  );
}

export function EssayPanel() {
  return (
    <Panel
      label="Illustrative essay screen: a prompt, version 3 of a draft and two feedback notes, with no score"
    >
      <div className="lp-panel-head">
        <strong>Essay draft</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <p className="lp-panel-question lp-panel-question--small">
        Why pursue a management programme now?
      </p>
      <p className="lp-panel-meta">Version 3, 412 words</p>
      <p className="lp-textarea">
        I want to move from running one plant’s schedules to shaping how a
        whole network plans. Two years ago I…
      </p>
      <ul className="lp-notes">
        <li>Your opening states the goal in the first line.</li>
        <li>Paragraph two needs one concrete example.</li>
      </ul>
    </Panel>
  );
}

export function HistoryPanel() {
  return (
    <Panel
      label="Illustrative list of recent Interview Studio sessions, with Export and Delete shown on the first row"
    >
      <div className="lp-panel-head">
        <strong>Recent sessions</strong>
        <span className="lp-tag">Illustrative</span>
      </div>
      <ul className="lp-rows">
        <li>
          <span>Résumé-led practice</span>
          <small>12 Nov, 5 of 5 answers</small>
          <em>Debrief ready</em>
          <span className="lp-row-actions">
            <u>Export</u>
            <u>Delete</u>
          </span>
        </li>
        <li>
          <span>Résumé-led practice</span>
          <small>9 Nov, 3 of 5 answers</small>
          <em>Debrief ready</em>
        </li>
        <li>
          <span>Opening questions</span>
          <small>6 Nov, 2 of 5 answers</small>
          <em>Transcript saved</em>
        </li>
      </ul>
    </Panel>
  );
}

const STEP_STATES = [
  {
    label: "Illustrative: résumé added, with three parsed lines",
    title: "Résumé added",
    lines: [
      "B.Com, 2025",
      "Summer intern, retail analytics",
      "Captain, college debate society",
    ],
  },
  {
    label: "Illustrative: the opening question",
    title: "Opening question",
    text: "Tell me about the dashboard you built as a summer intern.",
  },
  {
    label: "Illustrative: a follow-up that builds on the answer",
    title: "Follow-up",
    text: "You said the manager checked it every Monday. What did she do differently after seeing it?",
  },
  {
    label: "Illustrative: debrief summary with three short lines",
    title: "Debrief",
    pairs: [
      ["Worked", "Named the user and the decision."],
      ["Tighten", "Add one number."],
      ["Exercise", "Retell it in 60 seconds."],
    ],
  },
];

export function StepPreview({ index }) {
  const step = STEP_STATES[index];
  return (
    <figure className="lp-step-card" role="img" aria-label={step.label}>
      <div inert="" key={index} className="lp-step-card-body">
        <span className="lp-tag">Illustrative</span>
        <strong>{step.title}</strong>
        {step.lines && (
          <ul>
            {step.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {step.text && <p>{step.text}</p>}
        {step.pairs && (
          <dl>
            {step.pairs.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </figure>
  );
}
