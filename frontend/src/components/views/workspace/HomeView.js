import React from "react";
import { Link } from "react-router-dom";
import SetupGuide from "./SetupGuide";
import JourneyArtwork from "../../common/JourneyArtwork";
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
    <div className="home-metric-card">
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="metric-value">{value}</p>
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
    <div className="recent-essay-list">
      {items.map((essay) => (
        <button
          key={essay.id}
          type="button"
          className="recent-work-row"
          data-testid="home-recent-essay-item"
          onClick={() => openEssay(essay)}
        >
          <span className="list-icon">
            <EssaysIcon />
          </span>
          <span className="list-copy">
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
      <div
        className="application-home-panel"
        data-testid="home-application-panel"
      >
        <button
          className="text-button"
          onClick={() => setSelectedApplicationId(null)}
        >
          ← Back to your overview
        </button>
        <section
          className="application-focus-card"
          data-testid="home-application-hero"
        >
          <span className="eyebrow">YOUR APPLICATION</span>
          <h2 data-testid="home-application-title">
            {selectedApplication.school_name}
          </h2>
          <p>
            {selectedApplication.program_name} ·{" "}
            {selectedApplication.application_round || "Round not set"}
          </p>
          <div className="home-hero-actions">
            <button
              className="new-essay-btn"
              data-testid="home-application-new-essay"
              onClick={() => handleOpenNewEssayForm(selectedApplication.id)}
            >
              <PlusIcon /> Write an essay
            </button>
            <button
              className="secondary-action-btn"
              onClick={() => handleOpenApplicationForm(selectedApplication)}
            >
              Edit application
            </button>
          </div>
        </section>
        <div className="home-metrics-grid">
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
        <div className="application-quick-links">
          {[
            ["requirements", "Requirements", <CheckIcon />],
            ["docs", "Documents", <DocsIcon />],
            ["interviews", "Interview preparation", <InterviewIcon />],
            ["research", "School research", <ApplicationsIcon />],
          ].map(([id, label, icon]) => (
            <button
              className="secondary-action-btn"
              key={id}
              onClick={() => handleNavChange(id)}
            >
              {icon}
              {label}
              <ArrowIcon />
            </button>
          ))}
        </div>
        <section className="dashboard-card">
          <div className="section-heading">
            <h3>Your essays for this application</h3>
          </div>
          {essaysForSelectedApplication.length ? (
            essayList(essaysForSelectedApplication)
          ) : (
            <div className="quiet-empty">
              <EssaysIcon />
              <p>A strong application starts with your story.</p>
              <button
                className="text-button"
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
      <section className="first-visit" data-testid="home-first-visit">
        <div className="home-hero-card">
          <div className="hero-copy">
            <span className="hero-kicker">LET’S GET STARTED</span>
            <h2>
              Welcome, <span>{firstName}.</span>
            </h2>
            <p>
              Start with one programme you’re considering. Add its deadline,
              then build your plan at your own pace.
            </p>
            <div className="home-hero-actions">
              <button
                className="hero-primary"
                data-testid="home-dashboard-start-application"
                onClick={() => handleOpenApplicationForm()}
              >
                Add your first application <ArrowIcon />
              </button>
            </div>
            <p className="first-visit-hint">
              CAT, GMAT or another route: start with the programme and its
              official deadline.
            </p>
          </div>
          <JourneyArtwork />
        </div>
        <Link className="text-button" to="/help">
          New here? See the two-minute setup guide <ArrowIcon />
        </Link>
        <div className="first-visit-next">
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
            className="text-button"
            onClick={() => handleNavChange("interviews")}
          >
            Just here to practise? Try a question <ArrowIcon />
          </button>
        </div>
      </section>
    );

  return (
    <div className="home-dashboard" data-testid="home-dashboard">
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
      <section className="home-next-step" data-testid="home-dashboard-hero">
        <div>
          <span className="eyebrow">
            {upcoming.length ? "YOUR NEXT DEADLINE" : "YOUR NEXT STEP"}
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
          className="hero-primary"
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
      <div className="home-summary-line" data-testid="home-dashboard-metrics">
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
      <div className="dashboard-columns">
        <section className="dashboard-card">
          <div className="section-heading">
            <h3>Continue writing</h3>
            <button
              className="text-button"
              onClick={() => handleNavChange("essays")}
            >
              All essays <ArrowIcon />
            </button>
          </div>
          {recent.length ? (
            essayList(recent)
          ) : (
            <div className="quiet-empty">
              <EssaysIcon />
              <h4>Start with a rough draft.</h4>
              <p>Your first version doesn’t need to be perfect.</p>
              <button
                className="secondary-action-btn"
                data-testid="home-dashboard-start-essay"
                onClick={() => handleOpenNewEssayForm()}
              >
                <PlusIcon /> Start an essay
              </button>
            </div>
          )}
        </section>
        <section className="dashboard-card">
          <div className="section-heading">
            <h3>Upcoming deadlines</h3>
            <button
              className="text-button"
              onClick={() => handleNavChange("deadlines")}
            >
              Calendar <ArrowIcon />
            </button>
          </div>
          {upcoming.length ? (
            <div className="upcoming-list">
              {upcoming.map((app) => {
                const date = parseDate(app.deadline);
                return (
                  <button
                    className="deadline-row"
                    key={app.id}
                    onClick={() => setSelectedApplicationId(app.id)}
                  >
                    <span className="date-tile">
                      <small>
                        {date.toLocaleDateString(undefined, { month: "short" })}
                      </small>
                      <strong>{date.getDate()}</strong>
                    </span>
                    <span className="list-copy">
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
            <div className="quiet-empty">
              <DeadlinesIcon />
              <h4>No upcoming deadlines.</h4>
              <p>Check your applications to keep your dates current.</p>
              <button
                className="text-button"
                onClick={() => handleNavChange("tracker")}
              >
                View applications <ArrowIcon />
              </button>
            </div>
          )}
        </section>
      </div>
      {showHomeChecklist && (
        <section className="practice-banner practice-banner-compact">
          <span className="practice-banner-icon">
            <InterviewIcon />
          </span>
          <div>
            <h3>Have 90 seconds?</h3>
            <p>Practise one interview answer, out loud.</p>
          </div>
          <button
            className="secondary-action-btn"
            onClick={() => handleNavChange("interviews")}
          >
            Start practising <ArrowIcon />
          </button>
        </section>
      )}
    </div>
  );
}
