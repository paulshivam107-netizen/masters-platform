import axios from "axios";

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_URL,
});

let sessionVersion = 0;
export function setAuthToken(token, { newSession = false } = {}) {
  if (newSession) sessionVersion += 1;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

// A group of requests made with an expired access token shares one refresh.
// Never replay a request into a different signed-in account.
export function installSessionRecovery(refresh) {
  let pending;
  const request = apiClient.interceptors.request.use((config) => {
    config.sessionVersion ??= sessionVersion;
    return config;
  });
  const response = apiClient.interceptors.response.use(
    (value) => value,
    async (error) => {
      const config = error.config;
      if (
        config &&
        error.code === "ERR_NETWORK" &&
        !error.response &&
        config.method === "get" &&
        !config.networkRetried &&
        !config.signal?.aborted &&
        config.sessionVersion === sessionVersion
      ) {
        config.networkRetried = true;
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (config.signal?.aborted || config.sessionVersion !== sessionVersion)
          throw error;
        return apiClient.request(config);
      }
      if (
        !config ||
        error.response?.status !== 401 ||
        config.sessionRetried ||
        config.signal?.aborted ||
        config.sessionVersion !== sessionVersion ||
        (/^\/auth\//.test(config.url) &&
          !/^\/auth\/(me|profile)$/.test(config.url))
      )
        throw error;
      config.sessionRetried = true;
      let authorization = apiClient.defaults.headers.common.Authorization;
      if (!authorization || config.headers.Authorization === authorization) {
        if (!pending)
          pending = Promise.resolve()
            .then(refresh)
            .finally(() => {
              pending = null;
            });
        if (!(await pending)) throw error;
        authorization = apiClient.defaults.headers.common.Authorization;
      }
      if (
        !authorization ||
        config.signal?.aborted ||
        config.sessionVersion !== sessionVersion
      )
        throw error;
      config.headers.Authorization = authorization;
      return apiClient.request(config);
    },
  );
  return () => {
    apiClient.interceptors.request.eject(request);
    apiClient.interceptors.response.eject(response);
  };
}
