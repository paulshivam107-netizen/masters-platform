# Deployment runbook

How to take the app live on the hosting chosen in the [architecture plan](future-roadmap/02_ARCHITECTURE_AND_DEPLOYMENT.md):
**Cloudflare Pages** (frontend), **Railway** (FastAPI container), **Neon** (PostgreSQL).
Nothing here has been deployed yet; accounts, payment and KYC are owner actions.

```
browser ──► www.<domain>  Cloudflare Pages   static, prerendered public pages + app shell
        └─► api.<domain>  Railway container  FastAPI (runtime DB role, 1 replica)
                              │ pre-deploy: python manage_db.py (owner DB role)
                              ▼
                          Neon PostgreSQL     pooled endpoint (API) / direct endpoint (migrations)
```

## 0. Owner prerequisites

| Item | Notes |
| --- | --- |
| Domain | Registrar account with MFA. Decide the canonical host (recommended `www.<domain>`; apex redirects to it) and `api.<domain>` for the API |
| Cloudflare | Free plan is enough. Moving the domain's DNS to Cloudflare simplifies custom domains |
| Neon | Project in the region closest to India that Neon offers (check at signup) |
| Railway | Place the service in the same or a nearby region as Neon. Hobby can serve an invited pilot; budget Pro for public paid use (see [pricing](future-roadmap/03_PRICING_AND_ECONOMICS.md)) |
| Transactional email | Any provider with SMTP (e.g. Resend, Brevo, Amazon SES, Zoho). Use a sending subdomain such as `mail.<domain>` and add its SPF, DKIM and DMARC records |
| Billing alerts | Set spend alerts/caps on Railway, Neon and the AI provider before sharing any link |

## 1. Database (Neon)

1. Create the project and database. Note two connection strings for the **owner** role:
   the **direct** endpoint (migrations) and the **pooled** endpoint (hostname contains `-pooler`).
2. From your machine, in the repository:

   ```bash
   export MIGRATION_DATABASE_URL='postgresql://<owner>:<pw>@<direct-host>/<db>?sslmode=require'
   python scripts/db_migrate.py            # creates the schema at head
   python scripts/db_migrate.py check      # "No schema drift"
   export APP_RUNTIME_DB_PASSWORD="$(openssl rand -base64 32)"   # store it in your password manager
   python scripts/db_roles.py              # creates app_runtime (no DDL rights)
   ```

3. The API's `DATABASE_URL` is then `postgresql://app_runtime:<that password>@<pooled-host>/<db>?sslmode=require`.

Keep staging and production as separate Neon projects or branches with separate roles. Never point
staging at production data.

## 2. API (Railway)

Create one service from this GitHub repository. Settings (dashboard → service → Settings):

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Builder | Dockerfile (`backend/Dockerfile`) |
| Pre-deploy command | `python manage_db.py` |
| Healthcheck path | `/health/db` (fails until the schema is current and the DB is reachable) |
| Replicas | 1 (the auth rate limiter is in-process until R05) |
| Custom domain | `api.<domain>` |

The start command comes from the Dockerfile. Railway's `railway.json` config-as-code is deprecated
for new services (Railway docs, Oct 2026), so these settings are documented here instead of committed.

Variables (Railway → Variables; secrets never go in the frontend):

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` (or `staging` / `pilot`) |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `DATABASE_URL` | runtime role, **pooled** endpoint |
| `MIGRATION_DATABASE_URL` | owner role, **direct** endpoint (used only by the pre-deploy command) |
| `PUBLIC_APP_URL` | `https://www.<domain>` (email links) |
| `CORS_ORIGINS` | `https://www.<domain>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | from the email provider; `SMTP_FROM=no-reply@mail.<domain>` |
| `ADMIN_EMAILS` | your login email |
| `MOCK_MODE`, `OPENAI_API_KEY` / `GEMINI_API_KEY` | keep `MOCK_MODE=true` until R05/R07 (spend caps, live evaluation) are done |
| `GOOGLE_CLIENT_ID` | optional |

The API refuses to start if `PUBLIC_APP_URL` is not HTTPS, SMTP is missing, CORS contains localhost,
`SECRET_KEY` is weak, or the schema is not at head. Run `python scripts/validate_env.py` locally with
the same values to see every problem at once.

## 3. Frontend (Cloudflare Pages)

Create a Pages project connected to the repository:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm ci --legacy-peer-deps && npm run build` |
| Output directory | `build` |
| Node version | from `frontend/.node-version` (20) |
| Custom domain | `www.<domain>`; redirect the apex to it |

Environment variables — **Production** only:

| Variable | Value |
| --- | --- |
| `REACT_APP_API_URL` | `https://api.<domain>` |
| `REACT_APP_SITE_URL` | `https://www.<domain>` |
| `REACT_APP_SITE_NAME` | the brand name |
| `REACT_APP_ALLOW_INDEXING` | `true` |
| `REACT_APP_GOOGLE_CLIENT_ID` | optional, public client ID only |

For **Preview** deployments set `REACT_APP_API_URL` to staging and leave `REACT_APP_ALLOW_INDEXING`
unset: preview builds then emit `Disallow: /` and `noindex` on every page.

Routing and headers live in `frontend/public/_redirects` and `_headers`: `/app/*` and `/auth/*` render
the noindex app shell, public pages are prerendered `*.html` served at extensionless URLs (matching
their canonical tags), and unknown paths return the real 404 page. Consider a Cloudflare Bulk
Redirect from `<project>.pages.dev` to `www.<domain>` so only one host serves production content.

## 4. Verify a release

```bash
npm --prefix frontend run check:routes -- https://www.<domain>   # 16 status/redirect/robots/canonical checks
npm --prefix frontend run check:routes -- https://<branch>.<project>.pages.dev --preview   # preview builds
curl -s https://api.<domain>/health/db                             # "schema_current": true
```

Then by hand, on a phone over mobile data: sign up with a real mailbox → open the verification email
link → log out → "Forgot password?" → open the reset link → log in with the new password. Check that the
links start with `https://www.<domain>/auth/` and that the address bar loses the `#token=` part.

Search setup (after the first production deploy): verify the domain in Google Search Console and Bing
Webmaster Tools, submit `https://www.<domain>/sitemap.xml`, and inspect the home page and one guide.

## 5. Rollback

- **Frontend:** Cloudflare Pages → Deployments → roll back to the previous deployment (instant).
- **API, no schema change in the release:** Railway → redeploy the previous deployment.
- **API with a schema change:** migrations are forward-only. If no user writes happened since, restore
  the Neon database to the pre-release point (Neon restore/branch) and redeploy the previous image.
  If users have written data since, fix forward with a new migration; do not restore over their writes.
  Take a Neon branch/snapshot before every release that contains a migration.

## Local equivalents

- `python scripts/db_migrate.py status|check` against any database.
- `cd frontend && npm run build && PORT=3181 node scripts/serve.cjs` serves the build with the same
  routing rules; `npm run check:routes -- http://127.0.0.1:3181` checks it. CI runs both.
- `npx wrangler pages dev frontend/build` runs Cloudflare's own runtime locally with `_redirects`/`_headers`.
