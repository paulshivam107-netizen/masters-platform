import {
  buildApplicationsCsvContent,
  buildDeadlinesIcsContent,
} from "./exporters";
const application = {
  id: 23,
  school_name: 'School, "North"',
  program_name: "Executive MBA",
  deadline: "2026-12-31",
  application_round: "Round 1",
  status: "Planning",
  decision_status: "Pending",
};
test("CSV preserves school names containing commas and quotes", () => {
  const csv = buildApplicationsCsvContent({ applications: [application] });
  expect(csv.split("\n")).toHaveLength(2);
  expect(csv).toContain('"School, ""North""","Executive MBA"');
  expect(csv).toContain('"2026-12-31"');
});
test("calendar export creates an all-day deadline across the year boundary", () => {
  const calendar = buildDeadlinesIcsContent({
    applications: [application],
    parseDate: (value) => new Date(`${value}T00:00:00`),
    now: new Date("2026-10-08T00:00:00Z"),
  });
  expect(calendar).toContain("DTSTART;VALUE=DATE:20261231");
  expect(calendar).toContain("DTEND;VALUE=DATE:20270101");
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(calendar).toContain("END:VCALENDAR");
});
