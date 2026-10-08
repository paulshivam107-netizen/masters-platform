import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Login from "./Login";
import { useAuth } from "../contexts/AuthContext";
import { authError } from "../api/authErrors";
jest.mock("../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../app/telemetry", () => ({ trackEvent: jest.fn() }));
const invalid = {
  response: {
    status: 422,
    data: {
      detail: [
        {
          type: "value_error",
          loc: ["body", "email"],
          msg: "invalid",
          input: "private-input",
        },
      ],
    },
  },
};

test("an API validation error is readable and leaves the login form usable", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  useAuth.mockReturnValue({ login: jest.fn().mockRejectedValue(invalid) });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<Login />));
  await act(async () =>
    container
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    "Check your email address, then try again.",
  );
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
  expect(container.textContent).not.toContain("private-input");
  act(() => root.unmount());
  container.remove();
});

test("auth errors handle strings, unexpected objects and network failures safely", () => {
  expect(
    authError(
      { response: { data: { detail: "Invalid credentials" } } },
      "Try again",
    ),
  ).toBe("Invalid credentials");
  expect(authError({ response: { data: { detail: {} } } }, "Try again")).toBe(
    "Try again",
  );
  expect(authError(new Error("Network Error"), "Try again")).toBe("Try again");
});
