import { apiClient } from "./client";

export async function loginApi(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function signupApi(email, name, password) {
  const { data } = await apiClient.post("/auth/signup", {
    email,
    name,
    password,
  });
  return data;
}

export async function loginWithGoogleApi(idToken) {
  const { data } = await apiClient.post("/auth/google", { id_token: idToken });
  return data;
}

export async function getGoogleAuthConfigApi() {
  const { data } = await apiClient.get("/auth/google/config");
  return data;
}

export async function getCurrentUserApi() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

// The refresh token lives in an HttpOnly cookie the browser sends automatically.
// legacyRefreshToken is only for migrating sessions saved by older versions of the app.
export async function refreshTokenApi(legacyRefreshToken = null) {
  const body = legacyRefreshToken
    ? { refresh_token: legacyRefreshToken }
    : undefined;
  const { data } = await apiClient.post("/auth/refresh", body);
  return data;
}

export async function logoutApi(allSessions = false) {
  const { data } = await apiClient.post("/auth/logout", {
    all_sessions: allSessions,
  });
  return data;
}

export async function requestEmailVerificationApi(email) {
  const { data } = await apiClient.post("/auth/request-email-verification", {
    email,
  });
  return data;
}

export async function verifyEmailApi(token) {
  const { data } = await apiClient.post("/auth/verify-email", { token });
  return data;
}

export async function forgotPasswordApi(email) {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPasswordApi(token, newPassword) {
  const { data } = await apiClient.post("/auth/reset-password", {
    token,
    new_password: newPassword,
  });
  return data;
}

export async function updateProfileApi(payload) {
  const { data } = await apiClient.put("/auth/profile", payload);
  return data;
}
