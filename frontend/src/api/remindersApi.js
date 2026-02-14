import { apiClient } from './client';

export async function previewRemindersApi() {
  const { data } = await apiClient.get('/reminders/preview');
  return data;
}

export async function sendTestReminderApi() {
  const { data } = await apiClient.post('/reminders/send-test');
  return data;
}
