import { india, TRACK_LABELS } from "./schools";

// Hub for searches like "iim mock interview". Every fact comes from the sourced, dated school
// data. A school-level interview block describes the flagship programme (programmes[0]); any
// other programme appears only when it carries its own interview block.
export const indiaHub = {
  path: "/india-mba-mock-interview",
  title: "IIM, ISB and Indian MBA mock interview by programme",
  description:
    "Mock interview practice for IIM, ISB, XLRI, FMS and other Indian MBA and executive MBA programmes, with each school's own interview facts, sourced and dated.",
  updated: india
    .map((school) => school.checked)
    .sort()
    .pop(),
};

export function indiaProgrammeRows() {
  return Object.entries(TRACK_LABELS).map(([track, label]) => ({
    track,
    label,
    rows: india.flatMap((school) =>
      school.programmes
        .filter((programme) => programme.track === track)
        .map((programme) => ({
          school,
          programme,
          facts:
            programme.interview ||
            (programme === school.programmes[0] ? school.interview : null),
        }))
        .filter((row) => row.facts),
    ),
  }));
}
