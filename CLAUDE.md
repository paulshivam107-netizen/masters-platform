# MockMBA

AI mock-interview coach for MBA, EMBA and MiM applicants. Live at www.mockmba.com.
GitHub repo is `masters-platform`; the local folder is `mba-platform`.
Start with `docs/SESSION_HANDOFF.md`. Deploy steps are in `docs/DEPLOYMENT.md` and `docs/runbooks/`.

## Stack
- `frontend/`: React 18 (CRA). Public pages are prerendered by `scripts/prerender.cjs` using `src/seo/metadata.js`.
- `backend/`: FastAPI. SQLite locally, Neon Postgres in production.
- Hosts: www.mockmba.com on Cloudflare Pages, api.mockmba.com on Railway.

## Run and test
- Everything CI runs: `bash scripts/run_checks.sh` (add `--skip-e2e` to skip Playwright).
- Frontend unit tests: `CI=true npm --prefix frontend run test -- --watchAll=false`
- One backend test: `cd backend && ../.venv/bin/python -m unittest tests.test_public_try`
- `tests.test_resume_questions` needs `pypdf`, which is not installed locally. CI covers it.

## Git and PRs
- `main` is protected: required check `test`, branch must be up to date, applies to admins. Work on a branch and open a PR.
- Merge with a merge commit. Auto-merge is off.
- When a PR goes BEHIND after another merges: `gh pr update-branch <n>`, then wait for CI.
- Read CI with the PR status tool. Do not poll it with `gh`, loops or sleeps.
- `.claude/` is untracked except `.claude/rules/`. Do not commit `launch.json`, `settings.local.json` or worktrees.

## AI spend (rupees, enforced in `backend/services/ai_costs.py`)
- Daily caps in paise: `AI_GLOBAL_DAILY_CAP_PAISE` 5000 (₹50), `AI_USER_DAILY_CAP_PAISE` 500 (₹5), `AI_ANON_DAILY_CAP_PAISE` 1000 (₹10).
- Every model call goes through the ledger: `reserve`, then `finish`. Never call a model outside it.
- The signed-out "try one question" ships OFF (`ANON_TRY_ENABLED` defaults false). It also needs `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` and `TRUSTED_PROXY_HOPS`, and fails closed in production without them. Do not turn it on without the owner's go-ahead.

## Secrets
- The owner enters secrets. Never print, log or commit `.env*` (there are old backups in the repo root).

## Visitor-facing copy
- Do not use the word "pilot" on pages visitors read. Use "Free to use right now". The disclaimer and privacy text still say pilot on purpose.

## School facts (`frontend/src/content/schools/*.js`)
- Each school has a `checked` date and source URLs. Check a fact against the school's own page before using it.
- The school-level `interview` block describes the flagship programme only. Other programmes carry their own `interview` block. At IIMA the school block is PGP and PGPX has its own.
- When you quote a school fact anywhere (page, tweet, reply), name the programme.
- Do not change a sourced page on someone's say-so. Ask for the source, then record it.

## Marketing
- Tweet bank: `marketing/tweets.md` (untracked). Voice rules: `.claude/rules/marketing.md`.
