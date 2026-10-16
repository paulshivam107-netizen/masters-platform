# R04 evidence: authentication and ownership hardening (2026-10-15)

Branch `r04-auth-hardening` (stacked on R03). Disposable environment only: local SQLite/Postgres,
synthetic `@example.com` accounts, mock AI. Nothing deployed.

## What changed

- Refresh token moved from the response body / `localStorage` to an `HttpOnly` cookie
  (`masters_refresh`, path `/auth`, `Secure` outside development, `SameSite=Lax`). Stored server-side
  as a SHA-256 hash only.
- Access token: 15 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`), held in JS memory only, carries a `sid`
  (session family). Revoking a family invalidates its access tokens immediately, not at expiry.
- Rotation on every refresh; reuse of a rotated token after a 30 s grace revokes the whole family;
  inside the grace a concurrent refresh from another tab gets a retryable `409 refresh_superseded`.
- Logout revokes this session (or all sessions) and clears the cookie; other tabs follow via
  `BroadcastChannel`; refreshes are serialised across tabs with Web Locks.
- `/auth/refresh` and `/auth/logout` (the only cookie-authenticated endpoints) require a trusted
  `Origin` in pilot/staging/production. All data endpoints use the `Authorization` header, which
  browsers never attach cross-site, so they are not CSRF-able.
- Inactive users rejected on every request; `ADMIN_EMAILS` grants admin only to a verified email;
  unknown-email logins spend bcrypt time (no user enumeration by timing).
- Account switching: the API client tags each request with a session version and never replays a
  queued/401-retried request after the signed-in account changes.
- Legacy `localStorage` refresh tokens from older builds are migrated to the cookie once and deleted.
- Migration `0004_refresh_token_families`.

## Automated tests

| Suite | Result |
| --- | --- |
| `tests/test_api_smoke.py` (incl. application user isolation) | 6 passed |
| `test_interviews`, `test_resume_questions`, `test_interview_plan`, `test_admin_operations`, `test_auth_email_flows`, `test_schema_migrations`, `test_postgres_runtime` (real Postgres 16, runtime-role ownership + concurrent refresh race), `test_auth_sessions` | 72 passed, 0 skipped |
| Frontend unit tests (`react-scripts test`) | 19 suites, 71 passed |

`test_auth_sessions` (14) covers: HttpOnly cookie + short access token, Secure outside development,
rotation, concurrent replay is retryable, replay after grace revokes the family, concurrent refreshes
rotate once, legacy body token migration, logout this session vs all sessions, logout with only the
cookie, inactive user lockout, untrusted Origin rejected in production, unverified admin email gets no
admin rights, Google sign-in vs unverified password owner, unknown email still spends bcrypt time.

Ownership ("A cannot read/update/delete/export B's data") is covered by the existing
`test_application_validation_and_user_isolation`, `test_interviews.test_authentication_ownership_and_private_context`
and the runtime-role ownership tests in `test_postgres_runtime`; all pass on this branch.

## Real-browser check

Production build (`REACT_APP_API_URL=http://127.0.0.1:8401`) served by `frontend/scripts/serve.cjs`
on `127.0.0.1:3401`; API via uvicorn on `127.0.0.1:8401` with `APP_ENV=development`,
`CORS_ORIGINS`/`PUBLIC_APP_URL=http://127.0.0.1:3401`, `ACCESS_TOKEN_EXPIRE_MINUTES=1`. Headless
Chromium via Playwright, script [`browser-session-check.cjs`](browser-session-check.cjs), raw output
in [`results.json`](results.json). All 15 checks passed:

| Check | Result |
| --- | --- |
| Signup reaches the workspace | pass ([01](01-after-signup.png)) |
| `localStorage` / `sessionStorage` contain no token (only UI prefs and the telemetry buffer) | pass |
| `document.cookie` is empty; refresh cookie exists with `HttpOnly`, path `/auth`, `SameSite=Lax`, 30-day expiry | pass |
| Reload keeps the user signed in and rotates the refresh cookie | pass ([02](02-after-reload.png)) |
| After the 1-minute access token expired, saving the profile: `PUT /auth/profile → 401`, `POST /auth/refresh → 200`, retried `PUT → 200` | pass ([03](03-saved-after-token-expiry.png)) |
| Second tab restores the same session | pass |
| Logout in tab 1 signs out tab 1 and tab 2 (tab 2 lands on login) and deletes the cookie | pass ([04](04-tab2-after-logout-in-tab1.png)) |
| Reload after logout stays signed out | pass ([05](05-reload-after-logout.png)) |
| Replaying an old refresh cookie after logout → 401 | pass |

Not checked in a browser: `Secure` cookie over HTTPS and real `www`/`api` subdomains (no staging yet),
Safari/Firefox (Chromium only), Google sign-in.

## XSS / token risk review

What R04 fixes: a script injected into the page can no longer read a long-lived credential. The
refresh token is `HttpOnly`, and nothing token-like is persisted in browser storage. Stolen refresh
tokens (e.g. from a device backup or proxy log) are single-use and reuse kills the session family.

What remains, honestly:

1. **XSS still owns the session while it runs.** The access token is in JS memory, so injected script
   can read it and use it for up to 15 minutes, or simply call the API from the page (and call
   `/auth/refresh`, which the browser sends the cookie to) for as long as the tab is open. Cookies
   reduce *persistence* of a theft, not the impact of live XSS. Preventing XSS is the real control.
2. **No Content-Security-Policy yet.** `_headers`/`serve.cjs` set nosniff, frame-deny, referrer and
   HSTS but no CSP. Recommended next step: `default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; connect-src 'self' https://api.<domain>; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`, starting in `Content-Security-Policy-Report-Only` to catch the prerender inline scripts/styles before enforcing.
3. The frontend has no `dangerouslySetInnerHTML`; React escaping is the current XSS defence. Any
   future markdown/HTML rendering of AI output must be sanitised.
4. Access-token theft outside the browser (logs, extensions) is limited by the 15-minute life and by
   `sid` revocation on logout.
5. CSRF: only `/auth/refresh` and `/auth/logout` use the cookie; protected by `SameSite=Lax` plus the
   trusted-Origin check. Refresh returns the new access token only in the response body, which a
   cross-site page cannot read under CORS.
6. Preview deployments on `*.pages.dev` are cross-site to `api.<domain>`; the cookie will not be sent
   there, so sessions do not persist on previews. Do not "fix" this with `SameSite=None`.
7. `localStorage` still holds per-user UI preferences and the telemetry event buffer (no secrets);
   neither is a credential.
8. Rate limiting of `/auth/*` is per-process until R05 (shared throttling).
