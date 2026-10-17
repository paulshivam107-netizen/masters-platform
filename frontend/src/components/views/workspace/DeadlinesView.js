import React from "react";
import "./WorkspacePlanning.css";

function DeadlinesView({
  handleOpenApplicationForm,
  deadlineBuckets,
  handleExportDeadlinesICS,
  setTimelineMonthOffset,
  timelineMonthLabel,
  timelineCells,
  setSelectedApplicationId,
  setDocsApplicationId,
  setActiveNav,
  applicationsByDeadline,
  getDaysUntilDeadline,
  parseDate,
}) {
  if (!applicationsByDeadline.length)
    return (
      <div className="wpl wpl-empty-wrap">
        <div className="ws-empty wpl-empty">
          <h2 className="ws-empty__title">Your calendar starts with a deadline</h2>
          <p>Add a programme to see its application date here.</p>
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            onClick={() => handleOpenApplicationForm()}
          >
            Add application
          </button>
        </div>
      </div>
    );
  return (
    <div className="wpl wpl-deadlines">
      <h2 className="sr-only" data-testid="deadlines-heading">
        Deadlines
      </h2>
      <div className="wpl-stats">
        <div className="wpl-stat wpl-stat--late">
          <span className="wpl-stat__n ws-num">
            {deadlineBuckets.overdue.length}
          </span>
          <h3>Overdue</h3>
        </div>
        <div className="wpl-stat wpl-stat--soon">
          <span className="wpl-stat__n ws-num">
            {deadlineBuckets.critical.length}
          </span>
          <h3>Due in 14 days</h3>
        </div>
        <div className="wpl-stat">
          <span className="wpl-stat__n ws-num">
            {deadlineBuckets.upcoming.length}
          </span>
          <h3>Upcoming</h3>
        </div>
        <button
          type="button"
          data-testid="deadlines-export-ics"
          className="ws-btn wpl-stats__export"
          onClick={handleExportDeadlinesICS}
        >
          Download calendar (.ics)
        </button>
      </div>

      <section className="ws-card wpl-month" aria-label="Month view">
        <div className="wpl-month__head">
          <h3 className="ws-h3">Month view</h3>
          <div className="wpl-month__nav">
            <button
              type="button"
              data-testid="deadlines-timeline-prev"
              className="ws-btn ws-btn--sm"
              onClick={() => setTimelineMonthOffset((prev) => prev - 1)}
            >
              Previous
            </button>
            <span className="wpl-month__label">{timelineMonthLabel}</span>
            <button
              type="button"
              data-testid="deadlines-timeline-next"
              className="ws-btn ws-btn--sm"
              onClick={() => setTimelineMonthOffset((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="wpl-grid wpl-grid--head">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
            <div key={weekday} className="wpl-weekday">
              {weekday}
            </div>
          ))}
        </div>
        <div className="wpl-grid">
          {timelineCells.map((cell) =>
            cell.kind === "empty" ? (
              <div key={cell.key} className="wpl-day wpl-day--empty" />
            ) : (
              <div
                key={cell.key}
                className={`wpl-day ${cell.applications.length ? "has-deadline" : ""}`}
              >
                <div className="wpl-day__n">{cell.day}</div>
                <div className="wpl-day__events">
                  {cell.applications.slice(0, 2).map((application) => (
                    <button
                      type="button"
                      data-testid="deadlines-timeline-event"
                      key={`timeline-${application.id}-${cell.key}`}
                      className="wpl-day__event"
                      onClick={() => {
                        setSelectedApplicationId(application.id);
                        setDocsApplicationId(application.id);
                        setActiveNav("home");
                      }}
                    >
                      {application.school_name}
                    </button>
                  ))}
                  {cell.applications.length > 2 && (
                    <span className="wpl-day__more">
                      +{cell.applications.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="ws-card wpl-agenda" aria-label="Deadline agenda">
        <h3 className="ws-h3">Agenda</h3>
        {applicationsByDeadline.length === 0 ? null : (
          <div className="wpl-agenda__list">
            {applicationsByDeadline.map((application) => {
              const days = getDaysUntilDeadline(application.deadline);
              const urgencyClass =
                days !== null && days < 0
                  ? "late"
                  : days !== null && days <= 14
                    ? "critical"
                    : "upcoming";
              const urgencyLabel =
                days === null
                  ? "No deadline"
                  : days < 0
                    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                    : days === 0
                      ? "Due today"
                      : `${days} day${days === 1 ? "" : "s"} left`;
              const date = parseDate(application.deadline);
              return (
                <article
                  key={`deadline-${application.id}`}
                  className={`wpl-agenda__item is-${urgencyClass}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                  onClick={() => {
                    setSelectedApplicationId(application.id);
                    setDocsApplicationId(application.id);
                    setActiveNav("home");
                  }}
                >
                  <div className="wpl-agenda__date" aria-hidden="true">
                    <span>
                      {date?.toLocaleDateString(undefined, { month: "short" }) ||
                        "–"}
                    </span>
                    <strong>{date?.getDate() || ""}</strong>
                  </div>
                  <div className="wpl-agenda__main">
                    <strong>{application.school_name}</strong>
                    <span className="ws-muted">{application.program_name}</span>
                    <span className="ws-small ws-muted">
                      {date?.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) || "No date"}
                    </span>
                  </div>
                  <span
                    className={`ws-chip ${
                      urgencyClass === "late"
                        ? "ws-chip--danger"
                        : urgencyClass === "critical"
                          ? "ws-chip--warn"
                          : ""
                    }`}
                  >
                    {urgencyLabel}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default DeadlinesView;
