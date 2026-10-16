# R01 acceptance evidence — auth email origins and delivery

Run on 15 Oct 2026 against a disposable SQLite DB, the production frontend build served by
`frontend/scripts/serve.cjs`, and a local STARTTLS + AUTH SMTP server (`smtp_capture.py`) that
stores real messages sent by the API. No external email was sent.

`email-link-flow.cjs` (Playwright, Chromium) performed:

| Step | Result |
| --- | --- |
| Sign up via API, read the real verification email | Link = `PUBLIC_APP_URL/auth/verify-email#token=…` (no localhost, token in fragment) |
| Open link on a 390px viewport | "Your email is verified."; address bar stripped to `/auth/verify-email` |
| Open the same link again in a fresh tab | Rejected, with "Send a new link" recovery form |
| Request password reset, open real reset email on desktop | Form shown, new password saved, "signed out on other devices" |
| Log in with the new password | 200; `email_verified: true` |
| Network requests containing `token=` across the run | 0 |

Static routing (`serve.cjs`): `/auth/verify-email` and `/auth/reset-password` → 200 app shell with
`X-Robots-Tag: noindex, nofollow`; unknown paths → genuine 404.

Startup guards: `APP_ENV=production` refuses to start with an `http://` or localhost
`PUBLIC_APP_URL`, or without SMTP credentials.

Automated: `backend/tests/test_auth_email_flows.py` (13 tests) and
`frontend/src/components/public/AuthLinkPage.test.js` (6 tests).

Not covered here: delivery through the real email provider (needs the owner's domain and
SPF/DKIM/DMARC; tracked under R03/email setup).
