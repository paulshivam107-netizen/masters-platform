import { apiClient } from './client';

export async function listApplicationsApi() {
  const { data } = await apiClient.get('/applications/');
  return data;
}

export async function createApplicationApi(payload) {
  const { data } = await apiClient.post('/applications/', payload);
  return data;
}

export async function updateApplicationApi(applicationId, payload) {
  const { data } = await apiClient.put(`/applications/${applicationId}`, payload);
  return data;
}

export async function deleteApplicationApi(applicationId) {
  const { data } = await apiClient.delete(`/applications/${applicationId}`);
  return data;
}

export async function listProgramCatalogApi(query, limit = 25) {
  const params = { limit };
  if (query && query.trim()) {
    params.query = query.trim();
  }
  const { data } = await apiClient.get('/programs', { params });
  return data;
}

export async function getProgramCatalogItemApi(programId) {
  const { data } = await apiClient.get(`/programs/${programId}`);
  return data;
}
