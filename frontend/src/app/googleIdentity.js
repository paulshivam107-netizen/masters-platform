import { getGoogleAuthConfigApi } from '../api/authApi';

let cachedClientId = null;
let inflightClientId = null;

const GOOGLE_LOAD_TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 100;

export async function resolveGoogleClientId() {
  const envClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  if (envClientId) return envClientId;

  if (cachedClientId) return cachedClientId;
  if (!inflightClientId) {
    inflightClientId = getGoogleAuthConfigApi()
      .then((payload) => {
        cachedClientId = (payload?.client_id || '').trim() || null;
        return cachedClientId;
      })
      .catch(() => null)
      .finally(() => {
        inflightClientId = null;
      });
  }
  return inflightClientId;
}

async function waitForGoogleIdentity(timeoutMs = GOOGLE_LOAD_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return window.google.accounts.id;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Google Identity script not loaded. Refresh and try again.');
}

export async function requestGoogleIdToken(clientId) {
  const googleIdentity = await waitForGoogleIdentity();

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn) => (value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    const resolveOnce = done(resolve);
    const rejectOnce = done(reject);

    const timeoutId = setTimeout(() => {
      rejectOnce(new Error('Google sign-in timed out. Please try again.'));
    }, 60000);

    googleIdentity.initialize({
      client_id: clientId,
      callback: (response) => {
        clearTimeout(timeoutId);
        if (response?.credential) {
          resolveOnce(response.credential);
        } else {
          rejectOnce(new Error('Google did not return a valid sign-in token.'));
        }
      }
    });

    googleIdentity.prompt((notification) => {
      if (settled) return;
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        clearTimeout(timeoutId);
        rejectOnce(new Error('Google sign-in is unavailable in this browser/session.'));
      }
      if (notification.isDismissedMoment()) {
        clearTimeout(timeoutId);
        rejectOnce(new Error('Google sign-in was cancelled.'));
      }
    });
  });
}
