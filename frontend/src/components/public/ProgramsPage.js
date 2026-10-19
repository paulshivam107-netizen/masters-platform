import React from "react";
import { useNavigate } from "react-router-dom";
import { listProgramCatalogApi } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import "./PublicPages.css";
import "./ProgramsPage.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { catalogStatusLabel } from "../../app/catalogAutofill";

function formatFee(item) {
  if (
    item.application_fee === null ||
    item.application_fee === undefined ||
    item.application_fee === ""
  ) {
    return "Fee not listed";
  }
  return `${item.fee_currency || "USD"} ${item.application_fee}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function roundList(item) {
  if (Array.isArray(item.rounds) && item.rounds.length) {
    return item.rounds
      .filter((round) => round && round.deadline)
      .map((round) => ({ label: round.label, date: round.deadline }));
  }
  return [
    ["Round 1", item.deadline_round_1],
    ["Round 2", item.deadline_round_2],
  ]
    .filter(([, date]) => date)
    .map(([label, date]) => ({ label, date }));
}

function distinct(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Skeletons() {
  return (
    <ul className="pp-grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <li key={n} className="pp-card pp-skeleton">
          <span className="pp-sk pp-sk--tag" />
          <span className="pp-sk pp-sk--title" />
          <span className="pp-sk pp-sk--line" />
          <span className="pp-sk pp-sk--line pp-sk--short" />
          <span className="pp-sk pp-sk--btn" />
        </li>
      ))}
    </ul>
  );
}

export default function ProgramsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = React.useState("");
  const [submitted, setSubmitted] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState("");
  const [failed, setFailed] = React.useState(false);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [country, setCountry] = React.useState("");
  const [degree, setDegree] = React.useState("");

  const fetchPrograms = React.useCallback(async (nextQuery = "") => {
    try {
      setLoading(true);
      setError("");
      setFailed(false);
      setSubmitted(nextQuery.trim());
      const response = await listProgramCatalogApi(nextQuery, 50);
      const nextItems = response?.items || [];
      setItems(nextItems);
      if (!nextItems.length) {
        setError("No matching programs found. Try a broader search.");
      }
    } catch (err) {
      setItems([]);
      setFailed(true);
      setError(
        "The programme catalogue is unavailable right now. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPrograms("");
  }, [fetchPrograms]);

  const resetFilters = () => {
    setVerifiedOnly(false);
    setCountry("");
    setDegree("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    resetFilters();
    fetchPrograms(query);
  };

  const handleClear = () => {
    setQuery("");
    resetFilters();
    fetchPrograms("");
  };

  const handleUseProgram = () => {
    if (user) {
      navigate("/app");
      return;
    }
    navigate("/auth?mode=signup&next=%2Fapp%2Finterviews");
  };

  const countries = distinct(items, "country");
  const degrees = distinct(items, "degree");
  const visible = items.filter(
    (item) =>
      (!verifiedOnly || item.autofill_allowed) &&
      (!country || item.country === country) &&
      (!degree || item.degree === degree),
  );
  const filtersActive = verifiedOnly || country || degree;
  const noFilterMatch = items.length > 0 && visible.length === 0;

  let summary = "";
  if (loading) {
    summary = "Searching the catalogue…";
  } else if (items.length) {
    summary = `${visible.length} of ${items.length} ${items.length === 1 ? "programme" : "programmes"}`;
    if (submitted) summary += ` for “${submitted}”`;
  }

  const chip = (label, active, onClick, key) => (
    <button
      key={key || label}
      type="button"
      className={`pp-chip${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="public-page pp">
      <SiteHeader />
      <main>
        <section className="pp-hero">
          <div className="pp-frame pp-hero-grid">
            <div className="pp-hero-copy">
              <p className="pp-eyebrow">
                <span />
                Programme explorer
              </p>
              <h1>Find your next possibility.</h1>
              <p className="pp-lead">
                Search the programmes in our catalogue by school, programme,
                city or country. Every record shows whether it has been
                checked against the official source.
              </p>
              <form className="pp-search" onSubmit={handleSubmit} role="search">
                <div className="pp-field">
                  <SearchIcon />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by school, program, city, or country"
                    aria-label="Search programs"
                  />
                </div>
                <button type="submit" className="pp-btn" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>
            </div>
            <div className="pp-hero-photo" aria-hidden="true">
              <img
                src="/images/landing/photo_resume_printout.jpg"
                alt=""
                decoding="async"
              />
            </div>
          </div>
        </section>

        <section className="pp-results" aria-labelledby="pp-results-title">
          <div className="pp-frame">
            <div className="pp-bar">
              <h2 id="pp-results-title">Programmes</h2>
              <p className="pp-summary" role="status" aria-live="polite">
                {summary}
              </p>
            </div>

            {items.length > 0 && !loading && (
              <div
                className="pp-filters"
                role="group"
                aria-label="Filter results"
              >
                {chip("Verified only", verifiedOnly, () =>
                  setVerifiedOnly((value) => !value),
                )}
                {countries.length > 1 &&
                  countries.map((name) =>
                    chip(
                      name,
                      country === name,
                      () => setCountry(country === name ? "" : name),
                      `c-${name}`,
                    ),
                  )}
                {degrees.length > 1 &&
                  degrees.map((name) =>
                    chip(
                      name,
                      degree === name,
                      () => setDegree(degree === name ? "" : name),
                      `d-${name}`,
                    ),
                  )}
                {filtersActive && (
                  <button
                    type="button"
                    className="pp-reset"
                    onClick={resetFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div aria-busy={loading}>
              {loading && <Skeletons />}

              {!loading && error && (
                <div
                  className={`pp-state${failed ? " is-error" : ""}`}
                  role={failed ? "alert" : "status"}
                >
                  <h3>
                    {failed ? "Catalogue unavailable" : "No programmes found"}
                  </h3>
                  <p className="public-auth-next">{error}</p>
                  <div className="pp-state-actions">
                    {failed ? (
                      <button
                        type="button"
                        className="pp-btn"
                        onClick={() => fetchPrograms(submitted)}
                      >
                        Try again
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pp-btn"
                        onClick={handleClear}
                      >
                        Show all programmes
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!loading && noFilterMatch && (
                <div className="pp-state" role="status">
                  <h3>Nothing matches these filters</h3>
                  <p className="public-auth-next">
                    Remove a filter to see the other programmes in this search.
                  </p>
                  <div className="pp-state-actions">
                    <button
                      type="button"
                      className="pp-btn"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}

              {!loading && visible.length > 0 && (
                <ul className="pp-grid">
                  {visible.map((item) => {
                    const rounds = roundList(item);
                    return (
                      <li
                        key={
                          item.id || `${item.school_name}-${item.program_name}`
                        }
                        className="pp-card"
                      >
                        <article>
                          <div className="pp-card-top">
                            <span className="pp-tag">
                              {item.degree || "Degree"}
                            </span>
                            {item.cycle ? (
                              <span className="pp-cycle">
                                {item.cycle} cycle
                              </span>
                            ) : null}
                          </div>
                          <h3>
                            {item.school_name || "School"} -{" "}
                            {item.program_name || "Program"}
                          </h3>
                          <p className="pp-place">
                            {[item.city, item.country]
                              .filter(Boolean)
                              .join(", ") || "Location not listed"}
                          </p>
                          <dl className="pp-facts">
                            <div>
                              <dt>Application fee</dt>
                              <dd>{formatFee(item)}</dd>
                            </div>
                            <div>
                              <dt>Deadlines</dt>
                              <dd>
                                {rounds.length
                                  ? rounds.map((round) => (
                                      <span
                                        key={round.label}
                                        className="pp-round"
                                      >
                                        {round.label}: {formatDate(round.date)}
                                      </span>
                                    ))
                                  : "Deadline not listed"}
                              </dd>
                            </div>
                          </dl>
                          <p
                            className={`pp-status ${item.autofill_allowed ? "is-verified" : "is-unverified"}`}
                            data-testid="program-verification"
                          >
                            {catalogStatusLabel(item)}
                          </p>
                          <div className="pp-actions">
                            <button
                              type="button"
                              className="pp-btn pp-btn--sm"
                              onClick={handleUseProgram}
                            >
                              Open application planner
                            </button>
                            {item.source_url ? (
                              <a
                                className="pp-link"
                                href={item.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Official source
                              </a>
                            ) : null}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
