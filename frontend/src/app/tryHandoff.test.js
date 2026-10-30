import { clearTryHandoff, readTryHandoff, saveTryHandoff } from "./tryHandoff";

const KEY = "mockmba:try_handoff";
const DAY = 24 * 60 * 60 * 1000;
// Same shape the server signs: base64url(JSON) + "." + signature. The browser never checks the signature.
const token = (claims = {}) =>
  `${Buffer.from(
    JSON.stringify({
      answer: "I led a team of six engineers.",
      follow_up: "What did you decide yourself?",
      v: 1,
      exp: Math.floor(Date.now() / 1000) + 86400,
      ...claims,
    }),
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}.c2ln`;
const stored = () => JSON.parse(localStorage.getItem(KEY));

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("a saved try is read back with the exact text, including non-Latin characters", () => {
  const handoff = token({ answer: "मैंने छह इंजीनियरों की टीम चलाई ✓" });
  expect(saveTryHandoff(handoff)).toBe(true);
  expect(Object.keys(stored()).sort()).toEqual(["handoff", "savedAt"]);
  expect(readTryHandoff()).toEqual({
    handoff,
    answer: "मैंने छह इंजीनियरों की टीम चलाई ✓",
    followUp: "What did you decide yourself?",
  });
});

test("nothing is saved for a missing or empty token", () => {
  expect(saveTryHandoff(undefined)).toBe(false);
  expect(saveTryHandoff("")).toBe(false);
  expect(localStorage.getItem(KEY)).toBeNull();
});

test.each([
  [
    "older than 24 hours",
    () =>
      localStorage.setItem(
        KEY,
        JSON.stringify({
          handoff: token(),
          savedAt: Date.now() - DAY - 1000,
        }),
      ),
  ],
  [
    "a token whose own expiry has passed",
    () =>
      localStorage.setItem(
        KEY,
        JSON.stringify({
          handoff: token({ exp: Math.floor(Date.now() / 1000) - 5 }),
          savedAt: Date.now(),
        }),
      ),
  ],
  [
    "a save time in the future",
    () =>
      localStorage.setItem(
        KEY,
        JSON.stringify({ handoff: token(), savedAt: Date.now() + DAY }),
      ),
  ],
  ["not JSON", () => localStorage.setItem(KEY, "{nope")],
  ["no token", () => localStorage.setItem(KEY, JSON.stringify({ savedAt: 1 }))],
  [
    "a token that is not base64",
    () =>
      localStorage.setItem(
        KEY,
        JSON.stringify({ handoff: "%%%.sig", savedAt: Date.now() }),
      ),
  ],
  [
    "a token without the follow-up",
    () =>
      localStorage.setItem(
        KEY,
        JSON.stringify({
          handoff: token({ follow_up: "" }),
          savedAt: Date.now(),
        }),
      ),
  ],
])("%s is not offered and is removed", (_name, plant) => {
  plant();
  expect(readTryHandoff()).toBeNull();
  expect(localStorage.getItem(KEY)).toBeNull();
});

test("clearing removes the saved try", () => {
  saveTryHandoff(token());
  clearTryHandoff();
  expect(readTryHandoff()).toBeNull();
});

test("blocked storage never throws", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(saveTryHandoff(token())).toBe(false);
  expect(readTryHandoff()).toBeNull();
  expect(() => clearTryHandoff()).not.toThrow();
});
