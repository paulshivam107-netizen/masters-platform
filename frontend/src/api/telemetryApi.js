import { apiClient } from './client';

export async function ingestTelemetryEventApi(eventName, payload = null) {
  const serializedPayload = payload ? JSON.stringify(payload) : null;
  const { data } = await apiClient.post('/telemetry/events', {
    event_name: eventName,
    payload_json: serializedPayload
  });
  return data;
}
