import { schools } from "./index";
import { practiceNext } from "../../components/public/SchoolPages";

// Every value must be present. The only allowed nulls are an unpublished interview or careers report.
function findEmpty(value, path, out = []) {
  if (value === null || value === undefined || value === "")
    out.push(path);
  else if (Array.isArray(value)) {
    if (!value.length) out.push(path);
    value.forEach((v, i) => findEmpty(v, `${path}[${i}]`, out));
  } else if (typeof value === "object")
    Object.entries(value).forEach(([k, v]) =>
      findEmpty(v, `${path}.${k}`, out),
    );
  return out;
}

describe.each(schools)("school data: $slug", (school) => {
  test("has no empty fields", () => {
    const { interview, careers, ...rest } = school;
    expect(findEmpty(rest, school.slug)).toEqual([]);
    if (interview !== null) expect(findEmpty(interview, "interview")).toEqual([]);
    if (careers !== null) expect(findEmpty(careers, "careers")).toEqual([]);
  });
  test("has sources and a checked date", () => {
    expect(school.sources.length).toBeGreaterThan(0);
    expect(school.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of school.sources) expect(s.url).toMatch(/^https:\/\//);
  });
  test("every cited url is listed in sources", () => {
    const listed = school.sources.map((s) => s.url);
    const cited = [
      ...school.programmes.map((p) => p.source),
      ...(school.careers ? [school.careers.source] : []),
      ...(school.interview?.sources || []),
    ];
    for (const url of cited) expect(listed).toContain(url);
  });
  test("has a known region", () => {
    expect(["India", "United States", "Europe"]).toContain(school.region);
  });
  test("practice link carries the programme", () => {
    expect(practiceNext(school)).toMatch(/^\/app\/interviews\?programme=/);
  });
});

test("slugs are unique", () => {
  expect(new Set(schools.map((s) => s.slug)).size).toBe(schools.length);
});
