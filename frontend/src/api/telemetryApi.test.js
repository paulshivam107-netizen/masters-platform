import { apiClient, installSessionRecovery, setAuthToken } from './client';
import { ingestTelemetryEventApi } from './telemetryApi';

const tokenFor = (payload) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.synthetic-signature`;
const freshToken = () => tokenFor({ exp: Math.floor(Date.now() / 1000) + 300 });
let removeRecovery;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('refresh_token', 'valid-synthetic-refresh');
  localStorage.setItem('user', JSON.stringify({ id: 1 }));
});

afterEach(() => {
  removeRecovery?.();
  removeRecovery = undefined;
  jest.restoreAllMocks();
  setAuthToken(null, { newSession: true });
  delete apiClient.defaults.adapter;
  localStorage.clear();
});

test.each([
  ['missing', null, 'no-auth-token'],
  ['malformed', 'not-a-jwt', 'invalid-auth-token'],
  ['invalid payload', 'header.%%%.signature', 'invalid-auth-token'],
  ['missing expiry', tokenFor({ sub: '1' }), 'invalid-auth-token'],
  ['nonnumeric expiry', tokenFor({ exp: '9999999999' }), 'invalid-auth-token'],
  ['nonfinite expiry', `header.${btoa('{"exp":1e400}')}.signature`, 'invalid-auth-token'],
  ['expired', tokenFor({ exp: 1 }), 'expired-auth-token'],
])('%s credentials skip telemetry without altering the session', async (_name, token, reason) => {
  if (token) localStorage.setItem('token', token);
  setAuthToken(token || 'synthetic-in-memory-session', { newSession: true });
  const authorization = apiClient.defaults.headers.common.Authorization;
  const post = jest.spyOn(apiClient, 'post');

  await expect(ingestTelemetryEventApi('view_changed')).resolves.toEqual({ success: false, skipped: true, reason });

  expect(post).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBe(token);
  expect(localStorage.getItem('refresh_token')).toBe('valid-synthetic-refresh');
  expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1 }));
  expect(apiClient.defaults.headers.common.Authorization).toBe(authorization);
});

test('unavailable browser storage skips the event without an API request', async () => {
  const post = jest.spyOn(apiClient, 'post');
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  await expect(ingestTelemetryEventApi('view_changed')).resolves.toMatchObject({ skipped: true, reason: 'storage-unavailable' });
  expect(post).not.toHaveBeenCalled();
});

test('a usable token sends the event through the shared client', async () => {
  const token = freshToken();
  localStorage.setItem('token', token);
  setAuthToken(token, { newSession: true });
  const post = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
  await expect(ingestTelemetryEventApi('view_changed', { view: 'today' })).resolves.toEqual({ success: true });
  expect(post).toHaveBeenCalledWith('/telemetry/events', { event_name: 'view_changed', payload_json: '{"view":"today"}' });
});

test('skipping expired telemetry leaves central session recovery working for the next API request', async () => {
  const expired = tokenFor({ exp: 1 });
  localStorage.setItem('token', expired);
  setAuthToken(expired, { newSession: true });
  const refresh = jest.fn(async () => {
    expect(localStorage.getItem('refresh_token')).toBe('valid-synthetic-refresh');
    const fresh = freshToken();
    localStorage.setItem('token', fresh);
    setAuthToken(fresh);
    return true;
  });
  removeRecovery = installSessionRecovery(refresh);
  const adapter = jest.fn((config) => config.headers.Authorization === `Bearer ${expired}`
    ? Promise.reject({ config, response: { status: 401 } })
    : Promise.resolve({ data: 'recovered', status: 200, config }));
  apiClient.defaults.adapter = adapter;

  await expect(ingestTelemetryEventApi('view_changed')).resolves.toMatchObject({ skipped: true });
  expect(adapter).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  await expect(apiClient.get('/applications/')).resolves.toMatchObject({ data: 'recovered' });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(2);
});
