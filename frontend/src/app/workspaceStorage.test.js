import { readUserValue, writeUserValue } from "./workspaceStorage";

beforeEach(() => localStorage.clear());

test("drafts and notes cannot leak between accounts or inherit unowned legacy data", () => {
  localStorage.setItem(
    "ui_draft_essay",
    JSON.stringify({ essay_content: "legacy" }),
  );
  expect(readUserValue(1, "ui_draft_essay", null)).toBeNull();
  writeUserValue(1, "ui_draft_essay", { essay_content: "account one" });
  expect(readUserValue(2, "ui_draft_essay", null)).toBeNull();
  expect(readUserValue(1, "ui_draft_essay", null).essay_content).toBe(
    "account one",
  );
  writeUserValue(2, "ui_draft_essay", null);
  expect(readUserValue(1, "ui_draft_essay", null).essay_content).toBe(
    "account one",
  );
  expect(localStorage.getItem("ui_draft_essay")).toContain("legacy");
});

test("corrupt or unavailable storage does not crash the workspace", () => {
  localStorage.setItem("masters:user:1:notes", "{");
  expect(readUserValue(1, "notes", {})).toEqual({});
  const spy = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("quota");
    });
  expect(writeUserValue(1, "notes", { text: "work" })).toBe(false);
  spy.mockRestore();
  expect(writeUserValue(null, "notes", {})).toBe(false);
});
