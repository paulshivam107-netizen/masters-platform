import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Signup from "./Signup";

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ signup: jest.fn(), loginWithGoogle: jest.fn() }),
}));
jest.mock("../api", () => ({ requestEmailVerificationApi: jest.fn() }));
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
