import React from "react";
import {
  ApplicationsIcon,
  ArrowIcon,
  CheckIcon,
  DocsIcon,
  EssaysIcon,
  InterviewIcon,
  PlusIcon,
} from "../../../app/icons";
import "./WorkspacePlanning.css";

/* Application detail ("planner") screen, opened from Applications, Calendar
   and Requirements. Rendered by HomeView when an application is selected. */
export default function ApplicationDetail({
  application,
  essays,
  essayList,
  parseDate,
  getApplicationReadiness,
  setSelectedApplicationId,
  handleOpenNewEssayForm,
  handleOpenApplicationForm,
  handleNavChange,
}) {
  const readiness = getApplicationReadiness(application).readiness;
  const deadline = parseDate(application.deadline);
  const stats = [
    ["Essay drafts", essays.length],
    [
      "Deadline",
      deadline?.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }) || "Not set",
    ],
    ["Checklist completion", `${readiness}%`],
  ];
  return (
    <div className="wpl wpl-detail" data-testid="home-application-panel">
      <button
        type="button"
        className="ws-btn ws-btn--ghost wpl-back"
        onClick={() => setSelectedApplicationId(null)}
      >
        ← Back to your overview
      </button>
      <section
        className="ws-card wpl-detail__hero"
        data-testid="home-application-hero"
      >
        <span className="ws-eyebrow">Your application</span>
        <h2 data-testid="home-application-title">{application.school_name}</h2>
        <p className="ws-muted">
          {application.program_name} ·{" "}
          {application.application_round || "Round not set"}
        </p>
        <div className="ws-row">
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            data-testid="home-application-new-essay"
            onClick={() => handleOpenNewEssayForm(application.id)}
          >
            <PlusIcon /> Write an essay
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={() => handleOpenApplicationForm(application)}
          >
            Edit application
          </button>
        </div>
      </section>
      <dl className="wpl-detail__stats">
        {stats.map(([label, value]) => (
          <div className="wpl-stat" key={label}>
            <dt>{label}</dt>
            <dd className="wpl-stat__n ws-num">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="wpl-detail__links">
        {[
          ["requirements", "Requirements", <CheckIcon />],
          ["docs", "Documents", <DocsIcon />],
          ["interviews", "Interview preparation", <InterviewIcon />],
          ["research", "School research", <ApplicationsIcon />],
        ].map(([id, label, icon]) => (
          <button
            type="button"
            className="ws-btn wpl-detail__link"
            key={id}
            onClick={() => handleNavChange(id)}
          >
            {icon}
            <span>{label}</span>
            <ArrowIcon />
          </button>
        ))}
      </div>
      <section className="ws-card">
        <h3 className="ws-h3">Your essays for this application</h3>
        {essays.length ? (
          essayList(essays)
        ) : (
          <div className="ws-empty wpl-empty wpl-empty--inline">
            <EssaysIcon />
            <p>A strong application starts with your story.</p>
            <button
              type="button"
              className="ws-btn"
              onClick={() => handleOpenNewEssayForm(application.id)}
            >
              Start your first draft
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
