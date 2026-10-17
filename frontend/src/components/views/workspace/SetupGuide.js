import React from "react";
import { Link } from "react-router-dom";
import { ArrowIcon, CheckIcon } from "../../../app/icons";
import { trackEvent } from "../../../app/telemetry";
import "./WorkspaceAccount.css";

export default function SetupGuide({
  applications,
  essays,
  interviewPrepByApplication = {},
  onApplication,
  onEssay,
  onInterview,
  onDismiss,
}) {
  const hasStory = applications.some((app) =>
    ["stories_bank", "strategy_notes", "mock_feedback"].some((key) =>
      (interviewPrepByApplication[app.id]?.[key] || "").trim(),
    ),
  );
  const steps = [
    {
      id: "application",
      title: "Add one target programme",
      detail: "Use its official deadline, including the year.",
      done: applications.length > 0,
      action: onApplication,
    },
    {
      id: "preparation",
      title: "Save an essay or interview note",
      detail:
        "Choose the preparation your programme needs. One rough example is enough.",
      done: essays.length > 0 || hasStory,
      action: onInterview,
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);
  if (!next) return null;
  const openStep = (step) => {
    trackEvent("onboarding_step_opened", { step: step.id });
    step.action();
  };
  return (
    <section
      className="ws-card ws-card--soft wi-guide"
      aria-labelledby="setup-guide-title"
      data-testid="setup-guide"
    >
      <div className="wi-guide__head">
        <span className="ws-eyebrow">
          <span aria-hidden="true" />
          Your first few steps
        </span>
        <button
          className="ws-btn ws-btn--ghost ws-btn--sm"
          onClick={onDismiss}
          aria-label="Hide setup guide"
        >
          Hide for now
        </button>
      </div>
      <div className="wi-guide__next">
        <div>
          <h2 className="ws-h3" id="setup-guide-title">{next.title}</h2>
          <p>{next.detail}</p>
        </div>
        <button className="ws-btn" onClick={() => openStep(next)}>
          {next.id === "preparation"
            ? "Open interview preparation"
            : "Add a programme"}{" "}
          <ArrowIcon />
        </button>
      </div>
      {next.id === "preparation" && (
        <button
          className="ws-btn ws-btn--ghost ws-btn--sm"
          onClick={() => {
            trackEvent("onboarding_step_opened", { step: "essay" });
            onEssay();
          }}
        >
          Start an essay instead <ArrowIcon />
        </button>
      )}
      <progress
        className="wac-progress"
        value={completed}
        max={steps.length}
        aria-label={`${completed} of ${steps.length} setup steps complete`}
      />
      <details className="wac-guide__steps">
        <summary>
          {completed} of {steps.length} complete · See all steps
        </summary>
        <ol>
          {steps.map((step) => (
            <li key={step.id}>
              <span>
                {step.done ? (
                  <CheckIcon />
                ) : (
                  <span className="wac-dot" />
                )}
              </span>
              <button
                className="ws-btn ws-btn--ghost ws-btn--sm"
                onClick={() => openStep(step)}
              >
                {step.title}
              </button>
              <small>{step.done ? "Done" : "To do"}</small>
            </li>
          ))}
        </ol>
      </details>
      <Link className="ws-btn ws-btn--ghost ws-btn--sm" to="/help">
        How this workspace works <ArrowIcon />
      </Link>
    </section>
  );
}
