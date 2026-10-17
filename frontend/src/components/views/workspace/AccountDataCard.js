import React, { useState } from "react";
import { deleteAccountApi, exportAccountApi } from "../../../api/accountApi";
import {
  clearUserBrowserData,
  collectUserBrowserData,
  downloadJson,
} from "../../../app/accountData";
import "./WorkspaceAccount.css";

function errorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (detail && typeof detail === "object" && detail.message)
    return detail.message;
  if (typeof detail === "string") return detail;
  return fallback;
}

export default function AccountDataCard({ user, logout }) {
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const downloadMyData = async () => {
    setExporting(true);
    setExportStatus("");
    try {
      const archive = await exportAccountApi();
      archive.browser_storage = collectUserBrowserData(user?.id);
      const day = new Date().toISOString().slice(0, 10);
      downloadJson(archive, `masters-account-export-${day}.json`);
      setExportStatus("Your data has been downloaded.");
    } catch (error) {
      setExportStatus(
        errorMessage(error, "We could not prepare your data. Try again."),
      );
    } finally {
      setExporting(false);
    }
  };

  const cancel = () => {
    setConfirming(false);
    setPassword("");
    setTyped("");
    setDeleteError("");
  };

  const deleteMyAccount = async (event) => {
    event.preventDefault();
    if (typed !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccountApi(password);
    } catch (error) {
      setDeleting(false);
      setDeleteError(
        errorMessage(error, "Your account could not be deleted. Try again."),
      );
      return;
    }
    clearUserBrowserData(user?.id);
    await logout();
  };

  return (
    <section
      className="wac-section"
      data-testid="settings-account-data"
      aria-labelledby="wac-data-title"
    >
      <div className="wac-section__intro">
        <h3 className="ws-h3" id="wac-data-title">
          Your data
        </h3>
        <p className="ws-help">
          Download everything we store for your account, or delete it
          permanently.
        </p>
      </div>
      <div className="ws-card ws-stack wac-section__body">
        <div className="wac-data-block">
          <div>
            <h4 className="wac-data-block__title">Download my data</h4>
            <p className="ws-help">
              A JSON file with your applications, essays, interview practice
              and notes from this browser.
            </p>
          </div>
          <button
            type="button"
            className="ws-btn"
            data-testid="settings-download-data"
            onClick={downloadMyData}
            disabled={exporting}
          >
            {exporting ? "Preparing…" : "Download my data"}
          </button>
        </div>
        {exportStatus && (
          <p className="ws-small ws-muted" role="status">
            {exportStatus}
          </p>
        )}
        <div className="ws-divider" />
        <div className="wac-data-block wac-data-block--danger">
          <div>
            <h4 className="wac-data-block__title">Delete my account</h4>
            <p className="ws-help">
              Permanent. You will be asked to confirm before anything is
              removed.
            </p>
          </div>
          {!confirming && (
            <button
              type="button"
              className="ws-btn ws-btn--danger"
              data-testid="settings-delete-account"
              onClick={() => setConfirming(true)}
            >
              Delete my account
            </button>
          )}
        </div>
        {confirming && (
          <form
            className="wac-danger-form ws-stack ws-stack--sm"
            onSubmit={deleteMyAccount}
            data-testid="settings-delete-form"
          >
            <p className="wac-danger-form__warn">
              This permanently deletes your applications, essays, interview
              practice and feedback, and signs you out everywhere. It cannot be
              undone. Backups expire on a schedule rather than immediately.
            </p>
            <div className="ws-field">
              <label className="ws-label" htmlFor="delete-password">
                Password
              </label>
              <input
                id="delete-password"
                className="ws-input"
                type="password"
                autoComplete="current-password"
                data-testid="settings-delete-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="ws-help">
                Signed in with Google? Leave this empty. If you signed in more
                than 10 minutes ago, sign out and back in first.
              </p>
            </div>
            <div className="ws-field">
              <label className="ws-label" htmlFor="delete-confirm">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirm"
                className="ws-input"
                data-testid="settings-delete-confirm"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
            {deleteError && (
              <p className="ws-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="ws-row">
              <button
                type="button"
                className="ws-btn"
                onClick={cancel}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ws-btn ws-btn--danger wac-btn-delete"
                data-testid="settings-delete-submit"
                disabled={typed !== "DELETE" || deleting}
              >
                {deleting ? "Deleting…" : "Permanently delete my account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
