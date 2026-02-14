import { apiClient } from './client';

export async function listEssaysApi() {
  const { data } = await apiClient.get('/essays/');
  return data;
}

export async function listEssayVersionsApi(essayId) {
  const { data } = await apiClient.get(`/essays/${essayId}/versions`);
  return data;
}

export async function createEssayApi(payload) {
  const { data } = await apiClient.post('/essays/', payload);
  return data;
}

export async function reviewEssayApi(essayId, payload) {
  const { data } = await apiClient.post(`/essays/${essayId}/review`, payload);
  return data;
}

export async function assistEssayOutlineApi(payload) {
  const { data } = await apiClient.post('/essays/assist/outline', payload);
  return data;
}

export async function deleteEssayApi(essayId) {
  const { data } = await apiClient.delete(`/essays/${essayId}`);
  return data;
}
