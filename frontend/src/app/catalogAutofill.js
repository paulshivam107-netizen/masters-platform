// Programme catalogue autofill guard (R09). Deadlines and fees are copied into an application
// only when the API marks the record autofill_allowed (published, verified, freshly checked and
// for the current admissions cycle). Anything else fills names only and returns a warning.

export const UNVERIFIED_CATALOG_MESSAGE =
  "unverified — check the official source";

export function catalogStatusLabel(item) {
  if (!item) return "";
  if (item.autofill_allowed) {
    return item.checked_at ? `Verified ${item.checked_at}` : "Verified";
  }
  const status = item.verification_status || "unverified";
  const reason = item.status_reason ? ` (${item.status_reason})` : "";
  return `${status === "unverified" ? "Unverified" : status[0].toUpperCase() + status.slice(1)} — check the official source${reason}`;
}

export function catalogAutofillPatch(item, prev = {}) {
  if (!item) return { patch: {}, warning: null };
  const patch = {
    school_name: item.school_name || prev.school_name,
    program_name: item.program_name || prev.program_name,
  };
  if (item.autofill_allowed === true) {
    patch.fee_currency = item.fee_currency || prev.fee_currency || "USD";
    patch.application_fee =
      item.application_fee === null || item.application_fee === undefined
        ? prev.application_fee
        : String(item.application_fee);
    patch.deadline = item.deadline_round_1 || prev.deadline;
    return { patch, warning: null };
  }
  return {
    patch,
    warning: `Deadline and fee not filled: ${catalogStatusLabel(item)}.`,
  };
}
