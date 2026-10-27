import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AdminView from "./AdminView";
import { FeedbackQueue, EconomicsCalculator, AiLedger } from "./AdminPilot";
import { ECONOMICS_DEFAULTS } from "./adminEconomics";
import * as api from "../../../api/adminApi";
jest.mock("../../../api/adminApi", () => ({
  getPilotAdminApi: jest.fn(),
  updatePilotFeedbackApi: jest.fn(),
  saveEconomicsApi: jest.fn(),
  resolveAiLedgerEntryApi: jest.fn(),
}));
let root, container;
const button = (label) =>
  [...container.querySelectorAll("button")].find(
    (el) => el.textContent === label,
  );
const change = (element, value) => {
  const prototype =
    element.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : element.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
  element.dispatchEvent(
    new Event(element.tagName === "SELECT" ? "change" : "input", {
      bubbles: true,
    }),
  );
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  api.getPilotAdminApi.mockImplementation((path) =>
    Promise.resolve(
      path === "economics"
        ? { assumptions: ECONOMICS_DEFAULTS, revision: 0 }
        : { items: [], total: 0, counts: {} },
    ),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
test("overview keeps heavy controls out of the initial view and sections navigate", async () => {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <AdminView
          adminUsers={[]}
          adminEvents={[]}
          adminBreakdown={[]}
          programCatalog={[]}
          adminOverview={{
            total_users: 5,
            funnel_signups: 3,
            funnel_signups_7d: 2,
            funnel_started: 1,
          }}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    ),
  );
  expect(
    container.querySelector('nav[aria-label="Admin sections"]'),
  ).toBeTruthy();
  expect(container.textContent).toContain("Signed up (this week)3 (2)");
  expect(container.textContent).toContain("Started an interview1");
  const systemHeading = [...container.querySelectorAll("h3")].find(
    (h) => h.textContent === "AI controls",
  );
  expect(systemHeading.closest("[hidden]")).toBeTruthy();
  await act(async () => button("System").click());
  expect(systemHeading.closest("[hidden]")).toBeNull();
  expect(button("System").getAttribute("aria-current")).toBe("page");
});
test("feedback save carries revision and retains the note on a conflict", async () => {
  const row = {
    id: 7,
    status: "open",
    revision: 2,
    note: "",
    category: "bug",
    message: "Stopped",
    user_email: "test@example.test",
  };
  api.getPilotAdminApi.mockResolvedValue({
    items: [row],
    total: 1,
    counts: { open: 1 },
  });
  api.updatePilotFeedbackApi.mockRejectedValue({
    response: {
      data: {
        detail:
          "Another admin updated this feedback. Refresh before saving again.",
      },
    },
  });
  await act(async () => root.render(<FeedbackQueue active refresh={0} />));
  await act(async () => {
    change(
      container.querySelector('[aria-label="Status for feedback 7"]'),
      "resolved",
    );
    change(container.querySelector("textarea"), "Retry explained");
  });
  await act(async () =>
    container
      .querySelector("details form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(api.updatePilotFeedbackApi).toHaveBeenCalledWith(7, {
    status: "resolved",
    note: "Retry explained",
    revision: 2,
  });
  expect(container.textContent).toContain("Another admin updated");
  expect(container.querySelector("textarea").value).toBe("Retry explained");
});
test("calculator saves account assumptions without reverting successful changes", async () => {
  api.saveEconomicsApi.mockImplementation((payload) =>
    Promise.resolve({ ...payload, revision: 1 }),
  );
  await act(async () =>
    root.render(<EconomicsCalculator active refresh={0} />),
  );
  await act(async () => change(container.querySelector("input"), "700"));
  await act(async () =>
    container
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(api.saveEconomicsApi).toHaveBeenCalledWith({
    assumptions: { ...ECONOMICS_DEFAULTS, price: 700 },
    revision: 0,
  });
  expect(container.querySelector("input").value).toBe("700");
  expect(container.textContent).toContain("Scenario saved");
});
test("failed data load is not presented as an empty success state", async () => {
  api.getPilotAdminApi.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<FeedbackQueue active refresh={0} />));
  expect(container.querySelector('[role="alert"]')).toBeTruthy();
  expect(container.textContent).not.toContain("No matching feedback.");
  expect(button("Try again")).toBeTruthy();
});

test("AI ledger separates alerts from hard caps and resolves unknown outcomes", async () => {
  const ledger = {
    items: [{ id: "e1", operation: "interview_answer", model: "gpt-4.1-mini", status: "unknown",
      reserved_paise: 51, actual_paise: null, failure_code: "provider_timeout",
      user_email: "a@example.com", created_at: "2026-10-15T10:00:00" }],
    total: 1, unknown_total: 1, ai_enabled: true,
    today: { committed_paise: 4100, global_daily_cap_paise: 50000, user_daily_cap_paise: 5000,
      alert_paise: 4000, alert_triggered: true, cap_reached: false, in_flight: 0 },
    reconciliation: { balanced: true },
  };
  api.getPilotAdminApi.mockResolvedValue(ledger);
  api.resolveAiLedgerEntryApi.mockResolvedValue({});
  await act(async () => root.render(<AiLedger active refresh={0} />));
  expect(container.textContent).toContain("Alert only");
  expect(container.textContent).toContain("does not block anything");
  expect(container.textContent).not.toContain("Hard cap reached");
  expect(container.textContent).toContain("provider_timeout");
  await act(async () => button("Not charged").click());
  expect(api.resolveAiLedgerEntryApi).toHaveBeenCalledWith("e1", { outcome: "not_charged" });
  expect(api.getPilotAdminApi).toHaveBeenCalledTimes(2);
});
