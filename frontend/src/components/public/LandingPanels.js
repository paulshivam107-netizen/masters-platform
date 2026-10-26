import React from "react";

// Landing page photos and the how-it-works step previews. Everything here is fictional,
// inert and labelled as illustrative.

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
