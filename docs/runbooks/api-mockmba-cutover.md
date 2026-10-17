# Runbook: move the API to api.mockmba.com

**Why:** the site is on `https://www.mockmba.com` but the API answers on
`masters-platform-production.up.railway.app`. The refresh cookie belongs to the API host, so the
browser treats it as a third-party cookie and drops it. A page reload then signs the user out.
Once the API is on `api.mockmba.com`, both hosts are on the same site (`mockmba.com`). The
`SameSite=Lax` cookie is then first-party and sessions survive a reload.

**Code readiness (audited 2026-10-18):** you don't need a code change for this move.
- The cookie is host-only: `AUTH_COOKIE_DOMAIN` is empty, so it belongs to `api.mockmba.com` only. Its other attributes are `HttpOnly`, `Secure` outside development, `SameSite=Lax` and `Path=/auth`.
- `/auth/refresh` and `/auth/logout` accept only an `Origin` that is listed in `CORS_ORIGINS`.
- The frontend sends cookies with `withCredentials` to `REACT_APP_API_URL`.
- No startup guardrail rejects this setup.
- `backend/tests/test_auth_sessions.py::test_api_subdomain_cutover_settings` pins the exact production values below.

**Who:** the owner. The steps involve spending money and changing Railway, Cloudflare and DNS, so
nobody else runs them. **Time:** about 30–60 minutes, most of it waiting for DNS and the TLS
certificate.

The old `*.up.railway.app` URL keeps working the whole time. Until step 9 the live site still
uses it, so steps 1–8 cause no downtime.

---

## 0. Before you start

- Record the current values (names and values) on Railway → service → **Variables**: a screenshot will do. Also record the current Cloudflare Pages `REACT_APP_API_URL`. You need both to roll back.
- Check which region the Neon database is in (Neon console → project → Settings). If it isn't in Singapore or nearby, a Singapore API adds a cross-ocean round trip to every query. Decide whether that's acceptable, or plan a Neon move separately. This runbook doesn't move the database.

## 1. Confirm Railway deploys from `main`

The production API was seen still running old code after `main` was merged, and a
`pilot-deploy` branch exists.

1. Railway → service → **Settings → Source**: note the repository and **branch**.
2. If the branch isn't `main`, change it to `main` (and check that **Root directory** is `backend`). If you'd rather keep `pilot-deploy`, merge `main` into it first. Otherwise this release never ships.
3. Railway → **Deployments**: the latest successful deployment's commit should match the head of `main` on GitHub. A healthy current build also returns `"schema_current": true` from `GET /health/db`.

> The next deploy from `main` includes migration **0008** (one Why MBA taster per account). It is additive: a new nullable column and a partial unique index. The pre-deploy command `python manage_db.py` applies it before the new code starts.

## 2. Move to the Hobby plan

Railway → workspace → **Billing / Plans** → **Hobby**. This is the step that costs money (the
Hobby subscription).

## 3. Move the service to Singapore

Railway → service → **Settings → Deploy → Regions**: select **Southeast Asia (Singapore)** and
save. Railway redeploys the service. Then check that the old URL still answers:

```bash
curl -s https://masters-platform-production.up.railway.app/health
```

## 4. Add the custom domain in Railway

Railway → service → **Settings → Networking → Public Networking → + Custom Domain** → enter
`api.mockmba.com`, and set the target port to the one the service listens on (the same as the
existing Railway domain). Railway then shows a **CNAME target** (something like
`xxxx.up.railway.app`). It may also show a **TXT** verification record. Copy both.

## 5. Add the DNS record in Cloudflare

Cloudflare → `mockmba.com` → **DNS → Records → Add record**:

| Type | Name | Target | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| `CNAME` | `api` | the CNAME target from step 4 | **DNS only (grey cloud)** | Auto |

If Railway showed a TXT verification record, add that exactly as shown, also as DNS only.

**Use DNS only, not Proxied.** Railway issues and renews the TLS certificate itself and must see
the request directly. Proxying would also add a Cloudflare hop to `X-Forwarded-For`, so
`TRUSTED_PROXY_HOPS=1` would then rate-limit by a Cloudflare IP instead of the user's. If the
zone has CAA records, they must allow `letsencrypt.org`.

