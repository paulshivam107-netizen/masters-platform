import { catalogAutofillPatch, catalogStatusLabel } from "./catalogAutofill";

const base = {
  school_name: "IIM Test",
  program_name: "PGPX",
  application_fee: 3000,
  fee_currency: "INR",
  deadline_round_1: "2026-12-01",
  checked_at: "2026-10-01",
};
const prev = { deadline: "", application_fee: "", fee_currency: "USD" };

test("verified, fresh, current-cycle records autofill deadline and fee", () => {
  const { patch, warning } = catalogAutofillPatch(
    { ...base, autofill_allowed: true, verification_status: "verified" },
    prev,
  );
  expect(warning).toBeNull();
  expect(patch).toMatchObject({
    deadline: "2026-12-01",
    application_fee: "3000",
    fee_currency: "INR",
  });
});

test.each([
  ["unverified", "Not yet checked against the official source."],
  ["stale", "Source last checked more than 120 days ago."],
  [
    "stale",
    "These details are for the 2025-26 cycle; the current cycle is 2026-27.",
  ],
])("%s records never autofill deadline or fee", (status, reason) => {
  const item = {
    ...base,
    autofill_allowed: false,
    verification_status: status,
    status_reason: reason,
  };
  const { patch, warning } = catalogAutofillPatch(item, prev);
  expect(patch).toEqual({ school_name: "IIM Test", program_name: "PGPX" });
  expect(warning).toMatch(/check the official source/);
  expect(catalogStatusLabel(item)).toMatch(/check the official source/);
});

test("records without an autofill flag are treated as unverified", () => {
  const { patch, warning } = catalogAutofillPatch(base, prev);
  expect(patch.deadline).toBeUndefined();
  expect(catalogStatusLabel(base)).toMatch(
    /^Unverified — check the official source/,
  );
  expect(warning).toBeTruthy();
});
