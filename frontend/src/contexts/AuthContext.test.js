import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./AuthContext";
import { getAuthToken, setAuthToken } from "../api/client";
import { loginApi, logoutApi, refreshTokenApi } from "../api";

jest.mock("../api", () => {
  const client = jest.requireActual("../api/client");
  return {
    ...client,
    loginApi: jest.fn(),
    loginWithGoogleApi: jest.fn(),
    signupApi: jest.fn(),
    logoutApi: jest.fn(),
    refreshTokenApi: jest.fn(),
    updateProfileApi: jest.fn(),
  };
});

// Minimal same-process BroadcastChannel so two providers behave like two tabs.
class FakeChannel {
  static peers = [];
  constructor() {
    FakeChannel.peers.push(this);
  }
  postMessage(data) {
    FakeChannel.peers
      .filter((p) => p !== this && p.onmessage)
      .forEach((p) => p.onmessage({ data }));
  }
  close() {
    FakeChannel.peers = FakeChannel.peers.filter((p) => p !== this);
  }
}

const session = (id, token = `access-${id}`) => ({
  access_token: token,
  refresh_token: null,
  token_type: "bearer",
  user: { id, email: `u${id}@example.com` },
});
const superseded = {
  response: { status: 409, data: { detail: { code: "refresh_superseded" } } },
};
const unauthorized = { response: { status: 401, data: { detail: {} } } };

let probe;
function Probe() {
  probe = useAuth();
  return null;
}
const roots = [];
async function mount() {
  const el = document.createElement("div");
  const root = createRoot(el);
  roots.push(root);
  await act(async () =>
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    ),
  );
  return probe;
}

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.BroadcastChannel = FakeChannel;
  FakeChannel.peers = [];
  jest.clearAllMocks();
  localStorage.clear();
  setAuthToken(null, { newSession: true });
});

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  delete global.BroadcastChannel;
});

test("page load restores the session from the HttpOnly cookie", async () => {
  refreshTokenApi.mockResolvedValue(session(7));
  const auth = await mount();
  expect(refreshTokenApi).toHaveBeenCalledWith(null);
  expect(auth.loading).toBe(false);
  expect(auth.user.id).toBe(7);
  expect(getAuthToken()).toBe("access-7");
});

test("no cookie means signed out, and nothing is written to storage", async () => {
  refreshTokenApi.mockRejectedValue(unauthorized);
  const auth = await mount();
  expect(auth.user).toBeNull();
  expect(auth.loading).toBe(false);
  expect(getAuthToken()).toBeNull();
  expect(Object.keys(localStorage)).toEqual([]);
});

test("a token saved by an older version is migrated once and removed", async () => {
  localStorage.setItem("token", "old-access");
  localStorage.setItem("refresh_token", "old-refresh-token");
  refreshTokenApi.mockResolvedValue(session(3));
  await mount();
  expect(refreshTokenApi).toHaveBeenCalledWith("old-refresh-token");
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("refresh_token")).toBeNull();
});

test("a refresh raced by another tab is retried instead of signing out", async () => {
  refreshTokenApi
    .mockRejectedValueOnce(superseded)
    .mockResolvedValueOnce(session(5));
  await mount();
  await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
  expect(refreshTokenApi).toHaveBeenCalledTimes(2);
  expect(probe.user.id).toBe(5);
});

test("login keeps credentials out of localStorage", async () => {
  refreshTokenApi.mockRejectedValue(unauthorized);
  loginApi.mockResolvedValue(session(9, "access-9"));
  const auth = await mount();
  await act(async () => auth.login("u9@example.com", "password-123"));
  expect(probe.user.id).toBe(9);
  expect(getAuthToken()).toBe("access-9");
  expect(JSON.stringify({ ...localStorage })).not.toContain("access-9");
});

test("signing out in one tab signs out the others", async () => {
  refreshTokenApi.mockResolvedValue(session(4));
  await mount();
  const firstTab = probe;
  await mount();
  const secondTab = probe;
  expect(firstTab.user.id).toBe(4);

  logoutApi.mockResolvedValue({ success: true });
  await act(async () => secondTab.logout());
  expect(logoutApi).toHaveBeenCalledWith(false);
  expect(getAuthToken()).toBeNull();
  expect(firstTab.user).not.toBeUndefined();
});
