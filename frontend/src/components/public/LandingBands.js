import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { schools } from "../../content/schools";

const SCORE = 72;
const FINDINGS = [
  [
    "What worked",
    "You named who used the dashboard and the decision it changed.",
  ],
  ["What to tighten", "Give one number for the result."],
  ["One exercise", "Retell the dashboard story in 60 seconds."],
];

const stillMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The prerendered page shows the finished debrief. In the browser, a debrief not yet fully
// in view resets and plays once (score counts up, findings rise) when it scrolls into view.
function useDebriefPlay(ref) {
  const [state, setState] = useState({ score: SCORE, shown: true });
  useEffect(() => {
    const node = ref.current;
    if (!node || stillMotion() || !("IntersectionObserver" in window))
      return undefined;
    // Already fully in view on load: nothing to play.
    if (node.getBoundingClientRect().bottom <= window.innerHeight)
      return undefined;
    setState({ score: 0, shown: false });
    let raf;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setState({ score: 0, shown: true });
        const start = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - start) / 1400);
          setState({
            score: Math.round(SCORE * (1 - (1 - k) ** 3)),
            shown: true,
          });
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return state;
}

export function DebriefSpotlight({ action = null }) {
  const ref = useRef(null);
  const { score, shown } = useDebriefPlay(ref);
  return (
    <section className="lp-debrief-band" aria-labelledby="debrief-heading">
      <div className="lp-frame lp-debrief-grid" ref={ref}>
        <div className="lp-debrief-copy">
          <h2 id="debrief-heading">
            After five answers, a debrief you can act on.
          </h2>
          <p>
            Every point quotes your own words, so you know exactly what to
            change before the next interview.
          </p>
          {action}
        </div>
        <figure
          className={`lp-debrief-card${shown ? " is-shown" : ""}`}
          aria-label={`Illustrative debrief: interview readiness ${SCORE} out of 100, with what worked, what to tighten and one exercise`}
        >
          <div className="lp-debrief-score" aria-hidden="true">
            <span className="lp-debrief-num">{score}</span>
            <span className="lp-debrief-of">/100</span>
            <span className="lp-debrief-label">Interview readiness</span>
          </div>
          <div className="lp-debrief-bar" aria-hidden="true">
            <i style={{ width: `${shown ? (score / 100) * 100 : 0}%` }} />
          </div>
          <dl className="lp-debrief-findings">
            {FINDINGS.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <figcaption>
            Illustrative. Readiness rates your answers, not your admit chances.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// Alternate regions so each row mixes India, Europe and the US.
function interleave(list) {
  const byRegion = list.reduce((map, school) => {
    (map[school.region] = map[school.region] || []).push(school);
    return map;
  }, {});
  const queues = Object.values(byRegion);
  const out = [];
  while (queues.some((q) => q.length))
    queues.forEach((q) => q.length && out.push(q.shift()));
  return out;
}

export function SchoolBand() {
  const mixed = interleave(schools);
  const half = Math.ceil(mixed.length / 2);
  const rows = [mixed.slice(0, half), mixed.slice(half)];
  return (
    <section className="lp-schools-band" aria-labelledby="schools-band-heading">
      <div className="lp-frame lp-schools-band-head">
        <h2 id="schools-band-heading">Practise for the panel you’ll face.</h2>
        <p>
          Interview notes for {schools.length} schools in India, Europe and the
          US. <Link to="/schools">See all schools</Link>
        </p>
      </div>
      <div className="lp-marquee">
        {rows.map((row, r) => (
          <div
            className={`lp-marquee-row${r ? " lp-marquee-row--rev" : ""}`}
            key={r}
          >
            {/* The second copy only makes the loop seamless; keyboard and screen readers skip it. */}
            {[0, 1].map((copy) => (
              <ul
                className="lp-marquee-set"
                key={copy}
                aria-hidden={copy ? "true" : undefined}
              >
                {row.map((school) => (
                  <li key={school.slug}>
                    <Link
                      to={`/schools/${school.slug}`}
                      tabIndex={copy ? -1 : undefined}
                    >
                      {school.shortName || school.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
