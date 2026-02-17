import { apiClient } from './client';

export async function getAdminOverviewApi() {
  const { data } = await apiClient.get('/admin/overview');
  return data;
}

export async function getAdminUsersApi(limit = 30) {
  const { data } = await apiClient.get('/admin/users', { params: { limit } });
  return data;
}

export async function getAdminEventsApi(limit = 60, name = null) {
  const { data } = await apiClient.get('/admin/events', {
    params: {
      limit,
      ...(name ? { name } : {})
    }
  });
  return data;
}

export async function getAdminFeedbackApi(limit = 30) {
  const { data } = await apiClient.get('/admin/feedback', { params: { limit } });
  return data;
}

export async function getAdminEventBreakdownApi(limit = 10) {
  const { data } = await apiClient.get('/admin/events/breakdown', { params: { limit } });
  return data;
}

export async function getAdminEventCoverageApi() {
  const { data } = await apiClient.get('/admin/events/coverage');
  return data;
}

export async function updateAdminUserRoleApi(userId, role) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function createAdminProgramCatalogItemApi(payload) {
  const { data } = await apiClient.post('/admin/programs', payload);
  return data;
}

export async function updateAdminProgramCatalogItemApi(programId, payload) {
  const { data } = await apiClient.put(`/admin/programs/${programId}`, payload);
  return data;
}

export async function deleteAdminProgramCatalogItemApi(programId) {
  const { data } = await apiClient.delete(`/admin/programs/${programId}`);
  return data;
}

export async function getAdminAiRuntimeConfigApi() {
  const { data } = await apiClient.get('/admin/ai/runtime');
  return data;
}

export async function updateAdminAiRuntimeConfigApi(payload) {
  const { data } = await apiClient.put('/admin/ai/runtime', payload);
  return data;
}
