import React, { useCallback, useEffect, useState } from "react";
import {
  archiveAdminCatalogCycleApi,
  createAdminCatalogDraftApi,
  getAdminCatalogHistoryApi,
  listAdminCatalogApi,
  publishAdminCatalogRevisionApi,
  returnAdminCatalogRevisionApi,
  submitAdminCatalogRevisionApi,
  updateAdminCatalogDraftApi,
} from "../../../api";

// Programme catalogue review (R09). Admins draft facts with a source URL and check date,
// submit for review, then publish as verified or unverified. Published revisions are never
// edited: a correction is a new draft, and earlier revisions stay in the history.

const EMPTY_FORM = {
  revision_id: null,
  program_id: "",
  school_name: "",
  program_name: "",
  degree: "",
  country: "India",
  city: "",
  cycle: "",
  application_fee: "",
  fee_currency: "INR",
  round_1: "",
  round_2: "",
  source_url: "",
  checked_at: "",
  change_note: "",
};

function errorText(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length)
    return detail.map((d) => d.msg).join("; ");
  return fallback;
}

function formFromRevision(program, cycle, revision) {
  const rounds = revision?.rounds || [];
  return {
    ...EMPTY_FORM,
    revision_id: revision?.state === "draft" ? revision.id : null,
    program_id: program.id,
    school_name: program.school_name,
    program_name: program.program_name,
    degree: program.degree,
    country: program.country,
    city: program.city || "",
    cycle: cycle.cycle,
    application_fee:
      revision?.application_fee === null ||
      revision?.application_fee === undefined
        ? ""
        : String(revision.application_fee),
    fee_currency: revision?.fee_currency || "INR",
    round_1: rounds[0]?.deadline || "",
    round_2: rounds[1]?.deadline || "",
    source_url: revision?.source_url || "",
    checked_at: revision?.checked_at || "",
    change_note: revision?.state === "draft" ? revision.change_note || "" : "",
  };
}

function payloadFromForm(form) {
  const rounds = [
    ["Round 1", form.round_1],
    ["Round 2", form.round_2],
  ]
    .filter(([, deadline]) => deadline)
    .map(([label, deadline]) => ({ label, deadline }));
  return {
    program_id: form.program_id.trim() || undefined,
    school_name: form.school_name,
    program_name: form.program_name,
    degree: form.degree,
    country: form.country,
    city: form.city || null,
    cycle: form.cycle,
    application_fee:
      form.application_fee === "" ? null : Number(form.application_fee),
    fee_currency: form.fee_currency || "INR",
    rounds,
    source_url: form.source_url || null,
    checked_at: form.checked_at || null,
    change_note: form.change_note,
  };
}