## 6. Wait for the certificate, then check the new host

Railway's domain row turns green ("Certificate issued") within a few minutes, and up to about an
hour on slow DNS. Then:

```bash
curl -s https://api.mockmba.com/health
```

```bash
curl -s https://api.mockmba.com/health/db
```

The first returns `"status": "healthy"` and `"app_env": "production"`. The second returns
`"schema_current": true`.

## 7. Set the Railway variables

Railway → service → **Variables**. Set these names exactly. Saving triggers a redeploy.

| Variable | Value | Note |
| --- | --- | --- |
| `APP_ENV` | `production` | unchanged |
| `PUBLIC_APP_URL` | `https://www.mockmba.com` | origin only, no trailing path |
| `CORS_ORIGINS` | `https://www.mockmba.com` | the apex 301-redirects to `www`, so it isn't needed |
| `AUTH_COOKIE_SAMESITE` | `lax` | or delete the variable (`lax` is the default); **must not** stay `none` |
| `AUTH_COOKIE_DOMAIN` | *(delete / leave empty)* | host-only cookie on `api.mockmba.com` |
| `AUTH_COOKIE_SECURE` | *(delete, or `true`)* | the default is secure outside development |
| `TRUSTED_PROXY_HOPS` | `1` | Railway's edge is the only proxy (DNS-only CNAME) |
| `CORS_ORIGIN_REGEX` | *(delete / leave empty)* | unless you deliberately allow previews |

Leave everything else unchanged: `SECRET_KEY`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `SMTP_*`,
`ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, `MOCK_MODE` and the AI keys. The cookie name
(`AUTH_COOKIE_NAME`, default `masters_refresh`) doesn't need to change.

After the redeploy, check CORS from the site's origin:

```bash
curl -si -X OPTIONS https://api.mockmba.com/auth/refresh -H "Origin: https://www.mockmba.com" -H "Access-Control-Request-Method: POST"
```

The response must include `access-control-allow-origin: https://www.mockmba.com` and
`access-control-allow-credentials: true`.

## 8. Google sign-in: no change

The Google OAuth client's **Authorized JavaScript origins** list the *site* (`https://www.mockmba.com`),
where the Google button runs. The API only checks the ID token's audience against
`GOOGLE_CLIENT_ID`. Moving the API host changes neither, so leave the Google Cloud console alone.

## 9. Point the frontend at the new API

Cloudflare → **Workers & Pages** → the Pages project → **Settings → Variables and Secrets** →
**Production**:

| Variable | Value |
| --- | --- |
| `REACT_APP_API_URL` | `https://api.mockmba.com` |

`REACT_APP_*` values are baked in at build time, so you must **redeploy**: **Deployments** →
latest production deployment → **⋯ → Retry deployment**, or push to the production branch. Wait
for the deployment to finish.

## 10. Verify in a browser

Use a normal (not private) window on `https://www.mockmba.com`:

1. Sign in, with email and with Google.
2. DevTools → **Application → Cookies → `https://api.mockmba.com`**: `masters_refresh` is there with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/auth`, and **no** Domain attribute.
3. **Reload the page.** You stay signed in, and Network shows `POST https://api.mockmba.com/auth/refresh` → **200**.
4. Close the tab, reopen `https://www.mockmba.com/app`: still signed in.
5. Sign out, then reload: you stay signed out.
6. Repeat step 3 in Safari: it is the strictest browser about third-party cookies, and the case that used to fail.

## Rollback

The old Railway URL never stops working, so rolling back is a frontend change:

1. Cloudflare Pages → Production → set `REACT_APP_API_URL` back to the value you recorded in step 0, then **Retry deployment**.
2. Restore any Railway variables you changed in step 7 to the recorded values. This matters most for `AUTH_COOKIE_SAMESITE` if it was `none` before. Railway redeploys.
3. Optional: remove the `api` CNAME in Cloudflare and the custom domain in Railway. Leaving them in place is harmless.
4. The region and plan can stay. Moving back to US West is the same setting as in step 3.

Users who signed in on the new host must sign in once more after a rollback, because their cookie
belongs to `api.mockmba.com`. Rolling back loses no data.
