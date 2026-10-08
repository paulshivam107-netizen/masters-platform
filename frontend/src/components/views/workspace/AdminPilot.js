import React, { useEffect, useState } from "react";
import {
  getPilotAdminApi,
  updatePilotFeedbackApi,
  saveEconomicsApi,
} from "../../../api/adminApi";
import {
  ECONOMICS_FIELDS,
  ECONOMICS_DEFAULTS,
  calculateEconomics,
} from "./adminEconomics";
import "./AdminPilot.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value) =>
  value
    ? new Date(
        /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`,
      ).toLocaleString()
    : "—";
const errorText = (error) =>
  typeof error?.response?.data?.detail === "string"
    ? error.response.data.detail
    : "Could not complete this request. Please try again.";
function useResource(path, active, refresh) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let live = true;
    setLoading(true);
    setError("");
    getPilotAdminApi(path)
      .then((result) => {
        if (live) setData(result);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, active, refresh, retry]);
  return {
    data,
    error,
    loading,
    replace: setData,
    reload: () => setRetry((n) => n + 1),
  };
}
function ResourceState({ resource }) {
  if (resource.error)
    return (
      <div className="pilot-notice" role="alert">
        {resource.error}{" "}
        <button type="button" onClick={resource.reload}>
          Try again
        </button>
      </div>
    );
  if (resource.loading)
    return (
      <p role="status" className="pilot-muted">
        Refreshing…
      </p>
    );
  return null;
}
function Pages({ offset, total, onChange }) {
  return (
    <div className="pilot-pagination">
      <span>
        {total
          ? `${offset + 1}–${Math.min(offset + 20, total)} of ${total}`
          : "0 results"}
      </span>
      <button
        type="button"
        disabled={!offset}
        onClick={() => onChange(Math.max(0, offset - 20))}
      >
        Previous
      </button>
      <button
        type="button"
        disabled={offset + 20 >= total}
        onClick={() => onChange(offset + 20)}
      >
        Next
      </button>
    </div>
  );
}
const reasons = {
  provider_limit: [
    "Provider capacity or quota",
    "Check your provider quota. Ask the applicant to retry their saved session once capacity is available.",
  ],
  provider_auth: [
    "Provider connection needs attention",
    "Verify the server-side provider configuration, then ask the applicant to retry.",
  ],
  provider_timeout: [
    "Provider timed out",
    "The saved interview is retained. The applicant can reload and retry this step.",
  ],
  provider_error: [
    "Provider response failed",
    "Check service health. The applicant can retry without starting the interview again.",
  ],
  save_failed: [
    "Step could not be saved",
    "Check API and database health before the applicant reloads and retries.",
  ],
};
export function InterviewOperations({ active, refresh }) {
  const [filter, setFilter] = useState("attention"),
    [offset, setOffset] = useState(0),
    [copied, setCopied] = useState("");
  const resource = useResource(
    `interviews?state=${filter}&offset=${offset}`,
    active,
    refresh,
  );
  const copy = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied("Session ID copied.");
    } catch {
      setCopied("Copy unavailable. Select and copy the session ID below.");
    }
  };
  return (
    <section
      hidden={!active}
      className="pilot-section"
      aria-labelledby="pilot-interviews-title"
    >
      <div className="pilot-section-heading">
        <div>
          <h3 id="pilot-interviews-title">Interview operations</h3>
          <p>
            Find failed or stalled steps. Successful applicant retries leave the
            attention queue automatically.
          </p>
        </div>
        <label>
          Show
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="attention">Needs attention</option>
            <option value="all">All recorded steps</option>
          </select>
        </label>
      </div>
      <ResourceState resource={resource} />
      <p className="pilot-muted">
        Operational metadata only. No applicant answers, résumé text or
        recordings appear here.
      </p>
      <span role="status">{copied}</span>
      {!resource.loading &&
        !resource.error &&
        resource.data?.items.length === 0 && (
          <div className="pilot-empty">
            <strong>
              {filter === "attention"
                ? "No interview steps need attention."
                : "No interview steps recorded yet."}
            </strong>
            <p>
              Demo and live sessions are labelled separately when activity
              appears.
            </p>
          </div>
        )}
      {!resource.error &&
        resource.data?.items.map((row) => {
          const reason =
            row.status === "stalled"
              ? [
                  "Interrupted step",
                  "The processing lease has expired. Ask the applicant to reload the saved session and retry.",
                ]
              : reasons[row.failure_code] || [
                  "No detailed reason recorded",
                  "Older failures do not include diagnostics. Use the session ID when checking service logs.",
                ];
          return (
            <article className="pilot-ticket" key={row.id}>
              <div className="pilot-ticket-top">
                <h4>
                  {row.kind.replace(/_/g, " ")} · User #{row.user_id}
                </h4>
                <span
                  className={`pilot-badge ${row.status === "failed" || row.status === "stalled" ? "attention" : ""}`}
                >
                  {row.status}
                </span>
              </div>
              <p>
                {row.provider === "demo" ? "Demo" : "Live AI"} · {row.mode} ·{" "}
                {row.attempts} attempt{row.attempts === 1 ? "" : "s"} ·{" "}
                {date(row.failed_at || row.created_at)}
              </p>
              <details>
                <summary>Diagnostics & recovery</summary>
                <p>
                  <strong>{reason[0]}</strong>
                </p>
                <p>
                  {row.status === "succeeded"
                    ? "This step completed successfully."
                    : reason[1]}
                </p>
                <p className="pilot-id">Session: {row.session_id}</p>
                <button type="button" onClick={() => copy(row.session_id)}>
                  Copy session ID
                </button>
              </details>
            </article>
          );
        })}
      {resource.data && !resource.error && (
        <Pages
          offset={offset}
          total={resource.data.total}
          onChange={setOffset}
        />
      )}
    </section>
  );
}
function FeedbackTicket({ row, onSaved }) {
  const [state, setState] = useState(row.status),
    [note, setNote] = useState(row.note || ""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updatePilotFeedbackApi(row.id, {
        status: state,
        note,
        revision: row.revision,
      });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="pilot-ticket" data-testid="admin-feedback-item">
      <div className="pilot-ticket-top">
        <h4>
          #{row.id} · {row.category}
        </h4>
        <span className="pilot-badge">{row.status.replace("_", " ")}</span>
      </div>
      <p className="pilot-message">{row.message}</p>
      <p className="pilot-muted">
        {row.user_email} · {date(row.created_at)}
      </p>
      {row.page_context && <p className="pilot-id">Page: {row.page_context}</p>}
      <details>
        <summary>Manage feedback</summary>
        <form onSubmit={save}>
          <div className="pilot-form-grid">
            <label>
              Status
              <select
                aria-label={`Status for feedback ${row.id}`}
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={saving}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="pilot-full">
              Internal note
              <textarea
                aria-label={`Note for feedback ${row.id}`}
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                required={state === "resolved"}
                disabled={saving}
                placeholder="Record the investigation or how this was resolved."
              />
            </label>
          </div>
          <p className="pilot-muted">
            Internal only. Saving does not send a message to the applicant.
          </p>
          {row.handled_at && (
            <p className="pilot-muted">
              Last handled by admin #{row.handled_by} · {date(row.handled_at)}
            </p>
          )}
          {error && (
            <p role="alert" className="pilot-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={
              saving || (state === row.status && note === (row.note || ""))
            }
          >
            {saving ? "Saving…" : "Save update"}
          </button>
        </form>
      </details>
    </article>
  );
}
export function FeedbackQueue({ active, refresh }) {
  const [state, setState] = useState("unresolved"),
    [offset, setOffset] = useState(0),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  const resource = useResource(
    `feedback?state=${state}&offset=${offset}&q=${encodeURIComponent(query)}`,
    active,
    refresh,
  );
  return (
    <section
      hidden={!active}
      className="pilot-section"
      aria-labelledby="pilot-feedback-title"
    >
      <div className="pilot-section-heading">
        <div>
          <h3 id="pilot-feedback-title">Feedback inbox</h3>
          <p>
            Track an issue from first report to resolution. Changes are recorded
            against your admin account.
          </p>
        </div>
      </div>
      <div className="pilot-filters">
        <label>
          Status
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setOffset(0);
            }}
          >
            <option value="unresolved">Unresolved</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="all">All feedback</option>
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft.trim());
            setOffset(0);
          }}
        >
          <label>
            Find feedback
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={120}
              placeholder="Email or message"
            />
          </label>
          <button type="submit">Search</button>
          {query && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setQuery("");
                setOffset(0);
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>
      <ResourceState resource={resource} />
      <p role="status">{notice}</p>
      {!resource.error &&
        !resource.loading &&
        resource.data?.items.length === 0 && (
          <div className="pilot-empty">
            <strong>No matching feedback.</strong>
            <p>Try another status or clear your search.</p>
          </div>
        )}
      {!resource.error &&
        resource.data?.items.map((row) => (
          <FeedbackTicket
            key={`${row.id}:${row.revision}`}
            row={row}
            onSaved={() => {
              setNotice("Feedback updated.");
              setOffset(0);
              resource.reload();
            }}
          />
        ))}
      {resource.data && !resource.error && (
        <Pages
          offset={offset}
          total={resource.data.total}
          onChange={setOffset}
        />
      )}
    </section>
  );
}
export function EconomicsCalculator({ active, refresh }) {
  const resource = useResource("economics", active, refresh);
  const [values, setValues] = useState(ECONOMICS_DEFAULTS),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (resource.data && !dirty) {
      setValues(resource.data.assumptions);
      setRevision(resource.data.revision);
    }
  }, [resource.data, dirty]);
  const result = calculateEconomics(values);
  const save = async (e) => {
    e.preventDefault();
    if (!result) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveEconomicsApi({
        assumptions: result.assumptions,
        revision,
      });
      setRevision(saved.revision);
      resource.replace(saved);
      setMessage("Scenario saved to your admin account.");
      setDirty(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="pilot-section" aria-labelledby="pilot-economics-title">
      <h3 id="pilot-economics-title">Plan the economics</h3>
      <p>
        Change assumptions to explore break-even and possible owner income.
        These are projections, not measured sales or a tax determination.
      </p>
      <ResourceState resource={resource} />
      {resource.data && (
        <form onSubmit={save}>
          <div className="pilot-economics-layout">
            <div>
              <div className="pilot-form-grid">
                {ECONOMICS_FIELDS.slice(0, 8).map((field) => input(field))}
              </div>
              <details>
                <summary>Fees, allowances & founder time</summary>
                <div className="pilot-form-grid">
                  {ECONOMICS_FIELDS.slice(8).map((field) => input(field))}
                </div>
                <p className="pilot-muted">
                  Tax and payment fees are editable assumptions. Avoid counting
                  your own support time in both the support provision and
                  founder hours.
                </p>
              </details>
              <div className="pilot-actions">
                <button
                  type="submit"
                  disabled={!result || saving || resource.loading}
                >
                  {saving ? "Saving…" : "Save scenario"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setValues(ECONOMICS_DEFAULTS);
                    setDirty(true);
                    setMessage(
                      "Default assumptions loaded. Save to keep them.",
                    );
                  }}
                >
                  Reset assumptions
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDirty(false);
                    resource.reload();
                    setError("");
                    setMessage("");
                  }}
                >
                  Reload saved
                </button>
              </div>
              <p role="status">
                {message}
                {dirty && " Unsaved changes."}
              </p>
              {error && (
                <p role="alert" className="pilot-error">
                  {error}
                </p>
              )}
            </div>
            <div aria-live="polite">
              {!result ? (
                <p role="alert">
                  Enter valid nonnegative amounts. Buyers and sessions must be
                  whole numbers.
                </p>
              ) : (
                <>
                  <div className="pilot-metrics">
                    <Metric
                      label="Contribution per pack"
                      value={money(result.contribution)}
                    />
                    <Metric
                      label="Packs to cover monthly costs"
                      value={result.breakEven ?? "Not viable"}
                    />
                    <Metric
                      label="Projected monthly surplus"
                      value={money(result.surplus)}
                    />
                    <Metric
                      label="Buyers for target income"
                      value={result.targetBuyers ?? "Not viable"}
                    />
                  </div>
                  <p className="pilot-notice">
                    {result.contribution <= 0
                      ? "Each additional pack loses money under these assumptions."
                      : result.surplus < 0
                        ? "This scenario does not yet cover monthly overhead and free trials."
                        : "This scenario covers the entered costs. Demand and income still need validation."}
                  </p>
                  <p>
                    After valuing founder time:{" "}
                    <strong>{money(result.afterTime)}</strong>
                  </p>
                  <details>
                    <summary>Calculation breakdown</summary>
                    <dl className="pilot-breakdown">
                      {result.bridge.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{money(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="pilot-muted">
                      Reserves every included session. Income tax, chargebacks
                      and settlement timing are excluded.
                    </p>
                  </details>
                  <details>
                    <summary>Compare buyer volumes</summary>
                    <dl className="pilot-breakdown">
                      {result.volumes.map((row) => (
                        <div key={row.buyers}>
                          <dt>{row.buyers} buyers</dt>
                          <dd>{money(row.surplus)} surplus</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </>
              )}
            </div>
          </div>
        </form>
      )}
    </section>
  );
  function input([key, label, unit, max]) {
    return (
      <label key={key}>
        {label} <span className="pilot-muted">({unit})</span>
        <input
          type="number"
          min="0"
          max={max}
          step={["buyers", "sessions"].includes(key) ? 1 : "any"}
          required
          value={values[key]}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, [key]: e.target.value }));
            setDirty(true);
            setMessage("");
          }}
          disabled={saving}
        />
      </label>
    );
  }
}
function Metric({ label, value }) {
  return (
    <div className="pilot-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Usage({ active, refresh }) {
  const [days, setDays] = useState(30),
    [rates, setRates] = useState({});
  const resource = useResource(`usage?days=${days}`, active, refresh);
  return (
    <section className="pilot-section" aria-labelledby="pilot-usage-title">
      <div className="pilot-section-heading">
        <div>
          <h3 id="pilot-usage-title">Recorded AI usage</h3>
          <p>Interview and résumé operations retained in your database.</p>
        </div>
        <label>
          Period
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>
      <ResourceState resource={resource} />
      {resource.data && !resource.error && (
        <>
          <div className="pilot-metrics">
            <Metric
              label="AI calls reserved today · UTC"
              value={`${resource.data.calls_reserved_today} / ${resource.data.daily_call_limit}`}
            />
            <Metric
              label="Operations with missing usage"
              value={resource.data.missing_usage}
            />
          </div>
          <p className="pilot-notice">
            Partial usage records, not your provider invoice.
          </p>
          <details>
            <summary>What these numbers include</summary>
            <p className="pilot-muted">
              Deleted sessions, charges from failed attempts and audio pricing
              are excluded from token estimates. Demo interviews are excluded.
              Quota reservations include attempted live calls. Records are
              grouped by operation creation date, which can precede a later
              retry.
            </p>
          </details>
          {resource.data.models.length === 0 ? (
            <div className="pilot-empty">
              <strong>No recorded live usage in this period.</strong>
              <p>
                Usage will appear after live AI steps complete. Zero recorded
                usage does not prove a zero provider bill.
              </p>
            </div>
          ) : (
            resource.data.models.map((row) => {
              const key = `${row.source}:${row.model}`,
                rate = rates[key] || { input: "", output: "" };
              const valid =
                rate.input !== "" &&
                rate.output !== "" &&
                [rate.input, rate.output].every(
                  (n) => Number.isFinite(Number(n)) && Number(n) >= 0,
                );
              return (
                <article className="pilot-ticket" key={key}>
                  <h4>
                    {row.model} · {row.source}
                  </h4>
                  <p>
                    {row.operations} recorded operations ·{" "}
                    {row.input_tokens.toLocaleString()} input tokens ·{" "}
                    {row.output_tokens.toLocaleString()} output tokens
                  </p>
                  {(row.audio_bytes > 0 || row.characters > 0) && (
                    <p>
                      {row.audio_bytes.toLocaleString()} audio bytes ·{" "}
                      {row.characters.toLocaleString()} speech characters. Audio
                      cost is not calculated here.
                    </p>
                  )}
                  {(row.input_tokens > 0 || row.output_tokens > 0) && (
                    <details>
                      <summary>Estimate recorded text cost</summary>
                      <p className="pilot-muted">
                        Enter your current INR rates per million tokens. Rates
                        are temporary and do not alter provider configuration.
                      </p>
                      <div className="pilot-form-grid">
                        {["input", "output"].map((kind) => (
                          <label key={kind}>
                            {kind === "input" ? "Input" : "Output"} ₹ / million
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={rate[kind]}
                              onChange={(e) =>
                                setRates((prev) => ({
                                  ...prev,
                                  [key]: { ...rate, [kind]: e.target.value },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <p>
                        Text estimate:{" "}
                        <strong>
                          {valid
                            ? money(
                                (row.input_tokens * Number(rate.input) +
                                  row.output_tokens * Number(rate.output)) /
                                  1e6,
                              )
                            : "Enter both rates"}
                        </strong>
                      </p>
                    </details>
                  )}
                </article>
              );
            })
          )}
        </>
      )}
    </section>
  );
}
export default function AdminPilot({ section, refresh, overview, onSelect }) {
  const [spendingView, setSpendingView] = useState("usage");
  const attention = useResource("interviews", section === "overview", refresh);
  const feedback = useResource("feedback", section === "overview", refresh);
  return (
    <>
      <section hidden={section !== "overview"} className="pilot-section">
        <h3>What needs your attention?</h3>
        <p>
          Start with interrupted practice and open reports. Other controls are
          grouped in the sections above.
        </p>
        <ResourceState resource={attention} />
        <ResourceState resource={feedback} />
        <div className="pilot-attention-grid">
          <button type="button" onClick={() => onSelect("interviews")}>
            <strong>
              {attention.error ? "Unavailable" : (attention.data?.total ?? "…")}
            </strong>
            <span>Interview steps to review →</span>
          </button>
          <button type="button" onClick={() => onSelect("feedback")}>
            <strong>
              {feedback.error
                ? "Unavailable"
                : feedback.data
                  ? (feedback.data.counts.open || 0) +
                    (feedback.data.counts.in_progress || 0)
                  : "…"}
            </strong>
            <span>Unresolved feedback →</span>
          </button>
          <button type="button" onClick={() => onSelect("spending")}>
            <strong>Costs & scenarios</strong>
            <span>Check usage and plan your budget →</span>
          </button>
        </div>
        <div className="pilot-metrics">
          <Metric
            label="Registered users"
            value={overview?.total_users ?? "—"}
          />
          <Metric
            label="Active in the last 7 days"
            value={overview?.wau_users_7d ?? "—"}
          />
        </div>
      </section>
      <InterviewOperations
        active={section === "interviews"}
        refresh={refresh}
      />
      <FeedbackQueue active={section === "feedback"} refresh={refresh} />
      <div hidden={section !== "spending"} className="pilot-stack">
        <div className="pilot-subnav" aria-label="Spending views">
          <button
            type="button"
            aria-pressed={spendingView === "usage"}
            onClick={() => setSpendingView("usage")}
          >
            Recorded usage
          </button>
          <button
            type="button"
            aria-pressed={spendingView === "calculator"}
            onClick={() => setSpendingView("calculator")}
          >
            Economics calculator
          </button>
        </div>
        <div hidden={spendingView !== "usage"}>
          <Usage
            active={section === "spending" && spendingView === "usage"}
            refresh={refresh}
          />
        </div>
        <div hidden={spendingView !== "calculator"}>
          <EconomicsCalculator
            active={section === "spending" && spendingView === "calculator"}
            refresh={refresh}
          />
        </div>
      </div>
    </>
  );
}
