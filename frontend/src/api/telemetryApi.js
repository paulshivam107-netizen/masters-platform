import { apiClient } from './client';

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch (_err) {
    return null;
  }
}

function hasUsableAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'no-auth-token' };
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'invalid-auth-token' };
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowEpoch) {
    return { ok: false, reason: 'expired-auth-token' };
  }

  return { ok: true, reason: null };
}

export async function ingestTelemetryEventApi(eventName, payload = null) {
  const token = localStorage.getItem('token');
  const tokenState = hasUsableAuthToken(token);
  if (!tokenState.ok) {
    if (tokenState.reason === 'expired-auth-token' || tokenState.reason === 'invalid-auth-token') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      delete apiClient.defaults.headers.common.Authorization;
    }
    return { success: false, skipped: true, reason: tokenState.reason };
  }
  const serializedPayload = payload ? JSON.stringify(payload) : null;
  const { data } = await apiClient.post('/telemetry/events', {
    event_name: eventName,
    payload_json: serializedPayload
  });
  return data;
}
