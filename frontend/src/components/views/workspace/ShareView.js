import React, { useState } from "react";
import { DocsIcon, DeadlinesIcon, ShareIcon } from "../../../app/icons";
export default function ShareView({
  shareSummary,
  applications,
  handleExportApplicationsCsv,
  handleExportDeadlinesICS,
  handleCopyShareSummary,
  handleOpenApplicationForm,
}) {
  const [message, setMessage] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const perform = async (key, action) => {
    if (key === "summary") setShowSummary(true);
    setMessage(key === "summary" ? "Copying…" : "Preparing download…");
    try {
      await action();
      setMessage(
        key === "summary"
          ? "Summary copied."
          : "Download requested. Check your browser’s downloads.",
      );
    } catch {
      setMessage(
        key === "summary"
          ? "Automatic copying is unavailable. Select and copy the text below."
          : "The download could not start. Please try again.",
      );
    }
  };
  if (!applications.length)
    return (
      <div className="empty-state-main">
        <h2>Nothing to export yet</h2>
        <p>Add an application to create a plan you can download or share.</p>
        <button
          className="history-btn"
          onClick={() => handleOpenApplicationForm()}
        >
          Add application
        </button>
      </div>
    );
  return (
    <section className="share-panel">
      <h2 className="sr-only" data-testid="share-heading">
        Export your plan
      </h2>
      <div className="export-options">
        {[
          [
            "csv",
            <DocsIcon />,
            "Application spreadsheet",
            "Download your tracked programmes and application details as a CSV file.",
            "Download CSV",
            handleExportApplicationsCsv,
          ],
          [
            "ics",
            <DeadlinesIcon />,
            "Calendar file",
            "Download deadlines to import into your calendar. Later edits require a new download.",
            "Download calendar",
            handleExportDeadlinesICS,
          ],
          [
            "summary",
            <ShareIcon />,
            "Progress summary",
            "Copy a text overview to share with a mentor or keep in your notes.",
            "Copy summary",
            handleCopyShareSummary,
          ],
        ].map(([key, icon, title, description, label, action]) => (
          <article className="dashboard-card export-option" key={key}>
            {icon}
            <h3>{title}</h3>
            <p>{description}</p>
            <button
              data-testid={
                key === "summary" ? "share-copy-summary" : `share-export-${key}`
              }
              className="secondary-action-btn"
              onClick={() => perform(key, action)}
            >
              {label}
            </button>
          </article>
        ))}
      </div>
      {message && (
        <p role="status" className="field-help">
          {message}
        </p>
      )}
      {showSummary && (
        <div className="form-group">
          <label htmlFor="share-summary-text">Your summary</label>
          <textarea
            id="share-summary-text"
            readOnly
            rows={12}
            value={shareSummary}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
      <p className="field-help">
        Review the downloaded or copied content before sharing it.
      </p>
    </section>
  );
}
