import React from "react";
import { catalogStatusLabel } from "../../../app/catalogAutofill";
import "./WorkspacePlanning.css";

function TrackerView({
  onOpenApplication,
  handleOpenApplicationForm,
  applicationSearch,
  setApplicationSearch,
  applicationSummary,
  showApplicationForm,
  editingApplicationId,
  handleApplicationSubmit,
  applicationFormData,
  setApplicationFormData,
  UNIVERSITY_OPTIONS,
  DEGREE_OPTIONS,
  setApplicationDegreeChoice,
  setApplicationCustomDegree,
  applicationLoading,
  setShowApplicationForm,
  resetApplicationForm,
  handleDiscardApplicationDraft,
  applicationDraftRecovered,
  filteredApplications,
  getDaysUntilDeadline,
  getApplicationReadiness,
  parseDate,
  handleDeleteApplication,
  programCatalog,
  programCatalogLoading,
  onApplyProgramCatalogItem,
}) {
  const formRef = React.useRef(null);
  const listRef = React.useRef(null);
  const wasEditing = React.useRef(false);
  React.useEffect(() => {
    if (showApplicationForm && formRef.current) {
      formRef.current.scrollIntoView({ block: "start" });
      formRef.current.querySelector("h2")?.focus({ preventScroll: true });
    } else if (wasEditing.current && listRef.current) {
      listRef.current.scrollIntoView({ block: "start" });
      listRef.current.focus({ preventScroll: true });
    }
    wasEditing.current = showApplicationForm;
  }, [showApplicationForm, editingApplicationId]);
  const [catalogSelectionId, setCatalogSelectionId] = React.useState("");
  const selectedCatalogItem = (programCatalog || []).find(
    (item) => item.id === catalogSelectionId,
  );
  const update = (key, value) =>
    setApplicationFormData((prev) => ({ ...prev, [key]: value }));
  const field = (key, label, type = "text", options = {}) => (
    <div className="ws-field" key={key}>
      <label className="ws-label" htmlFor={`application-${key}`}>{label}</label>
      <input className="ws-input"
        id={`application-${key}`}
        type={type}
        value={applicationFormData[key] ?? ""}
        onChange={(e) => update(key, e.target.value)}
        {...options}
      />
    </div>
  );
  const select = (key, label, values) => (
    <div className="ws-field">
      <label className="ws-label" htmlFor={`application-${key}`}>{label}</label>
      <select className="ws-select"
        id={`application-${key}`}
        value={applicationFormData[key]}
        onChange={(e) => update(key, e.target.value)}
      >
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
  const localToday = new Date();
  const minDate = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
  const cancel = () => {
    setShowApplicationForm(false);
    resetApplicationForm();
  };
  return (
    <div className="wpl wpl-tracker">
      {!showApplicationForm && (
        <>
          <div className="wpl-toolbar">
            <h2
              ref={listRef}
              tabIndex={-1}
              data-testid="tracker-heading"
              className="sr-only"
            >
              Application shortlist
            </h2>
            {(filteredApplications.length > 0 || applicationSearch) && (
              <div className="wpl-search">
                <input
                  className="ws-input"
                  data-testid="tracker-search-input"
                  type="search"
                  value={applicationSearch}
                  onChange={(e) => setApplicationSearch(e.target.value)}
                  placeholder="Filter by school, programme or status…"
                  aria-label="Filter applications"
                />
                {applicationSearch && (
                  <button
                    type="button"
                    className="ws-btn ws-btn--ghost"
                    onClick={() => setApplicationSearch("")}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              data-testid="tracker-add-application"
              className="ws-btn ws-btn--primary wpl-add"
              onClick={() => handleOpenApplicationForm()}
            >
              + Add application
            </button>
          </div>
          <p className="ws-muted wpl-lede">
            Keep each programme and its deadline together.
            {applicationSummary.upcoming > 0 && (
              <>
                {" "}
                <strong>{applicationSummary.dueSoon}</strong> due within 21
                days · <strong>{applicationSummary.upcoming}</strong> upcoming
                deadlines.
              </>
            )}
          </p>
        </>
      )}
      {showApplicationForm && (
        <section
          ref={formRef}
          className="ws-card wpl-form-card"
          data-testid="tracker-form-card"
        >
          <div className="wpl-form-head">
            <div>
              <h2 tabIndex={-1}>
                {editingApplicationId
                  ? "Edit application"
                  : "Add an application"}
              </h2>
              <p className="ws-muted">
                Start with the essentials. You can add everything else later.
              </p>
            </div>
            <button
              className="ws-btn ws-btn--ghost"
              type="button"
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
          {applicationDraftRecovered && !editingApplicationId && (
            <div className="ws-alert ws-alert--warn wpl-banner">
              <p>Recovered an unsaved draft from this browser.</p>
              <button
                type="button"
                className="ws-btn ws-btn--sm"
                onClick={handleDiscardApplicationDraft}
              >
                Discard local draft
              </button>
            </div>
          )}
          <form className="wpl-form" onSubmit={handleApplicationSubmit}>
            <div className="wpl-form-grid">
              {field("school_name", "School", "text", {
                required: true,
                minLength: 2,
                maxLength: 160,
                list: "application-university-options",
                placeholder: "e.g. IIM Ahmedabad",
                "data-testid": "tracker-school-input",
              })}
              <datalist id="application-university-options">
                {UNIVERSITY_OPTIONS.map((school) => (
                  <option key={school} value={school} />
                ))}
              </datalist>
              <div className="ws-field">
                <label className="ws-label" htmlFor="application-program">Programme</label>
                <input className="ws-input"
                  id="application-program"
                  data-testid="tracker-program-input"
                  required
                  minLength={2}
                  maxLength={160}
                  value={applicationFormData.program_name}
                  list="application-program-options"
                  placeholder="e.g. PGPX, EPGP or MBA"
                  onChange={(e) => {
                    const value = e.target.value;
                    update("program_name", value);
                    setApplicationDegreeChoice(
                      DEGREE_OPTIONS.includes(value) ? value : "Other",
                    );
                    setApplicationCustomDegree(
                      DEGREE_OPTIONS.includes(value) ? "" : value,
                    );
                  }}
                />
                <datalist id="application-program-options">
                  {DEGREE_OPTIONS.filter((x) => x !== "Other").map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </div>
              {field("deadline", "Application deadline", "date", {
                required: true,
                min: editingApplicationId ? undefined : minDate,
                "data-testid": "tracker-deadline-input",
              })}
            </div>
            <details className="wpl-disclosure">
              <summary>
                Use a catalogue template <span>Optional</span>
              </summary>
              <div className="ws-field">
                <label className="ws-label" htmlFor="application-catalog">Choose a programme</label>
                <select className="ws-select"
                  id="application-catalog"
                  data-testid="tracker-program-catalog-select"
                  value={catalogSelectionId}
                  onChange={(e) => {
                    setCatalogSelectionId(e.target.value);
                    const item = (programCatalog || []).find(
                      (item) => item.id === e.target.value,
                    );
                    if (item) onApplyProgramCatalogItem(item);
                  }}
                >
                  <option value="">Select a programme…</option>
                  {(programCatalog || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.school_name} · {item.program_name}
                      {item.autofill_allowed ? "" : " (unverified)"}
                    </option>
                  ))}
                </select>
                {selectedCatalogItem && (
                  <p
                    className="ws-small ws-muted"
                    data-testid="tracker-catalog-status"
                  >
                    {catalogStatusLabel(selectedCatalogItem)}
                    {selectedCatalogItem.source_url && (
                      <>
                        {" · "}
                        <a
                          href={selectedCatalogItem.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Official source
                        </a>
                      </>
                    )}
                  </p>
                )}
                <small className="ws-help">
                  {programCatalogLoading
                    ? "Loading templates…"
                    : "Templates cover a small set of programmes. Check dates and requirements on the school’s website."}
                </small>
              </div>
            </details>
            <details
              className="wpl-disclosure"
              open={editingApplicationId ? true : undefined}
            >
              <summary>
                Progress & requirements <span>Optional</span>
              </summary>
              <div className="wpl-form-grid">
                {field("application_round", "Application round")}
                {select("status", "Application status", [
                  "Planning",
                  "In Progress",
                  "Submitted",
                  "Awaiting Decision",
                  "Complete",
                ])}
                {field("essays_required", "Essays required", "number", {
                  min: 0,
                  step: 1,
                })}
                {field("lors_required", "Recommendations required", "number", {
                  min: 0,
                  step: 1,
                })}
                {field(
                  "lors_submitted",
                  "Recommendations submitted",
                  "number",
                  { min: 0, max: applicationFormData.lors_required, step: 1 },
                )}
                {select("decision_status", "Decision", [
                  "Pending",
                  "Interview Invite",
                  "Waitlisted",
                  "Admitted",
                  "Rejected",
                  "Accepted",
                  "Interview",
                ])}
                <label className="ws-check">
                  <input
                    type="checkbox"
                    checked={applicationFormData.interview_required}
                    onChange={(e) =>
                      setApplicationFormData((prev) => ({
                        ...prev,
                        interview_required: e.target.checked,
                        interview_completed: e.target.checked
                          ? prev.interview_completed
                          : false,
                      }))
                    }
                  />
                  Interview required
                </label>
                <label className="ws-check">
                  <input
                    type="checkbox"
                    checked={applicationFormData.interview_completed}
                    disabled={!applicationFormData.interview_required}
                    onChange={(e) =>
                      update("interview_completed", e.target.checked)
                    }
                  />
                  Interview completed
                </label>
              </div>
              <p className="ws-help">
                Check the requirements for your programme; the initial counts
                are placeholders.
              </p>
            </details>
            <details className="wpl-disclosure">
              <summary>
                Fees & notes <span>Optional</span>
              </summary>
              <div className="wpl-form-grid">
                {field("application_fee", "Application fee", "number", {
                  min: 0,
                  step: 0.01,
                })}
                {field("program_total_fee", "Total programme fee", "number", {
                  min: 0,
                  step: 0.01,
                })}
                {select("fee_currency", "Currency", [
                  "USD",
                  "EUR",
                  "GBP",
                  "INR",
                ])}
                <div className="ws-field wpl-span">
                  <label className="ws-label" htmlFor="application-notes">Notes</label>
                  <textarea className="ws-textarea"
                    id="application-notes"
                    maxLength={4000}
                    value={applicationFormData.requirements_notes}
                    onChange={(e) =>
                      update("requirements_notes", e.target.value)
                    }
                    placeholder="Anything useful to remember…"
                  />
                </div>
              </div>
            </details>
            <div className="wpl-form-actions">
              <button
                type="submit"
                className="ws-btn ws-btn--primary"
                disabled={applicationLoading}
              >
                {applicationLoading
                  ? "Saving…"
                  : editingApplicationId
                    ? "Save changes"
                    : "Add application"}
              </button>
            </div>
          </form>
        </section>
      )}
      {!showApplicationForm && (
        <div className="wpl-app-list">
          {!filteredApplications.length ? (
            <div className="ws-empty wpl-empty">
              <h2 className="ws-empty__title">
                {applicationSearch
                  ? "No matching applications"
                  : "Your shortlist starts here"}
              </h2>
              <p>
                {applicationSearch
                  ? "Try another school or clear your filter."
                  : "Add one programme to start tracking its deadline."}
              </p>
              {applicationSearch && (
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => setApplicationSearch("")}
                >
                  Show all applications
                </button>
              )}
            </div>
          ) : (
            filteredApplications.map((application) => {
              const daysUntil = getDaysUntilDeadline(application.deadline);
              const readiness = getApplicationReadiness(application);
              const deadlineDate = parseDate(application.deadline);
              const deadlineText =
                daysUntil === null
                  ? "No deadline"
                  : daysUntil < 0
                    ? "Deadline passed"
                    : daysUntil === 0
                      ? "Due today"
                      : `${daysUntil} days left`;
              const tone =
                daysUntil === null
                  ? ""
                  : daysUntil < 0
                    ? "ws-chip--danger"
                    : daysUntil <= 21
                      ? "ws-chip--warn"
                      : "";
              return (
                <article
                  key={application.id}
                  className="ws-card wpl-app"
                  data-testid="tracker-application-card"
                >
                  <div className="wpl-app__deadline">
                    <span className="wpl-app__label">Deadline</span>
                    <strong className="wpl-app__date">
                      {deadlineDate?.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) || "Not set"}
                    </strong>
                    <span className={`ws-chip ${tone}`}>{deadlineText}</span>
                  </div>
                  <div className="wpl-app__main">
                    <div className="wpl-app__titles">
                      <h3>{application.school_name}</h3>
                      <p className="ws-muted">{application.program_name}</p>
                    </div>
                    <span className="ws-chip ws-chip--info wpl-app__status">
                      {application.status}
                    </span>
                    <div
                      className="wpl-progress"
                      role="img"
                      aria-label={`Checklist ${readiness.readiness}% complete`}
                    >
                      <span className="wpl-progress__label">
                        Checklist {readiness.readiness}%
                      </span>
                      <span className="wpl-progress__bar">
                        <span style={{ width: `${readiness.readiness}%` }} />
                      </span>
                    </div>
                  </div>
                  <div className="wpl-app__actions">
                    <button
                      type="button"
                      className="ws-btn ws-btn--solid"
                      aria-label={`Open ${application.school_name} application`}
                      onClick={() => onOpenApplication(application.id)}
                    >
                      Open application
                    </button>
                    <button
                      type="button"
                      className="ws-btn"
                      aria-label={`Edit ${application.school_name} application`}
                      onClick={() => handleOpenApplicationForm(application)}
                    >
                      Edit
                    </button>
                  </div>
                  <details className="wpl-disclosure wpl-app__more">
                    <summary>More details</summary>
                    <dl className="wpl-dl">
                      <div>
                        <dt>Round</dt>
                        <dd>{application.application_round || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Decision</dt>
                        <dd>{application.decision_status || "Pending"}</dd>
                      </div>
                      <div>
                        <dt>Recommendations</dt>
                        <dd>
                          {application.lors_submitted}/
                          {application.lors_required} submitted
                        </dd>
                      </div>
                      <div>
                        <dt>Essays required</dt>
                        <dd>{application.essays_required}</dd>
                      </div>
                      <div>
                        <dt>Application fee</dt>
                        <dd>
                          {application.application_fee != null
                            ? `${application.fee_currency} ${Number(application.application_fee).toLocaleString()}`
                            : "Not added"}
                        </dd>
                      </div>
                      <div>
                        <dt>Programme fee</dt>
                        <dd>
                          {application.program_total_fee != null
                            ? `${application.fee_currency} ${Number(application.program_total_fee).toLocaleString()}`
                            : "Not added"}
                        </dd>
                      </div>
                      <div>
                        <dt>Interview</dt>
                        <dd>
                          {application.interview_required
                            ? application.interview_completed
                              ? "Completed"
                              : "Pending"
                            : "Not required"}
                        </dd>
                      </div>
                    </dl>
                    {application.requirements_notes && (
                      <p className="wpl-notes">
                        {application.requirements_notes}
                      </p>
                    )}
                    <button
                      type="button"
                      className="ws-btn ws-btn--danger ws-btn--sm"
                      aria-label={`Delete ${application.school_name} application`}
                      onClick={() => handleDeleteApplication(application.id)}
                    >
                      Delete application
                    </button>
                  </details>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
export default TrackerView;
