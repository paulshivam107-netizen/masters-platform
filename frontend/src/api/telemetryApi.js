import { apiClient } from './client';

function telemetryTokenState(token) {
  if (!token) return 'no-auth-token';
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) return 'invalid-auth-token';
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    if (!payload || !Number.isFinite(payload.exp)) return 'invalid-auth-token';
    return payload.exp <= Math.floor(Date.now() / 1000) ? 'expired-auth-token' : null;
  } catch (_error) {
    return 'invalid-auth-token';
  }
}

export async function ingestTelemetryEventApi(eventName, payload = null) {
  let token;
  try {
    token = localStorage.getItem('token');
  } catch (_error) {
    return { success: false, skipped: true, reason: 'storage-unavailable' };
  }
  // Best-effort preflight only; the server still verifies the JWT.
  // Session refresh and logout belong to AuthContext, never to telemetry.
  const reason = telemetryTokenState(token);
  if (reason) {
    return { success: false, skipped: true, reason };
  }
  const serializedPayload = payload ? JSON.stringify(payload) : null;
  const { data } = await apiClient.post('/telemetry/events', {
    event_name: eventName,
    payload_json: serializedPayload
  });
  return data;
}
