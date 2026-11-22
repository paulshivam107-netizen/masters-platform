import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Signup from "./Signup";

const mockSignup = jest.fn().mockResolvedValue({});
const mockRequestVerification = jest.fn();
jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ signup: mockSignup, loginWithGoogle: jest.fn() }),
}));
jest.mock("../api", () => ({
  requestEmailVerificationApi: (...args) => mockRequestVerification(...args),
}));
jest.mock("./GoogleSignInButton", () => () => <div data-testid="google" />);

test("no confirm field; Google precedes the form; password can be shown", () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const c = document.createElement("div");
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(<Signup onSwitchToLogin={() => {}} />));
  const q = (id) => c.querySelector(`[data-testid="${id}"]`);
  expect(q("auth-signup-confirm-password")).toBeNull();
  expect(c.textContent).not.toMatch(/confirm password/i);
  expect(
    q("google").compareDocumentPosition(q("auth-signup-name")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const pw = q("auth-signup-password");
  const toggle = () => q("auth-signup-toggle-password");
  expect(pw.type).toBe("password");
  expect(toggle().getAttribute("aria-label")).toBe("Show password");
  act(() => toggle().click());
  expect(pw.type).toBe("text");
  expect(toggle().getAttribute("aria-label")).toBe("Hide password");
  expect(toggle().getAttribute("aria-pressed")).toBe("true");
  act(() => root.unmount());
  c.remove();
});

test("signup does not request a second verification email (it would void the first link)", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const c = document.createElement("div");
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(<Signup onSwitchToLogin={() => {}} />));
  const set = (id, value) => {
    const el = c.querySelector(`[data-testid="${id}"]`);
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    act(() => {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  set("auth-signup-name", "Test User");
  set("auth-signup-email", "u@example.com");
  set("auth-signup-password", "Testpass12345");
  await act(async () => {
    c.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  expect(mockSignup).toHaveBeenCalledWith(
    "u@example.com",
    "Test User",
    "Testpass12345",
  );
  expect(mockRequestVerification).not.toHaveBeenCalled();
  act(() => root.unmount());
  c.remove();
});
