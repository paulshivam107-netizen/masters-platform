import { apiClient, installSessionRecovery, setAuthToken } from "./client";

const fail = (config, status = 401) =>
  Promise.reject({ config, response: { status } });
let remove;
afterEach(() => {
  remove?.();
  setAuthToken(null, { newSession: true });
  delete apiClient.defaults.adapter;
});

test("parallel expired requests refresh once and replay with the fresh session", async () => {
  setAuthToken("old-synthetic-token", { newSession: true });
  const refresh = jest.fn(async () => {
    setAuthToken("new-synthetic-token");
    return true;
  });
  remove = installSessionRecovery(refresh);
  apiClient.defaults.adapter = (config) =>
    config.headers.Authorization === "Bearer old-synthetic-token"
      ? fail(config)
      : Promise.resolve({ data: "ok", config, status: 200 });
  const results = await Promise.all([
    apiClient.get("/interviews/sessions"),
    apiClient.get("/applications"),
  ]);
  expect(results.map((r) => r.data)).toEqual(["ok", "ok"]);
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("failed refresh and auth endpoint errors do not loop", async () => {
  setAuthToken("synthetic-token", { newSession: true });
  const refresh = jest.fn(async () => false);
  remove = installSessionRecovery(refresh);
  apiClient.defaults.adapter = (config) => fail(config);
  await expect(apiClient.get("/interviews/sessions")).rejects.toBeTruthy();
  await expect(apiClient.post("/auth/refresh")).rejects.toBeTruthy();
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("an account switch during refresh never replays the old account request", async () => {
  setAuthToken("old-account", { newSession: true });
  remove = installSessionRecovery(async () => {
    setAuthToken("other-account", { newSession: true });
    return true;
  });
  const adapter = jest.fn((config) => fail(config));
  apiClient.defaults.adapter = adapter;
  await expect(
    apiClient.post("/interviews/sessions", { private: "synthetic fixture" }),
  ).rejects.toBeTruthy();
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("a transient read failure gets one retry, while writes never retry automatically", async () => {
  remove = installSessionRecovery(jest.fn());
  const adapter = jest.fn((config) =>
    Promise.reject({ config, code: "ERR_NETWORK" }),
  );
  apiClient.defaults.adapter = adapter;
  await expect(apiClient.get("/applications/")).rejects.toBeTruthy();
  expect(adapter).toHaveBeenCalledTimes(2);
  adapter.mockClear();
  await expect(
    apiClient.post("/interviews/resume/question-sets", {}),
  ).rejects.toBeTruthy();
  expect(adapter).toHaveBeenCalledTimes(1);
});
