import React, { act } from "react";
import { createRoot } from "react-dom/client";
import VerifyEmailBanner from "./VerifyEmailBanner";
import { requestEmailVerificationApi } from "../../api";

jest.mock("../../api", () => ({
  requestEmailVerificationApi: jest.fn().mockResolvedValue({}),
}));

let c, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  c = document.createElement("div");
  document.body.appendChild(c);
  root = createRoot(c);
});
afterEach(() => {
  act(() => root.unmount());
  c.remove();
});
const btn = (t) => [...c.querySelectorAll("button")].find((b) => b.textContent === t);

test("shows for unverified users, resends and dismisses", async () => {
  act(() => root.render(<VerifyEmailBanner user={{ email: "a@b.co", email_verified: false }} />));
  expect(c.textContent).toMatch(/verify your email/i);
  await act(async () => btn("Resend").click());
  expect(requestEmailVerificationApi).toHaveBeenCalledWith("a@b.co");
  expect(c.textContent).toMatch(/Verification email sent/);
  act(() => c.querySelector("[aria-label=Dismiss]").click());
  expect(c.firstChild).toBeNull();
});

test("hidden when verified or flag missing", () => {
  act(() => root.render(<VerifyEmailBanner user={{ email_verified: true }} />));
  expect(c.firstChild).toBeNull();
  act(() => root.render(<VerifyEmailBanner user={{}} />));
  expect(c.firstChild).toBeNull();
});
