import { apiClient } from "./client";

export async function getAdminOverviewApi() {
  const { data } = await apiClient.get("/admin/overview");
  return data;
}

export async function getAdminUsersApi(limit = 30) {
  const { data } = await apiClient.get("/admin/users", { params: { limit } });
  return data;
}

export async function getAdminEventsApi(limit = 60, name = null) {
  const { data } = await apiClient.get("/admin/events", {
    params: {
      limit,
      ...(name ? { name } : {}),
    },
  });
  return data;
}

export async function getAdminFeedbackApi(limit = 30) {
  const { data } = await apiClient.get("/admin/feedback", {
    params: { limit },
  });
  return data;
}

export async function getAdminEventBreakdownApi(limit = 10) {
  const { data } = await apiClient.get("/admin/events/breakdown", {
    params: { limit },
  });
  return data;
}

export async function getAdminEventCoverageApi() {
  const { data } = await apiClient.get("/admin/events/coverage");
  return data;
}

export async function updateAdminUserRoleApi(userId, role) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, {
    role,
  });
  return data;
}

// Programme catalogue review (R09): draft -> review -> publish, history retained.
export async function listAdminCatalogApi() {
  const { data } = await apiClient.get("/admin/catalog");
  return data;
}

export async function getAdminCatalogHistoryApi(programId) {
  const { data } = await apiClient.get(
    `/admin/catalog/programs/${programId}/revisions`,
  );
  return data;
}

export async function createAdminCatalogDraftApi(payload) {
  const { data } = await apiClient.post("/admin/catalog/drafts", payload);
  return data;
}

export async function updateAdminCatalogDraftApi(revisionId, payload) {
  const { data } = await apiClient.put(
    `/admin/catalog/revisions/${revisionId}`,
    payload,
  );
  return data;
}

export async function submitAdminCatalogRevisionApi(revisionId) {
  const { data } = await apiClient.post(
    `/admin/catalog/revisions/${revisionId}/submit`,
  );
  return data;
}

export async function returnAdminCatalogRevisionApi(revisionId, note = "") {
  const { data } = await apiClient.post(
    `/admin/catalog/revisions/${revisionId}/return`,
    { note },
  );
  return data;
}

export async function publishAdminCatalogRevisionApi(
  revisionId,
  verificationStatus,
  note = "",
) {
  const { data } = await apiClient.post(
    `/admin/catalog/revisions/${revisionId}/publish`,
    {
      verification_status: verificationStatus,
      note,
    },
  );
  return data;
}

export async function archiveAdminCatalogCycleApi(cycleId) {
  const { data } = await apiClient.post(
    `/admin/catalog/cycles/${cycleId}/archive`,
  );
  return data;
}

export async function getAdminAiRuntimeConfigApi() {
  const { data } = await apiClient.get("/admin/ai/runtime");
  return data;
}

export async function updateAdminAiRuntimeConfigApi(payload) {
  const { data } = await apiClient.put("/admin/ai/runtime", payload);
  return data;
}

export async function getPilotAdminApi(path) {
  const { data } = await apiClient.get(`/admin/pilot/${path}`);
  return data;
}
export async function updatePilotFeedbackApi(id, payload) {
  const { data } = await apiClient.patch(
    `/admin/pilot/feedback/${id}`,
    payload,
  );
  return data;
}
export async function resolveAiLedgerEntryApi(id, payload) {
  const { data } = await apiClient.post(`/admin/pilot/ai-ledger/${id}/resolve`, payload);
  return data;
}
export async function saveEconomicsApi(payload) {
  const { data } = await apiClient.put("/admin/pilot/economics", payload);
  return data;
}
