import { calculateEconomics, ECONOMICS_DEFAULTS } from "./adminEconomics";
test("base scenario accounts for every session, fees, refunds and overhead", () => {
  const result = calculateEconomics(ECONOMICS_DEFAULTS);
  const expected = (599 * 0.97) / 1.18 - 599 * 0.0236 - 125 - 20 - 100;
  expect(result.contribution).toBeCloseTo(expected);
  expect(result.surplus).toBeCloseTo(expected * 100 - 5000);
  expect(result.breakEven).toBe(Math.ceil(5000 / expected));
  expect(result.afterTime).toBeCloseTo(result.surplus - 15000);
});
test("a loss-making offer has no finite break-even or income target", () => {
  const result = calculateEconomics({ ...ECONOMICS_DEFAULTS, price: 0 });
  expect(result.breakEven).toBeNull();
  expect(result.targetBuyers).toBeNull();
});
test.each([
  { price: "" },
  { buyers: 1.5 },
  { sessions: -1 },
  { price: Infinity },
  { tax: 101 },
  { hours: 745 },
])("invalid assumptions do not show misleading results: %s", (change) => {
  expect(calculateEconomics({ ...ECONOMICS_DEFAULTS, ...change })).toBeNull();
});
