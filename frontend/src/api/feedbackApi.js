import { apiClient } from './client';

export async function submitFeedbackApi(payload) {
  const { data } = await apiClient.post('/feedback/', payload);
  return data;
}
