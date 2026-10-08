import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useWorkspaceNavigation } from "./workspaceNavigation";

test("direct links, navigation and browser history resolve to the correct workspace section", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function Probe() {
    const [active, navigate] = useWorkspaceNavigation();
    const history = useNavigate();
    return (
      <>
        <output>{active}</output>
        <button onClick={() => navigate("tracker")}>Applications</button>
        <button onClick={() => history(-1)}>Back</button>
      </>
    );
  }
  act(() =>
    root.render(
      <MemoryRouter
        initialEntries={["/app/interviews"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Probe />
      </MemoryRouter>,
    ),
  );
  expect(container.querySelector("output").textContent).toBe("interviews");
  act(() => container.querySelectorAll("button")[0].click());
  expect(container.querySelector("output").textContent).toBe("tracker");
  act(() => container.querySelectorAll("button")[1].click());
  expect(container.querySelector("output").textContent).toBe("interviews");
  act(() => root.unmount());
  container.remove();
});
