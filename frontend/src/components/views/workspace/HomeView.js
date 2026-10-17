import React from "react";
import { Link } from "react-router-dom";
import "./WorkspaceInterview.css";
import SetupGuide from "./SetupGuide";
import {
  ApplicationsIcon,
  ArrowIcon,
  CheckIcon,
  DeadlinesIcon,
  DocsIcon,
  EssaysIcon,
  InterviewIcon,
  PlusIcon,
} from "../../../app/icons";

function Stat({ icon, value, label, note }) {
  return (
    <div className="ws-card ws-card--pad-sm wi-stat">
      <div className="wi-stat__top">
        <span className="wi-row__icon">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="wi-stat__value">{value}</p>
      {note && <small>{note}</small>}
    </div>
  );
}

export default function HomeView({
  interviewPrepByApplication,
  selectedApplication,
  essaysForSelectedApplication,
  setSelectedEssay,
  setReview,
  setShowVersions,
  setShowForm,
  handleOpenNewEssayForm,
  handleOpenApplicationForm,
  handleNavChange,
  parseDate,
  getApplicationReadiness,
  user,
  applications,
  applicationSummary,
  essays,
  resolveEssayApplicationId,
  setSelectedApplicationId,
  showHomeChecklist,
  onboardingDismissed,
  setOnboardingDismissed,
}) {
  const firstName = (user?.name || "there").trim().split(/\s+/)[0];
  const openEssay = (essay) => {
    handleNavChange("essays");
    setSelectedEssay(essay);
    setSelectedApplicationId(resolveEssayApplicationId(essay));
    setReview(null);
    setShowVersions(false);
    setShowForm(false);
  };
  const recent = [...essays]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) -
        new Date(a.updated_at || a.created_at),
    )
    .slice(0, 3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = applications
    .filter((app) => parseDate(app.deadline) >= today)
    .sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline))
    .slice(0, 3);
  const essayList = (items) => (
    <div className="wi-list">
      {items.map((essay) => (
        <button
          key={essay.id}
          type="button"
          className="wi-row"
          data-testid="home-recent-essay-item"
          onClick={() => openEssay(essay)}
        >
          <span className="wi-row__icon">
            <EssaysIcon />
          </span>
          <span className="wi-row__copy">
            <strong>{essay.school_name}</strong>
            <span>{essay.essay_prompt || "Untitled essay"}</span>
            <small>
              {new Date(
                essay.updated_at || essay.created_at,
              ).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              · Version {essay.version || 1}
            </small>
          </span>
          <ArrowIcon />
        </button>
      ))}
    </div>
  );

  if (selectedApplication)
    return (
      <div className="wi-home ws-stack" data-testid="home-application-panel">
        <button
          className="ws-btn ws-btn--ghost ws-btn--sm"
          onClick={() => setSelectedApplicationId(null)}
        >
          ← Back to your overview
        </button>
        <section
          className="ws-card ws-card--accent wi-hero"
          data-testid="home-application-hero"
        >
          <span className="ws-eyebrow">
            <span aria-hidden="true" />
            Your application
          </span>
          <h2 data-testid="home-application-title">
            {selectedApplication.school_name}
          </h2>
          <p>
            {selectedApplication.program_name} ·{" "}
            {selectedApplication.application_round || "Round not set"}
          </p>
          <div className="ws-row">
            <button
              className="ws-btn ws-btn--primary"
              data-testid="home-application-new-essay"
              onClick={() => handleOpenNewEssayForm(selectedApplication.id)}
            >
              <PlusIcon /> Write an essay
            </button>
            <button
              className="ws-btn"
              onClick={() => handleOpenApplicationForm(selectedApplication)}
            >
              Edit application
            </button>
          </div>
        </section>
        <div className="ws-grid ws-grid--3">
          <Stat
            icon={<EssaysIcon />}
            value={essaysForSelectedApplication.length}
            label="Essay drafts"
          />
          <Stat
            icon={<DeadlinesIcon />}
            value={
              parseDate(selectedApplication.deadline)?.toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              ) || "Not set"
            }
            label="Deadline"
          />
          <Stat
            icon={<CheckIcon />}
            value={`${getApplicationReadiness(selectedApplication).readiness}%`}
            label="Checklist completion"
          />
        </div>
        <div className="wi-links">
          {[
            ["requirements", "Requirements", <CheckIcon />],
            ["docs", "Documents", <DocsIcon />],
            ["interviews", "Interview preparation", <InterviewIcon />],
            ["research", "School research", <ApplicationsIcon />],
          ].map(([id, label, icon]) => (
            <button
              className="ws-btn"
              key={id}
              onClick={() => handleNavChange(id)}
            >
              {icon}
              {label}
              <ArrowIcon />
            </button>
          ))}
        </div>
        <section className="ws-card">
          <div className="ws-card__head">
            <h3>Your essays for this application</h3>
          </div>
          {essaysForSelectedApplication.length ? (
            essayList(essaysForSelectedApplication)
          ) : (
            <div className="ws-empty">
              <EssaysIcon />
              <p>A strong application starts with your story.</p>
              <button
                className="ws-btn ws-btn--ghost ws-btn--sm"
                onClick={() => handleOpenNewEssayForm(selectedApplication.id)}
              >
                Start your first draft <ArrowIcon />
              </button>
            </div>
          )}
        </section>
      </div>
    );

  const isFirstVisit = !applications.length && !essays.length;
  if (isFirstVisit)
    return (
      <section className="wi-home ws-stack" data-testid="home-first-visit">
        <div className="wi-welcome">
          <div className="wi-welcome__copy">
            <span className="ws-eyebrow">
              <span aria-hidden="true" />
              LET’S GET STARTED
            </span>
            <h2>
              Welcome, <span>{firstName}.</span>
            </h2>
            <p>
              Start with one programme you’re considering. Add its deadline,
              then build your plan at your own pace.
            </p>
            <div className="ws-row">
              <button
                className="ws-btn ws-btn--primary"
                data-testid="home-dashboard-start-application"
                onClick={() => handleOpenApplicationForm()}
              >
                Add your first application <ArrowIcon />
              </button>
            </div>
            <p className="ws-muted ws-small">
              CAT, GMAT or another route: start with the programme and its
              official deadline.
            </p>
          </div>
          <div className="ws-card wi-welcome__side">
            <span className="wi-row__icon">
              <InterviewIcon />
            </span>
            <h3>Start a mock interview</h3>
            <p>
              Questions from your résumé, follow-ups on your answers and a
              debrief when you finish.
            </p>
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              onClick={() => handleNavChange("interviews")}
            >
              Open Interview Studio <ArrowIcon />
            </button>
          </div>
        </div>
        <Link className="ws-btn ws-btn--ghost ws-btn--sm" to="/help">
          New here? See the two-minute setup guide <ArrowIcon />
        </Link>
        <div className="wi-steps">
          <h3>One step at a time</h3>
          <ol>
            <li>
              <strong>Choose your programme</strong>
              <span>Keep its deadline and requirements together.</span>
            </li>
            <li>
              <strong>Build your application</strong>
              <span>
                Save preparation notes, drafts and document checklists.
              </span>
            </li>
            <li>
              <strong>Practise your story</strong>
              <span>Prepare a few clear answers for your interview.</span>
            </li>
          </ol>
          <button
            className="ws-btn ws-btn--ghost ws-btn--sm"
            onClick={() => handleNavChange("interviews")}
          >
            Just here to practise? Try a question <ArrowIcon />
          </button>
        </div>
      </section>
    );

  return (
    <div className="wi-home ws-stack" data-testid="home-dashboard">
      {!onboardingDismissed && (
        <SetupGuide
          applications={applications}
          essays={essays}
          interviewPrepByApplication={interviewPrepByApplication}
          onApplication={() => handleOpenApplicationForm()}
          onEssay={() => handleOpenNewEssayForm(applications[0]?.id)}
          onInterview={() => handleNavChange("interviews")}
          onDismiss={() => setOnboardingDismissed(true)}
        />
      )}
      <section className="ws-card wi-next" data-testid="home-dashboard-hero">
        <div>
          <span className="ws-eyebrow">
            <span aria-hidden="true" />
            {upcoming.length ? "Your next deadline" : "Your next step"}
          </span>
          <h2>
            {upcoming.length
              ? upcoming[0].school_name
              : `Welcome back, ${firstName}.`}
          </h2>
          <p>
            {upcoming.length
              ? `${upcoming[0].program_name} · ${parseDate(upcoming[0].deadline).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`
              : "Pick up a draft or add another programme to your plan."}
          </p>
        </div>
        <button
          className="ws-btn ws-btn--primary"
          data-testid="home-dashboard-start-application"
          onClick={() =>
            upcoming.length
              ? setSelectedApplicationId(upcoming[0].id)
              : handleNavChange("tracker")
          }
        >
          {upcoming.length ? "Open application" : "View applications"}{" "}
          <ArrowIcon />
        </button>
      </section>
      <div className="wi-summary" data-testid="home-dashboard-metrics">
        <span>
          <ApplicationsIcon />
          <strong>{applications.length}</strong> applications
        </span>
        <span>
          <EssaysIcon />
          <strong>{essays.length}</strong> essay drafts
        </span>
        <span>
          <DeadlinesIcon />
          <strong>{applicationSummary.dueSoon}</strong> due within 21 days
        </span>
      </div>
      <div className="ws-grid ws-grid--2">
        <section className="ws-card">
          <div className="ws-card__head">
            <h3>Continue writing</h3>
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              onClick={() => handleNavChange("essays")}
            >
              All essays <ArrowIcon />
            </button>
          </div>
          {recent.length ? (
            essayList(recent)
          ) : (
            <div className="ws-empty">
              <EssaysIcon />
              <h4>Start with a rough draft.</h4>
              <p>Your first version doesn’t need to be perfect.</p>
              <button
                className="ws-btn"
                data-testid="home-dashboard-start-essay"
                onClick={() => handleOpenNewEssayForm()}
              >
                <PlusIcon /> Start an essay
              </button>
            </div>
          )}
        </section>
        <section className="ws-card">
          <div className="ws-card__head">
            <h3>Upcoming deadlines</h3>
            <button
              className="ws-btn ws-btn--ghost ws-btn--sm"
              onClick={() => handleNavChange("deadlines")}
            >
              Calendar <ArrowIcon />
            </button>
          </div>
          {upcoming.length ? (
            <div className="wi-list">
              {upcoming.map((app) => {
                const date = parseDate(app.deadline);
                return (
                  <button
                    className="wi-row"
                    key={app.id}
                    onClick={() => setSelectedApplicationId(app.id)}
                  >
                    <span className="wi-date">
                      <small>
                        {date.toLocaleDateString(undefined, { month: "short" })}
                      </small>
                      <strong>{date.getDate()}</strong>
                    </span>
                    <span className="wi-row__copy">
                      <strong>{app.school_name}</strong>
                      <span>
                        {app.program_name} ·{" "}
                        {app.application_round || "Application"}
                      </span>
                    </span>
                    <ArrowIcon />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ws-empty">
              <DeadlinesIcon />
              <h4>No upcoming deadlines.</h4>
              <p>Check your applications to keep your dates current.</p>
              <button
                className="ws-btn ws-btn--ghost ws-btn--sm"
                onClick={() => handleNavChange("tracker")}
              >
                View applications <ArrowIcon />
              </button>
            </div>
          )}
        </section>
      </div>
      {showHomeChecklist && (
        <section className="ws-card ws-card--soft wi-banner">
          <span className="wi-row__icon">
            <InterviewIcon />
          </span>
          <div>
            <h3>Have 90 seconds?</h3>
            <p>Practise one interview answer, out loud.</p>
          </div>
          <button
            className="ws-btn"
            onClick={() => handleNavChange("interviews")}
          >
            Start practising <ArrowIcon />
          </button>
        </section>
      )}
    </div>
  );
}
