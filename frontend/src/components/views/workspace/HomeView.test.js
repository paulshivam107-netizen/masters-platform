import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import HomeView from "./HomeView";
import { listInterviews } from "../../../api/interviewsApi";

jest.mock("../../../api/interviewsApi", () => ({ listInterviews: jest.fn() }));

let root, container;
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);
const noop = () => {};
const application = {
  id: 1,
  school_name: "IIM A",
  program_name: "PGP",
  deadline: "2099-01-01",
};

async function renderHome({ firstVisit, handleNavChange = noop }) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <HomeView
          user={{ name: "Asha Rao" }}
          applications={firstVisit ? [] : [application]}
          essays={[]}
          applicationSummary={{ dueSoon: 0 }}
          parseDate={(value) => new Date(value)}
          onboardingDismissed
          handleNavChange={handleNavChange}
          handleOpenApplicationForm={noop}
          handleOpenNewEssayForm={noop}
          setSelectedApplicationId={noop}
        />
      </MemoryRouter>,
    ),
  );
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("first visit: primary start card goes to interviews, tracker is secondary", async () => {
  listInterviews.mockResolvedValue({ completed_count: 0, items: [] });
  const handleNavChange = jest.fn();
  await renderHome({ firstVisit: true, handleNavChange });
  act(() => byId("home-start-interview").click());
  expect(handleNavChange).toHaveBeenCalledWith("interviews");
  expect(
    byId("home-start-interview").compareDocumentPosition(
      byId("home-track-card"),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

describe.each([
  ["first-visit", true],
  ["normal", false],
])("Today interview card (%s view)", (_name, firstVisit) => {
  test("shows the interview count and Practise again after completed interviews", async () => {
    listInterviews.mockResolvedValue({ completed_count: 3, items: [] });
    const handleNavChange = jest.fn();
    await renderHome({ firstVisit, handleNavChange });

    const card = byId("home-practice");
    expect(card.textContent).toContain("You’ve done 3 interviews");
    const again = [...card.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Practise again"),
    );
    act(() => again.click());
    expect(handleNavChange).toHaveBeenCalledWith("interviews");
  });

  test("keeps the start card when the interview list fails", async () => {
    listInterviews.mockRejectedValue(new Error("offline"));
    await renderHome({ firstVisit });

    expect(byId("home-practice")).toBeNull();
    if (firstVisit) {
      expect(container.textContent).toContain(
        "Start your first mock interview",
      );
    }
  });
});
