import React, { useEffect, useState } from "react";
import * as interviewsApi from "../../../api/interviewsApi";
import { Link } from "react-router-dom";
import "./WorkspaceInterview.css";
import SetupGuide from "./SetupGuide";
import ApplicationDetail from "./ApplicationDetail";
import {
  ApplicationsIcon,
  ArrowIcon,
  DeadlinesIcon,
  EssaysIcon,
  InterviewIcon,
  PlusIcon,
} from "../../../app/icons";

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
  const [practice, setPractice] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    interviewsApi
      .listInterviews(0, controller.signal)
      .then((page) => {
        if (controller.signal.aborted || !page.completed_count) return;
        const latest = page.items.find((i) => i.readiness?.status === "full");
        setPractice({ count: page.completed_count, score: latest?.readiness.score });
      })
      .catch(() => {}); // the existing start card stays
    return () => controller.abort();
  }, []);
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
      <ApplicationDetail
        application={selectedApplication}
        essays={essaysForSelectedApplication}
        essayList={essayList}
        parseDate={parseDate}
        getApplicationReadiness={getApplicationReadiness}
        setSelectedApplicationId={setSelectedApplicationId}
        handleOpenNewEssayForm={handleOpenNewEssayForm}
        handleOpenApplicationForm={handleOpenApplicationForm}
        handleNavChange={handleNavChange}
      />
    );

  const practiceCard = practice && (
    <section className="ws-card ws-card--soft wi-banner" data-testid="home-practice">
      <span className="wi-row__icon">
        <InterviewIcon />
      </span>
      <div>
        <h3>
          You’ve done {practice.count}{" "}
          {practice.count === 1 ? "interview" : "interviews"}
        </h3>
        {practice.score != null && <p>Latest readiness {practice.score}/100</p>}
      </div>
      <button className="ws-btn" onClick={() => handleNavChange("interviews")}>
        Practise again <ArrowIcon />
      </button>
    </section>
  );

  const isFirstVisit = !applications.length && !essays.length;
  if (isFirstVisit)
    return (
      <section className="wi-home ws-stack" data-testid="home-first-visit">
        <div className="wi-welcome">
          <div className="wi-welcome__copy">
            <span className="ws-eyebrow">
              <span aria-hidden="true" />
              Let’s get started
            </span>
            <h2>
              Welcome, <span>{firstName}.</span>
            </h2>
            {practiceCard || (
              <>
                <p>
                  A short mock interview with follow-ups on your own answers
                  and a debrief when you finish. No résumé needed.
                </p>
                <div className="ws-row">
                  <button
                    className="ws-btn ws-btn--primary"
                    data-testid="home-start-interview"
                    onClick={() => handleNavChange("interviews")}
                  >
                    Start your first mock interview <ArrowIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <Link className="ws-btn ws-btn--ghost ws-btn--sm" to="/help">
          New here? See the two-minute setup guide <ArrowIcon />
        </Link>
        <div className="ws-card" data-testid="home-track-card">
          <h3>Track your applications</h3>
          <p className="ws-muted">
            Add a programme you’re considering, on any route, with its official
            deadline. Build your plan at your own pace.
          </p>
          <button
            className="ws-btn ws-btn--ghost ws-btn--sm"
            data-testid="home-dashboard-start-application"
            onClick={() => handleOpenApplicationForm()}
          >
            Add your first application <ArrowIcon />
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
      {practiceCard}
      {showHomeChecklist && !practice && (
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
