import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, useTheme } from "./ThemeContext";

let container;
let root;
let systemChange;

function Probe() {
  const {
    isDarkMode,
    setIsDarkMode,
    setTheme,
    reducedMotion,
    setReducedMotion,
  } = useTheme();
  return (
    <>
      <output>{isDarkMode ? "dark" : "light"}</output>
      <button onClick={() => setIsDarkMode(!isDarkMode)}>Toggle</button>
      <button onClick={() => setTheme("system")}>System</button>
      <button onClick={() => setReducedMotion(!reducedMotion)}>Motion</button>
    </>
  );
}
const render = () =>
  act(() =>
    root.render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    ),
  );
const click = (index) =>
  act(() => container.querySelectorAll("button")[index].click());

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  window.matchMedia = jest.fn(() => ({
    matches: false,
    addEventListener: (_, handler) => {
      systemChange = handler;
    },
    removeEventListener: jest.fn(),
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("a selected theme applies to the document and survives remounting", () => {
  render();
  expect(document.documentElement.dataset.theme).toBe("light");
  click(0);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("ui_theme")).toBe("dark");
  act(() => root.unmount());
  root = createRoot(container);
  render();
  expect(container.querySelector("output").textContent).toBe("dark");
  click(0);
  expect(document.documentElement.style.colorScheme).toBe("light");
});

test("system appearance tracks OS changes until the user chooses an explicit theme", () => {
  render();
  act(() => systemChange({ matches: true }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  click(0);
  act(() => systemChange({ matches: true }));
  expect(document.documentElement.dataset.theme).toBe("light");
  click(1);
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("reduced motion applies outside the workspace and persists", () => {
  render();
  click(2);
  expect(document.documentElement.dataset.reducedMotion).toBe("true");
  expect(localStorage.getItem("ui_reduced_motion")).toBe("true");
});
