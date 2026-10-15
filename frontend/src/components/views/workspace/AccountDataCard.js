import React, { useState } from "react";
import { deleteAccountApi, exportAccountApi } from "../../../api/accountApi";
import {
  clearUserBrowserData,
  collectUserBrowserData,
  downloadJson,
} from "../../../app/accountData";

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
    <section className="settings-card" data-testid="settings-account-data">
      <h3>Your data</h3>
      <p>
        Download everything we store for your account, or delete it permanently.
      </p>
      <div className="form-actions">
        <button
          type="button"
          data-testid="settings-download-data"
          onClick={downloadMyData}
          disabled={exporting}
        >
          {exporting ? "Preparing…" : "Download my data"}
        </button>
        {!confirming && (
          <button
            type="button"
            className="danger"
            data-testid="settings-delete-account"
            onClick={() => setConfirming(true)}
          >
            Delete my account
          </button>
        )}
      </div>
      {exportStatus && (
        <p className="settings-footnote" role="status">
          {exportStatus}
        </p>
      )}
      {confirming && (
        <form
          className="feedback-form"
          onSubmit={deleteMyAccount}
          data-testid="settings-delete-form"
        >
          <p>
            This permanently deletes your applications, essays, interview
            practice and feedback, and signs you out everywhere. It cannot be
            undone. Backups expire on a schedule rather than immediately.
          </p>
          <div className="form-group">
            <label htmlFor="delete-password">Password</label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              data-testid="settings-delete-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small>
              Signed in with Google? Leave this empty. If you signed in more
              than 10 minutes ago, sign out and back in first.
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="delete-confirm">Type DELETE to confirm</label>
            <input
              id="delete-confirm"
              data-testid="settings-delete-confirm"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
          {deleteError && (
            <p className="error-message" role="alert">
              {deleteError}
            </p>
          )}
          <div className="form-actions">
            <button type="button" onClick={cancel} disabled={deleting}>
              Cancel
            </button>
            <button
              type="submit"
              className="danger"
              data-testid="settings-delete-submit"
              disabled={typed !== "DELETE" || deleting}
            >
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
