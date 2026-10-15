import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AccountDataCard from "./AccountDataCard";
import { deleteAccountApi, exportAccountApi } from "../../../api/accountApi";
import { downloadJson } from "../../../app/accountData";

jest.mock("../../../api/accountApi", () => ({
  exportAccountApi: jest.fn(),
  deleteAccountApi: jest.fn(),
}));
jest.mock("../../../app/accountData", () => {
  const actual = jest.requireActual("../../../app/accountData");
  return { ...actual, downloadJson: jest.fn() };
});

let root, container;
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);
const change = (element, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    element,
    value,
  );
  element.dispatchEvent(new Event("input", { bubbles: true }));
};
const flush = () => act(async () => {});

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderCard = (logout) =>
  act(() => root.render(<AccountDataCard user={{ id: 7 }} logout={logout} />));

test("download merges only this account's browser notes into the server export", async () => {
  localStorage.setItem("masters:user:7:notes", JSON.stringify({ a: "mine" }));
  localStorage.setItem("masters:user:70:notes", JSON.stringify({ a: "other" }));
  exportAccountApi.mockResolvedValue({ format: "x", essays: [] });
  renderCard(jest.fn());
  await act(async () => byId("settings-download-data").click());
  await flush();
  expect(downloadJson).toHaveBeenCalledTimes(1);
  const [archive] = downloadJson.mock.calls[0];
  expect(archive.browser_storage).toEqual({ notes: { a: "mine" } });
});

test("deletion needs typed confirmation, then clears this account's keys and signs out", async () => {
  localStorage.setItem("masters:user:7:notes", "{}");
  localStorage.setItem("masters:user:7:ui_draft_essay", "{}");
  localStorage.setItem("masters:user:8:notes", "{}");
  localStorage.setItem("theme", "dark");
  deleteAccountApi.mockResolvedValue({ deleted: true });
  const logout = jest.fn().mockResolvedValue();
  renderCard(logout);
  act(() => byId("settings-delete-account").click());
  expect(byId("settings-delete-submit").disabled).toBe(true);
  act(() => change(byId("settings-delete-password"), "pw-123456"));
  act(() => change(byId("settings-delete-confirm"), "DELETE"));
  expect(byId("settings-delete-submit").disabled).toBe(false);
  await act(async () => byId("settings-delete-submit").click());
  await flush();
  expect(deleteAccountApi).toHaveBeenCalledWith("pw-123456");
  expect(logout).toHaveBeenCalled();
  expect(localStorage.getItem("masters:user:7:notes")).toBeNull();
  expect(localStorage.getItem("masters:user:7:ui_draft_essay")).toBeNull();
  expect(localStorage.getItem("masters:user:8:notes")).toBe("{}");
  expect(localStorage.getItem("theme")).toBe("dark");
});

test("a failed re-authentication keeps the account, its notes and the session", async () => {
  localStorage.setItem("masters:user:7:notes", "{}");
  deleteAccountApi.mockRejectedValue({
    response: {
      status: 403,
      data: {
        detail: {
          code: "reauth_failed",
          message: "Your password was not correct.",
        },
      },
    },
  });
  const logout = jest.fn();
  renderCard(logout);
  act(() => byId("settings-delete-account").click());
  act(() => change(byId("settings-delete-confirm"), "DELETE"));
  await act(async () => byId("settings-delete-submit").click());
  await flush();
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    "Your password was not correct.",
  );
  expect(logout).not.toHaveBeenCalled();
  expect(localStorage.getItem("masters:user:7:notes")).toBe("{}");
});