export default function CatalogReview() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState({ programId: null, rows: [] });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setListing(await listAdminCatalogApi());
    } catch (error) {
      setMessage(errorText(error, "Could not load the catalogue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, success) => {
    try {
      setBusy(true);
      setMessage("");
      await action();
      setMessage(success);
      await load();
      if (history.programId) {
        setHistory({
          programId: history.programId,
          rows: await getAdminCatalogHistoryApi(history.programId),
        });
      }
    } catch (error) {
      setMessage(errorText(error, "Catalogue action failed."));
    } finally {
      setBusy(false);
    }
  };

  const change = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const saveDraft = (event) => {
    event.preventDefault();
    const payload = payloadFromForm(form);
    run(async () => {
      if (form.revision_id)
        await updateAdminCatalogDraftApi(form.revision_id, payload);
      else await createAdminCatalogDraftApi(payload);
      setForm(EMPTY_FORM);
    }, "Draft saved. Submit it for review when the source is checked.");
  };

  const publish = (revision, status) => {
    const note =
      status === "verified"
        ? "Checked against the official source."
        : "Published as unverified.";
    run(
      () => publishAdminCatalogRevisionApi(revision.id, status, note),
      `Revision ${revision.revision_number} published as ${status}.`,
    );
  };

  const showHistory = async (programId) => {
    if (history.programId === programId) {
      setHistory({ programId: null, rows: [] });
      return;
    }
    try {
      setHistory({
        programId,
        rows: await getAdminCatalogHistoryApi(programId),
      });
    } catch (error) {
      setMessage(errorText(error, "Could not load history."));
    }
  };

  const items = listing?.items || [];

  return (
    <div className="admin-catalog-review" data-testid="admin-catalog-review">
      <h3>Programme catalogue review</h3>
      <p className="pilot-muted">
        Current cycle {listing?.current_cycle || "…"}. Verified records go stale
        after {listing?.stale_after_days || "…"} days without a source check.
        Only published records are public, and only current-cycle, verified,
        fresh records autofill applications.
      </p>
      {message && (
        <p role="status" data-testid="admin-catalog-message">
          {message}
        </p>
      )}

      <form className="admin-catalog-form" onSubmit={saveDraft}>
        <h4>
          {form.revision_id
            ? `Edit draft revision #${form.revision_id}`
            : form.program_id
              ? `New correction for ${form.program_id}`
              : "New programme draft"}
        </h4>
        <div className="admin-catalog-grid">
          <input
            aria-label="Programme ID"
            placeholder="Programme ID (optional)"
            value={form.program_id}
            onChange={change("program_id")}
            disabled={Boolean(form.revision_id)}
          />
          <input
            aria-label="School name"
            placeholder="School name"
            required
            value={form.school_name}
            onChange={change("school_name")}
          />
          <input
            aria-label="Programme name"
            placeholder="Programme name"
            required
            value={form.program_name}
            onChange={change("program_name")}
          />
          <input
            aria-label="Degree"
            placeholder="Degree"
            required
            value={form.degree}
            onChange={change("degree")}
          />
          <input
            aria-label="Country"
            placeholder="Country"
            required
            value={form.country}
            onChange={change("country")}
          />
          <input
            aria-label="City"
            placeholder="City"
            value={form.city}
            onChange={change("city")}
          />
          <input
            aria-label="Admissions cycle"
            placeholder="Cycle, e.g. 2026-27"
            required
            pattern="\d{4}-\d{2}"
            value={form.cycle}
            onChange={change("cycle")}
          />
          <input
            aria-label="Application fee"
            placeholder="Application fee"
            type="number"
            min="0"
            value={form.application_fee}
            onChange={change("application_fee")}
          />
          <input
            aria-label="Fee currency"
            placeholder="Currency"
            maxLength={3}
            value={form.fee_currency}
            onChange={change("fee_currency")}
          />
          <label>
            Round 1 deadline
            <input
              type="date"
              value={form.round_1}
              onChange={change("round_1")}
            />
          </label>
          <label>
            Round 2 deadline
            <input
              type="date"
              value={form.round_2}
              onChange={change("round_2")}
            />
          </label>
          <input
            aria-label="Official source URL"
            placeholder="Official source URL"
            type="url"
            value={form.source_url}
            onChange={change("source_url")}
          />
          <label>
            Source checked on
            <input
              type="date"
              value={form.checked_at}
              onChange={change("checked_at")}
            />
          </label>
          <input
            aria-label="Change note"
            placeholder="What changed and why"
            value={form.change_note}
            onChange={change("change_note")}
          />
        </div>
        <div className="admin-catalog-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {form.revision_id ? "Save draft" : "Create draft"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setForm(EMPTY_FORM)}
          >
            Clear
          </button>
        </div>
      </form>

      {loading && !listing && <p>Loading catalogue…</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Programme</th>
              <th>Cycle</th>
              <th>Public status</th>
              <th>Open revision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.flatMap((program) =>
              (program.cycles.length
                ? program.cycles
                : [{ id: `none-${program.id}`, cycle: "-" }]
              ).map((cycle) => {
                const open = cycle.open_revision;
                return (
                  <tr key={`${program.id}-${cycle.id}`}>
                    <td>
                      {program.school_name} – {program.program_name}
                      <br />
                      <small>{program.id}</small>
                    </td>
                    <td>{cycle.cycle}</td>
                    <td>
                      {cycle.published ? (
                        <>
                          <strong>{cycle.effective_status}</strong> (rev{" "}
                          {cycle.published.revision_number})
                          {cycle.status_reason && (
                            <>
                              <br />
                              <small>{cycle.status_reason}</small>
                            </>
                          )}
                        </>
                      ) : cycle.archived ? (
                        "archived"
                      ) : (
                        "not published"
                      )}
                    </td>
                    <td>
                      {open
                        ? `#${open.revision_number} ${open.state} (${open.verification_status})`
                        : "—"}
                    </td>
                    <td className="admin-catalog-row-actions">
                      {open?.state === "draft" && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() =>
                              setForm(formFromRevision(program, cycle, open))
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => submitAdminCatalogRevisionApi(open.id),
                                "Submitted for review.",
                              )
                            }
                          >
                            Submit for review
                          </button>
                        </>
                      )}
                      {open?.state === "in_review" && (
                        <>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={busy}
                            onClick={() => publish(open, "verified")}
                          >
                            Publish verified
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() => publish(open, "unverified")}
                          >
                            Publish unverified
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => returnAdminCatalogRevisionApi(open.id),
                                "Returned to draft.",
                              )
                            }
                          >
                            Return
                          </button>
                        </>
                      )}
                      {!open && cycle.published && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            setForm(
                              formFromRevision(program, cycle, cycle.published),
                            )
                          }
                        >
                          Correct
                        </button>
                      )}
                      {cycle.published && !cycle.archived && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => archiveAdminCatalogCycleApi(cycle.id),
                              `${cycle.cycle} archived.`,
                            )
                          }
                        >
                          Archive
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => showHistory(program.id)}
                      >
                        {history.programId === program.id
                          ? "Hide history"
                          : "History"}
                      </button>
                    </td>
                  </tr>
                );
              }),
            )}
            {listing && !items.length && (
              <tr>
                <td colSpan={5}>
                  No programmes yet. Import the seed with{" "}
                  <code>python manage_catalog.py import-seed</code> or create a
                  draft above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {history.programId && (
        <div data-testid="admin-catalog-history">
          <h4>Revision history: {history.programId}</h4>
          <ul>
            {history.rows.map((row) => (
              <li key={row.id}>
                {row.cycle} #{row.revision_number} – {row.state},{" "}
                {row.verification_status}; fee {row.application_fee ?? "—"}{" "}
                {row.fee_currency}; checked {row.checked_at || "never"}
                {row.change_note ? ` — ${row.change_note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
