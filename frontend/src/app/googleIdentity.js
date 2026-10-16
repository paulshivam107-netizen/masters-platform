import { getGoogleAuthConfigApi } from '../api/authApi';

let cachedClientId = null;
let inflightClientId = null;
let initializedFor = null;
let credentialHandler = null;

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

export async function waitForGoogleIdentity(timeoutMs = GOOGLE_LOAD_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return window.google.accounts.id;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Google sign-in could not load. Check your connection or ad blocker, then refresh.');
}

/**
 * Render Google's official "Continue with Google" button into `container`.
 *
 * The rendered button always opens Google's account chooser. The One Tap prompt used before
 * is suppressed by browsers in many situations (third-party cookie and FedCM rules, cooldown
 * after a dismissal), which surfaced as "Google sign-in is unavailable".
 * Google allows one initialize() per page, so the latest mounted button receives credentials.
 */
export function renderGoogleButton(googleIdentity, clientId, container, { onCredential, text, width, theme }) {
  credentialHandler = onCredential;
  if (initializedFor !== clientId) {
    googleIdentity.initialize({
      client_id: clientId,
      callback: (response) => {
        if (credentialHandler) credentialHandler(response?.credential || null);
      },
    });
    initializedFor = clientId;
  }
  container.replaceChildren();
  googleIdentity.renderButton(container, {
    type: 'standard',
    theme: theme || 'outline',
    size: 'large',
    shape: 'rectangular',
    logo_alignment: 'center',
    text,
    width,
  });
}
