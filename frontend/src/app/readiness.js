export const AREA_LABELS = {
  motivation: "Motivation",
  work_experience: "Work experience",
  academics: "Academics",
  projects: "Projects",
  communication: "Communication",
};
export const LEVEL_LABELS = {
  strong: "Strong",
  partial: "Partial",
  missing: "Missing",
  not_assessed: "Not covered",
};

export const previousFull = (history, session) =>
  (history || [])
    .filter(
      (item) =>
        item.id !== session.id &&
        item.readiness?.status === "full" &&
        new Date(item.created_at) < new Date(session.created_at),
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ||
  null;

// Only areas assessed in both interviews count as a change.
export const changes = (prevLevels = {}, levels = {}) =>
  Object.keys(AREA_LABELS)
    .filter(
      (key) =>
        prevLevels[key] &&
        levels[key] &&
        prevLevels[key] !== "not_assessed" &&
        levels[key] !== "not_assessed" &&
        prevLevels[key] !== levels[key],
    )
    .map((key) => ({
      area: AREA_LABELS[key],
      from: LEVEL_LABELS[prevLevels[key]],
      to: LEVEL_LABELS[levels[key]],
    }));

export const trend = (history) =>
  (history || [])
    .filter((item) => item.readiness?.status === "full")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-5)
    .map((item) => item.readiness.score);

export const chipLabel = (readiness) =>
  !readiness
    ? null
    : readiness.status === "full"
      ? `${readiness.score}/100`
      : "Partial";
