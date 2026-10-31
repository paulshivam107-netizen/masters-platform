import { waitForGoogleIdentity } from "./googleIdentity";

const SCRIPT = 'script[src="https://accounts.google.com/gsi/client"]';

afterEach(() => {
  delete window.google;
});

test("Google's script loads once, only when a sign-in button asks for it", async () => {
  expect(document.querySelector(SCRIPT)).toBeNull();
  const first = waitForGoogleIdentity(2000);
  const second = waitForGoogleIdentity(2000);
  expect(document.querySelectorAll(SCRIPT)).toHaveLength(1);
  window.google = { accounts: { id: { initialize: jest.fn() } } };
  await expect(first).resolves.toBe(window.google.accounts.id);
  await expect(second).resolves.toBe(window.google.accounts.id);
});
