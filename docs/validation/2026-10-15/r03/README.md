# R03 evidence — production build and deployment configuration

15 Oct 2026. No real deployment: accounts and domain are owner actions. Everything below ran
locally against the production builds.

## Frontend on Cloudflare's runtime

The production build (indexing on, placeholder domain) was served with `wrangler pages dev`
(wrangler 4.151, Cloudflare's local Pages runtime honouring `_redirects`/`_headers`).
`check-routes.cjs` passed all 16 checks ([output](cloudflare-runtime-routes.txt)); the local
`serve.cjs` preview passes the same checks.

| Behaviour | Result |
| --- | --- |
| Public pages at canonical URLs | 200, canonical tag = request path |
| Trailing slash / `.html` variants | 308 → canonical URL |
| `/app`, `/app/*`, `/auth`, `/auth/*` | 200 app shell + `X-Robots-Tag: noindex, nofollow` |
| Unknown paths | real 404 page with status 404 |
| Hashed `/static/*` assets | `Cache-Control: public, max-age=31536000, immutable` |
| Security headers on pages | nosniff, DENY framing, strict referrer, permissions policy, HSTS |
| Browser deep links (Chromium, 390px) | guide renders; logged-out `/app/interviews` → `/auth?mode=login&next=%2Fapp%2Finterviews`; `/auth/reset-password` renders; no page errors |

Bug found and fixed: with the previous `guides/x/index.html` layout, Cloudflare answers
`/guides/x` with `308 → /guides/x/` (reproduced on the same runtime), so every canonical URL
would have been a redirect. The build now emits `guides/x.html`.

## API container

Docker Hub is unreachable from the build workspace, so the image itself builds in CI
(`docker build backend`). The exact image `CMD` was run as an unprivileged user against
PostgreSQL 16 in `APP_ENV=production`:

1. Before migrations: refuses to start (`SchemaNotReady`), creates nothing.
2. Release command `python manage_db.py` (owner role): migrates to head.
3. Start as `app_runtime`: `/health/db` → 200, `schema_current: true`; client IP taken from
   `X-Forwarded-For` (proxy headers); no `Server` banner.

## Not yet verifiable

HTTPS, custom domains, Railway health-gated deploys, Neon pooling and real email delivery need
the owner's accounts. `docs/DEPLOYMENT.md` lists the exact settings and the post-deploy checks.
