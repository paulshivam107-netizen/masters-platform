import React from "react";

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
  const update = (key, value) =>
    setApplicationFormData((prev) => ({ ...prev, [key]: value }));
  const field = (key, label, type = "text", options = {}) => (
    <div className="form-group" key={key}>
      <label htmlFor={`application-${key}`}>{label}</label>
      <input
        id={`application-${key}`}
        type={type}
        value={applicationFormData[key] ?? ""}
        onChange={(e) => update(key, e.target.value)}
        {...options}
      />
    </div>
  );
  const select = (key, label, values) => (
    <div className="form-group">
      <label htmlFor={`application-${key}`}>{label}</label>
      <select
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
    <div className="tracker-panel">
      {!showApplicationForm && (
        <>
          <div className="tracker-top-row">
            <div>
              <h2
                ref={listRef}
                tabIndex={-1}
                data-testid="tracker-heading"
                className="sr-only"
              >
                Application shortlist
              </h2>
              <p>Keep each programme and its deadline together.</p>
            </div>
            <button
              type="button"
              data-testid="tracker-add-application"
              className="new-essay-btn tracker-add-btn"
              onClick={() => handleOpenApplicationForm()}
            >
              + Add application
            </button>
          </div>
          {applicationSummary.upcoming > 0 && (
            <p className="compact-summary">
              <strong>{applicationSummary.dueSoon}</strong> due within 21 days ·{" "}
              <strong>{applicationSummary.upcoming}</strong> upcoming deadlines
            </p>
          )}
          {(filteredApplications.length > 0 || applicationSearch) && (
            <div className="tracker-search-row">
              <input
                data-testid="tracker-search-input"
                type="search"
                value={applicationSearch}
                onChange={(e) => setApplicationSearch(e.target.value)}
                placeholder="Filter by school, programme or status…"
                aria-label="Filter applications"
              />
              {applicationSearch && (
                <button
                  className="text-button"
                  onClick={() => setApplicationSearch("")}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </>
      )}
      {showApplicationForm && (
        <section
          ref={formRef}
          className="tracker-form-card"
          data-testid="tracker-form-card"
        >
          <div className="section-heading">
            <div>
              <h2 tabIndex={-1}>
                {editingApplicationId
                  ? "Edit application"
                  : "Add an application"}
              </h2>
              <p className="muted">
                Start with the essentials. You can add everything else later.
              </p>
            </div>
            <button className="text-button" type="button" onClick={cancel}>
              Cancel
            </button>
          </div>
          {applicationDraftRecovered && !editingApplicationId && (
            <div className="draft-recovered-banner">
              <p>Recovered an unsaved draft from this browser.</p>
              <button type="button" onClick={handleDiscardApplicationDraft}>
                Discard local draft
              </button>
            </div>
          )}
          <form className="tracker-form" onSubmit={handleApplicationSubmit}>
            <div className="tracker-form-grid">
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
              <div className="form-group">
                <label htmlFor="application-program">Programme</label>
                <input
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
            <details className="progressive-section">
              <summary>
                Use a catalogue template <span>Optional</span>
              </summary>
              <div className="form-group">
                <label htmlFor="application-catalog">Choose a programme</label>
                <select
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
                    </option>
                  ))}
                </select>
                <small>
                  {programCatalogLoading
                    ? "Loading templates…"
                    : "Templates cover a small set of programmes. Check dates and requirements on the school’s website."}
                </small>
              </div>
            </details>
            <details
              className="progressive-section"
              open={editingApplicationId ? true : undefined}
            >
              <summary>
                Progress & requirements <span>Optional</span>
              </summary>
              <div className="tracker-form-grid">
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
                <label className="check-option">
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
                <label className="check-option">
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
              <p className="field-help">
                Check the requirements for your programme; the initial counts
                are placeholders.
              </p>
            </details>
            <details className="progressive-section">
              <summary>
                Fees & notes <span>Optional</span>
              </summary>
              <div className="tracker-form-grid">
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
                <div className="form-group full-width">
                  <label htmlFor="application-notes">Notes</label>
                  <textarea
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
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
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
        <div className="tracker-list-grid">
          {!filteredApplications.length ? (
            <div className="empty-state-main">
              <h2>
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
                  className="secondary-action-btn"
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
              const deadlineText =
                daysUntil === null
                  ? "No deadline"
                  : daysUntil < 0
                    ? "Deadline passed"
                    : daysUntil === 0
                      ? "Due today"
                      : `${daysUntil} days left`;
              return (
                <article
                  key={application.id}
                  className="application-card"
                  data-testid="tracker-application-card"
                >
                  <div className="application-card-top">
                    <div>
                      <h3>{application.school_name}</h3>
                      <p className="application-program">
                        {application.program_name}
                      </p>
                    </div>
                    <span className="application-status">
                      {application.status}
                    </span>
                  </div>
                  <div className="application-card-summary">
                    <span>
                      <strong>Deadline</strong>{" "}
                      {parseDate(application.deadline)?.toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      ) || "Not set"}
                    </span>
                    <span
                      className={`deadline-chip ${daysUntil < 0 ? "late" : ""}`}
                    >
                      {deadlineText}
                    </span>
                  </div>
                  <div className="application-card-footer">
                    <span className="compact-summary">
                      Checklist {readiness.readiness}%
                    </span>
                    <div className="application-actions">
                      <button
                        className="history-btn"
                        aria-label={`Open ${application.school_name} application`}
                        onClick={() => onOpenApplication(application.id)}
                      >
                        Open application
                      </button>
                      <button
                        className="text-button"
                        aria-label={`Edit ${application.school_name} application`}
                        onClick={() => handleOpenApplicationForm(application)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <details className="application-extra">
                    <summary>More details</summary>
                    <dl className="application-meta-grid">
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
                      <p className="application-notes">
                        {application.requirements_notes}
                      </p>
                    )}
                    <button
                      className="delete-btn"
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
