import React from "react";
import { Link, useParams } from "react-router-dom";
import { schools, schoolBySlug, TRACK_LABELS } from "../../content/schools";
import {
  ResourceShell,
  ResourceCta,
  SchoolList,
  ArticleLayout,
  RelatedLinks,
  NotFoundPage,
} from "./ResourcePages";
import { useAuth } from "../../contexts/AuthContext";
import TryOneQuestion from "./TryOneQuestion";
import "./SchoolPages.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
// Deterministic, so prerendered and client HTML match.
export function monthYear(iso) {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}
export const practiceNext = (school, programme = school.programmes[0]) =>
  `/app/interviews?programme=${encodeURIComponent(
    `${school.shortName} ${programme.name}`,
  )}`;


function SourceLink({ url, label = "Source" }) {
  return (
    <a className="sp-src" href={url} target="_blank" rel="noopener noreferrer">
      {label}
      <span className="sp-visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function SchoolsPage() {
  return (
    <ResourceShell current="guides">
      <section className="rp-hero">
        <div className="rp-frame sp-index-head">
          <p className="rp-eyebrow">
            <span aria-hidden="true" />
            School interview pages
          </p>
          <h1>Interview preparation, school by school</h1>
          <p className="rp-lead">
            What each school says about its programmes, its interview and where
            graduates go, with a link to the official source for every fact.
            Independent preparation guides, not affiliated with any school.
          </p>
        </div>
      </section>
      <section className="rp-library" aria-label="All schools">
        <div className="rp-frame">
          <SchoolList />
          <p className="sp-note">
            More schools are on the way. Facts are only added when a school
            states them on its own website or in its official employment report.
          </p>
        </div>
      </section>
    </ResourceShell>
  );
}

function Programmes({ school }) {
  const { user } = useAuth();
  // Same rule as ResourceCta: signed-out visitors sign up first, then land in the interview.
  const practiseTo = (p) => {
    const next = practiceNext(school, p);
    return user ? next : `/auth?mode=signup&next=${encodeURIComponent(next)}`;
  };
  return (
    <section id="programmes" aria-labelledby="programmes-h">
      <h2 id="programmes-h">Programmes</h2>
      <div className="sp-cards">
        {school.programmes.map((p) => (
          <article className="sp-card" key={p.name}>
            {p.track && <p className="sp-tag">{TRACK_LABELS[p.track]}</p>}
            <h3>{p.name}</h3>
            <p>{p.format}</p>
            <dl>
              <div>
                <dt>Duration</dt>
                <dd>{p.duration}</dd>
              </div>
              {p.intake && (
                <div>
                  <dt>Intake</dt>
                  <dd>{p.intake}</dd>
                </div>
              )}
              {p.experience && (
                <div>
                  <dt>Experience</dt>
                  <dd>{p.experience}</dd>
                </div>
              )}
            </dl>
            <SourceLink url={p.source} />
            {school.programmes.length > 1 && (
              <Link className="sp-practise" to={practiseTo(p)}>
                Practise for {p.name}
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function InterviewFacts({ school, facts, heading }) {
  return (
    <>
      <h3>{heading}</h3>
      <ul>
        {facts.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {facts.note && <p>{facts.note}</p>}
      <p className="sp-sources-inline">
        Sources:{" "}
        {facts.sources.map((url, i) => (
          <React.Fragment key={url}>
            {i > 0 && ", "}
            <SourceLink
              url={url}
              label={school.sources.find((x) => x.url === url)?.label}
            />
          </React.Fragment>
        ))}
      </p>
    </>
  );
}

function Interview({ school }) {
  const { interview } = school;
  const programmeInterviews = school.programmes.filter((p) => p.interview);
  return (
    <section id="interview" aria-labelledby="interview-h">
      <h2 id="interview-h">The interview</h2>
      {interview && (
        <InterviewFacts
          school={school}
          facts={interview}
          heading={
            programmeInterviews.length
              ? `${school.programmes[0].name}: what ${school.shortName} says`
              : `What ${school.shortName} says`
          }
        />
      )}
      {programmeInterviews.map((p) => (
        <InterviewFacts
          key={p.name}
          school={school}
          facts={p.interview}
          heading={`${p.name}: what ${school.shortName} says`}
        />
      ))}
      {!interview && !programmeInterviews.length && (
        <p>
          We haven&rsquo;t found an official description of{" "}
          {school.shortName}&rsquo;s interview format to cite yet. Most panels
          for this kind of programme probe the topics below.
        </p>
      )}
      <aside className="sp-guidance" aria-label="Our general guidance">
        <p className="sp-tag">Our general guidance, not from {school.shortName}</p>
        <p>
          Interviews for programmes like these tend to probe the same few
          things, whatever the exact format:
        </p>
        <ul>
          <li>
            <strong>Motivation:</strong> why this programme, why now, and what
            you will do with it.
          </li>
          <li>
            <strong>Experience:</strong> the choices and results on your
            résumé, in your own words and with specifics.
          </li>
          <li>
            <strong>Fit:</strong> what you will add to a class, and how you
            work with other people.
          </li>
          <li>
            <strong>Direction:</strong> whether your goals follow from your
            story so far.
          </li>
        </ul>
        <p>
          Prepare a few examples you can adapt to different questions rather
          than a script, and check the school&rsquo;s own instructions for the
          current cycle.
        </p>
      </aside>
    </section>
  );
}

function Careers({ school }) {
  const { careers } = school;
  if (!careers)
    return (
      <section id="careers" aria-labelledby="careers-h">
        <h2 id="careers-h">Where graduates go</h2>
        <p>
          We couldn&rsquo;t find an official {school.shortName} placement or
          employment report to cite yet, so we don&rsquo;t summarise outcomes
          here. Check the school&rsquo;s own careers pages.
        </p>
      </section>
    );
  return (
    <section id="careers" aria-labelledby="careers-h">
      <h2 id="careers-h">Where graduates go</h2>
      <p>
        From {careers.report} ({careers.year}).
      </p>
      <h3>Sectors</h3>
      <ul>
        {careers.sectors.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {careers.functions && (
        <>
          <h3>Functions</h3>
          <ul>
            {careers.functions.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}
      {careers.note && <p>{careers.note}</p>}
      <p className="sp-sources-inline">
        <SourceLink url={careers.source} label="Official report" />
      </p>
    </section>
  );
}

function Prepare({ school }) {
  return (
    <section id="prepare" aria-labelledby="prepare-h">
      <h2 id="prepare-h">How to prepare</h2>
      <p>
        Start with your own story. Most questions at this stage come back to
        what is on your résumé and the examples behind it.
      </p>
      <ul>
        <li>
          <Link to="/guides/mba-interview-from-resume">
            Prepare for follow-up questions on your résumé
          </Link>
        </li>
        <li>
          <Link to="/guides/mba-interview-story-bank">
            Build a story bank you can adapt in the room
          </Link>
        </li>
      </ul>
      <p>
        Then practise out loud. You get questions drawn from your own résumé
        and follow-ups that quote your answers.
      </p>
    </section>
  );
}

function Sources({ school }) {
  return (
    <section id="sources" aria-labelledby="sources-h">
      <h2 id="sources-h">Sources</h2>
      <p>
        Every fact above comes from {school.shortName}&rsquo;s own website or
        its official employment report. Facts checked{" "}
        {monthYear(school.checked)}.
      </p>
      <ul>
        {school.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
              <span className="sp-visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SchoolPage() {
  const { slug } = useParams();
  const school = schoolBySlug(slug);
  if (!school) return <NotFoundPage />;
  return (
    <ResourceShell current="guides">
      <ArticleLayout
        header={
          <nav className="rp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/schools">Schools</Link>
            <span aria-hidden="true"> / </span>
            <span>{school.shortName}</span>
          </nav>
        }
        eyebrow={
          <>
            {school.name} · {school.country} · Facts checked{" "}
            <time dateTime={school.checked}>{monthYear(school.checked)}</time>
          </>
        }
        title={`${school.shortName} interview preparation`}
        summary={`Programmes, what ${school.shortName} says about its interview, and where graduates go. Independent preparation guide, not affiliated with ${school.shortName}.`}
        toc={[
          ["programmes", "Programmes"],
          ["interview", "The interview"],
          ["careers", "Where graduates go"],
          ["prepare", "How to prepare"],
          ["sources", "Sources"],
        ]}
      >
        <Programmes school={school} />
        <Interview school={school} />
        <Careers school={school} />
        <Prepare school={school} />
        <Sources school={school} />
        <RelatedLinks
          heading="More schools"
          links={schools
            .filter((s) => s.slug !== school.slug && s.region === school.region)
            .slice(0, 8)
            .map((s) => [`/schools/${s.slug}`, s.shortName])}
        />
        <p className="sp-disclaimer">
          Independent preparation guide, not affiliated with {school.shortName}.
          Check the school&rsquo;s own pages for current requirements.
        </p>
      </ArticleLayout>
      <section className="rp-closing">
        <div className="rp-frame rp-closing-inner">
          <h2>Practise for {school.shortName}</h2>
          <p>
            Free to use right now. Sign up, add your résumé and start a mock
            interview.
          </p>
          <ResourceCta next={practiceNext(school)}>
            Practise for {school.shortName}
          </ResourceCta>
          <TryOneQuestion
            source={`school:${school.slug}`}
            next={`${practiceNext(school)}&from=try`}
          />
        </div>
      </section>
    </ResourceShell>
  );
}
