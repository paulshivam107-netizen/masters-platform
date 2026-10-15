import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import {
  ResetPasswordPage,
  VerifyEmailPage,
  takeTokenFromLocation,
} from "./AuthLinkPage";
import { resetPasswordApi, verifyEmailApi } from "../../api";

jest.mock("../../api", () => ({
  verifyEmailApi: jest.fn(),
  resetPasswordApi: jest.fn(),
  requestEmailVerificationApi: jest.fn(),
  forgotPasswordApi: jest.fn(),
}));
jest.mock("../../app/telemetry", () => ({ trackEvent: jest.fn() }));
jest.mock("../common/ThemeToggle", () => () => null);
jest.mock("../common/Brand", () => () => null);

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, "", "/");
});

async function render(element) {
  await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>));
}

function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

test("token is read from the fragment and removed from the address bar", () => {
  window.history.replaceState(
    null,
    "",
    "/auth/verify-email?utm=mail#token=abc%2F123",
  );
  expect(takeTokenFromLocation()).toBe("abc/123");
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("?utm=mail");
});

test("legacy query-string tokens are accepted and stripped", () => {
  window.history.replaceState(null, "", "/auth/reset-password?token=legacy");
  expect(takeTokenFromLocation()).toBe("legacy");
  expect(window.location.search).toBe("");
});

test("verify page consumes the token exactly once and confirms", async () => {
  window.history.replaceState(null, "", "/auth/verify-email#token=one-time");
  verifyEmailApi.mockResolvedValue({ success: true });
  await render(
    <React.StrictMode>
      <VerifyEmailPage />
    </React.StrictMode>,
  );
  expect(verifyEmailApi).toHaveBeenCalledTimes(1);
  expect(verifyEmailApi).toHaveBeenCalledWith("one-time");
  expect(container.textContent).toContain("Your email is verified.");
  expect(window.location.hash).toBe("");
});

test("an expired verification link offers to send a new one", async () => {
  window.history.replaceState(null, "", "/auth/verify-email#token=old");
  verifyEmailApi.mockRejectedValue({
    response: { status: 400, data: { detail: "Invalid or expired" } },
  });
  await render(<VerifyEmailPage />);
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(
    container.querySelector('[data-testid="auth-link-request-new"]'),
  ).not.toBeNull();
});

test("reset page validates matching passwords before calling the API", async () => {
  window.history.replaceState(null, "", "/auth/reset-password#token=reset-me");
  resetPasswordApi.mockResolvedValue({ success: true });
  await render(<ResetPasswordPage />);
  const [password, confirm] = container.querySelectorAll(
    'input[type="password"]',
  );
  const form = container.querySelector('[data-testid="auth-reset-form"]');

  await act(async () => {
    setInput(password, "new-password-1");
    setInput(confirm, "different-pass");
  });
  await act(async () =>
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  expect(resetPasswordApi).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain(
    "don't match",
  );

  await act(async () => setInput(confirm, "new-password-1"));
  await act(async () =>
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  expect(resetPasswordApi).toHaveBeenCalledWith("reset-me", "new-password-1");
  expect(container.textContent).toContain("Password updated");
});

test("reset page without a token explains how to get a new link", async () => {
  window.history.replaceState(null, "", "/auth/reset-password");
  await render(<ResetPasswordPage />);
  expect(container.querySelector('[data-testid="auth-reset-form"]')).toBeNull();
  expect(
    container.querySelector('[data-testid="auth-link-request-new"]'),
  ).not.toBeNull();
});
