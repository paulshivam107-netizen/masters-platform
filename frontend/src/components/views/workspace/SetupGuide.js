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
      className="wac-guide"
      aria-labelledby="setup-guide-title"
      data-testid="setup-guide"
    >
      <div className="wac-guide__head">
        <span className="ws-eyebrow">Your first few steps</span>
        <button
          className="ws-link wac-linkbtn"
          onClick={onDismiss}
          aria-label="Hide setup guide"
        >
          Hide for now
        </button>
      </div>
      <div className="wac-guide__next">
        <div>
          <h2 className="ws-h3" id="setup-guide-title">{next.title}</h2>
          <p>{next.detail}</p>
        </div>
        <button
          type="button"
          className="ws-btn ws-btn--solid"
          onClick={() => openStep(next)}
        >
          {next.id === "preparation"
            ? "Open interview preparation"
            : "Add a programme"}{" "}
          <ArrowIcon />
        </button>
      </div>
      {next.id === "preparation" && (
        <button
          className="ws-link wac-linkbtn"
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
              <button className="ws-link wac-linkbtn" onClick={() => openStep(step)}>
                {step.title}
              </button>
              <small>{step.done ? "Done" : "To do"}</small>
            </li>
          ))}
        </ol>
      </details>
      <Link className="ws-link" to="/help">
        How this workspace works <ArrowIcon />
      </Link>
    </section>
  );
}
