import { apiClient } from "./client";

export async function exportAccountApi() {
  const { data } = await apiClient.get("/account/export");
  return data;
}

// Password accounts send their password; Google-only accounts send none and must have
// signed in within the last few minutes (the server answers 403 reauth_required otherwise).
export async function deleteAccountApi(password) {
  const body = { confirm: "DELETE" };
  if (password) body.password = password;
  const { data } = await apiClient.post("/account/delete", body);
  return data;
}
