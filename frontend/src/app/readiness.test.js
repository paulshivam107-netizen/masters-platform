import { changes, chipLabel, previousFull, trend } from "./readiness";

const full = (id, created_at, score, levels) => ({
  id,
  created_at,
  readiness: { status: "full", score, assessed: 3, levels },
});

test("previousFull picks the latest earlier full item, skipping partial and itself", () => {
  const history = [
    full("c", "2026-03-01", 90),
    full("a", "2026-01-01", 60),
    full("b", "2026-02-01", 70),
    { id: "p", created_at: "2026-02-15", readiness: { status: "partial" } },
    { id: "n", created_at: "2026-02-20", readiness: null },
  ];
  expect(previousFull(history, { id: "c", created_at: "2026-03-01" }).id).toBe(
    "b",
  );
  expect(previousFull(history, { id: "a", created_at: "2026-01-01" })).toBeNull();
});

test("changes lists only areas assessed in both with a different level", () => {
  expect(
    changes(
      { motivation: "partial", projects: "not_assessed", academics: "strong" },
      { motivation: "strong", projects: "strong", academics: "strong" },
    ),
  ).toEqual([{ area: "Motivation", from: "Partial", to: "Strong" }]);
});

test("trend returns the last five full scores oldest first", () => {
  const history = [1, 2, 3, 4, 5, 6].map((n) =>
    full(`s${n}`, `2026-01-0${n}`, n * 10),
  );
  history.push({ id: "p", created_at: "2026-01-09", readiness: { status: "partial" } });
  expect(trend(history)).toEqual([20, 30, 40, 50, 60]);
});

test("chipLabel", () => {
  expect(chipLabel(null)).toBeNull();
  expect(chipLabel({ status: "partial", score: null })).toBe("Partial");
  expect(chipLabel({ status: "full", score: 83 })).toBe("83/100");
});
