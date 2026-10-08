import React, { useEffect, useId, useMemo, useState } from "react";
import {
  getInterviewQuestions,
  interviewError,
} from "../../../api/interviewsApi";

export function questionPath(bank, target, route = "") {
  const nodes = new Map(bank.nodes.map((node) => [node.id, node]));
  const allowed = (id) => !route || nodes.get(id)?.routes.includes(route);
  const queue = bank.roots.filter(allowed).map((id) => [id]);
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    const id = path[path.length - 1];
    if (id === target) return path;
    if (seen.has(id)) continue;
    seen.add(id);
    bank.edges
      .filter((edge) => edge.parent === id && allowed(edge.child))
      .forEach((edge) => queue.push([...path, edge.child]));
  }
  return [];
}

export default function InterviewQuestionBank({
  route = "",
  onChoose,
  disabled,
  bankData = null,
  heading = "Follow the next question.",
}) {
  const [bank, setBank] = useState(bankData);
  const id = useId();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [path, setPath] = useState([]);
  const [limit, setLimit] = useState(8);
  const [specialist, setSpecialist] = useState(false);
  useEffect(() => {
    if (bankData) {
      setBank(bankData);
      setPath([]);
      return;
    }
    const controller = new AbortController();
    setError("");
    getInterviewQuestions(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setBank(data);
      })
      .catch(async (err) => {
        if (!controller.signal.aborted) setError(await interviewError(err));
      });
    return () => controller.abort();
  }, [reload, bankData]);
  useEffect(() => {
    setPath([]);
    setLimit(8);
    setTopic("");
  }, [route]);
  const nodes = useMemo(
    () => new Map(bank?.nodes.map((node) => [node.id, node]) || []),
    [bank],
  );
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button className="text-button" onClick={() => setReload(reload + 1)}>
          Reload question bank
        </button>
      </div>
    );
  if (!bank) return <p role="status">Loading questions…</p>;
  const allowed = (node) =>
    node &&
    (!route || node.routes.includes(route)) &&
    (!node.specialist || specialist);
  const query = search.trim().toLowerCase();
  const candidates = bank.nodes.filter(
    (node) =>
      allowed(node) &&
      (!topic || node.topic === topic) &&
      (query
        ? `${node.text} ${node.topic}`.toLowerCase().includes(query)
        : bank.roots.includes(node.id)),
  );
  const current = nodes.get(path[path.length - 1]);
  const nextEdges = current
    ? bank.edges.filter(
        (edge) => edge.parent === current.id && allowed(nodes.get(edge.child)),
      )
    : [];
  const topics = [
    ...new Set(bank.nodes.filter(allowed).map((node) => node.topic)),
  ];
  const resetFilters = (setter, value) => {
    setter(value);
    setPath([]);
    setLimit(8);
  };
  return (
    <section className="question-bank" aria-labelledby={`${id}-heading`}>
      <header>
        <h3 id={`${id}-heading`}>{heading}</h3>
        <p>
          {bank.nodes.filter(allowed).length} questions. Begin with an opening,
          then explore where it could lead. Questions only; no model answers or
          hints.
        </p>
      </header>
      <div className="bank-filters">
        <div className="form-group">
          <label htmlFor={`${id}-search`}>Search all questions</label>
          <input
            id={`${id}-search`}
            type="search"
            value={search}
            maxLength={120}
            placeholder="Try: projects, disagreement, why MBA"
            onChange={(e) => resetFilters(setSearch, e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-topic`}>Topic</label>
          <select
            id={`${id}-topic`}
            value={topic}
            onChange={(e) => resetFilters(setTopic, e.target.value)}
          >
            <option value="">All topics</option>
            {topics.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      {!bankData && (
        <label className="studio-consent">
          <input
            type="checkbox"
            checked={specialist}
            onChange={(event) => {
              setSpecialist(event.target.checked);
              setPath([]);
              setTopic("");
            }}
          />
          <span>Include specialist technology and product questions</span>
        </label>
      )}
      {current ? (
        <div className="bank-branch">
          <button className="text-button" onClick={() => setPath([])}>
            ← Back to {query ? "search results" : "starting questions"}
          </button>
          <ol className="bank-path" aria-label="Question path">
            {path.map((id, index) => (
              <li
                key={id}
                className={index === path.length - 1 ? "is-current" : ""}
              >
                <span className="bank-order">
                  {index === 0 ? "1 · Opening" : `${index + 1} · Follow-up`}
                </span>
                <button
                  onClick={() => setPath(path.slice(0, index + 1))}
                  aria-current={index === path.length - 1 ? "step" : undefined}
                >
                  {nodes.get(id).text}
                </button>
              </li>
            ))}
          </ol>
          <div className="bank-next">
            <h4>
              {nextEdges.length
                ? "Where this could lead"
                : "End of this mapped branch"}
            </h4>
            {nextEdges.length ? (
              <ul>
                {nextEdges.map((edge) => (
                  <li key={edge.child}>
                    <button onClick={() => setPath([...path, edge.child])}>
                      <span>{nodes.get(edge.child).text}</span>
                      <small>
                        {edge.basis === "source_follow_up"
                          ? "Follow-up recorded in source"
                          : edge.basis === "ai_connection"
                            ? "AI-suggested follow-up"
                            : "Suggested connection"}{" "}
                        <span aria-hidden="true">↗</span>
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                You can return to any earlier question or explore another
                opening.
              </p>
            )}
          </div>
          <details className="bank-provenance">
            <summary>Question sources</summary>
            {current.evidence_quote && (
              <>
                <p>From your reviewed résumé:</p>
                <blockquote>{current.evidence_quote}</blockquote>
                <p>
                  AI-drafted question. Check that its premise is accurate before
                  practising.
                </p>
              </>
            )}
            <p>
              Adapted from{" "}
              {current.sources
                .map(
                  (id) =>
                    bank.sources.find((source) => source.id === id)?.label,
                )
                .join("; ")}
              . Connections marked “suggested” were made while organising the
              bank. These are possible practice paths, not a prediction of a
              school’s interview.
            </p>
          </details>
          <button
            className="secondary-action-btn"
            disabled={disabled}
            onClick={() => onChoose(nodes.get(path[0]))}
          >
            Practise from this opening
          </button>
        </div>
      ) : (
        <>
          <p className="bank-result-count" role="status">
            {candidates.length}{" "}
            {query ? "matching questions" : "starting questions"}
            {route ? " for your route" : " across both routes"}
          </p>
          <ul className="bank-roots">
            {candidates.slice(0, limit).map((node) => (
              <li key={node.id}>
                <button
                  onClick={() => setPath(questionPath(bank, node.id, route))}
                >
                  <span className="eyebrow">{node.topic}</span>
                  <strong>{node.text}</strong>
                  <span className="bank-explore">
                    {bank.roots.includes(node.id)
                      ? "Explore this opening"
                      : "View question path"}{" "}
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!candidates.length && (
            <p>
              No questions match those filters. Try another word or choose All
              topics.
            </p>
          )}
          {candidates.length > limit && (
            <button className="text-button" onClick={() => setLimit(limit + 8)}>
              Show more questions
            </button>
          )}
        </>
      )}
    </section>
  );
}
