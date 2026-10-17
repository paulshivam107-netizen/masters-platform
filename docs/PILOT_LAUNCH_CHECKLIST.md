# Pilot launch checklist

Work through this list **immediately before inviting the first real users**. Each item is an owner action unless marked otherwise. The setup steps are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Done (16 Oct 2026)

- [x] Domain `mockmba.com` registered on Cloudflare (auto-renew on)
- [x] Resend: `mail.mockmba.com` verified; SPF, DKIM and DMARC (`p=none`) published
- [x] Neon `mockmba-prod` (Singapore, Postgres 16): schema at head, restricted `app_runtime` role
- [x] R07 interview fixes merged to main (PR #22)
- [x] API live on Railway Free at `masters-platform-production.up.railway.app` (US West, temporary). Smoke test passed: signup, a typed interview on gpt-4.1-mini, the debrief, account deletion, and a verification email delivered via Resend on port 2587

## Before inviting anyone

- [ ] **Rebrand the email copy:** subjects and bodies still say "Master's Application Platform".
- [ ] After upgrading to Hobby: move the service to Singapore (next to Neon), attach `api.mockmba.com` with a DNS-only CNAME so `TRUSTED_PROXY_HOPS=1` stays correct, and move it out of the shared `thorough-contentment` project.

- [ ] **Upgrade Railway from Free to Hobby (about $5/month).** Free has only $1 of monthly credit, so it pauses the API partway through the month. The setup and smoke test run on Free; real users need Hobby.
- [ ] Set spend alerts and caps on Railway, Neon and OpenAI. The app now defaults to `AI_GLOBAL_DAILY_CAP_PAISE=5000` (₹50/day) and `AI_USER_DAILY_CAP_PAISE=500` (₹5/day); set the same in Railway, plus a hard monthly limit in the OpenAI dashboard (about $15).
- [ ] Use a scoped Resend production key (`mockmba-prod`, sending only, `mail.mockmba.com`) in Railway. Delete the old "Onboarding" key.
- [ ] Google sign-in: OAuth client for `https://www.mockmba.com`, with the consent screen **published** (it needs the privacy policy URL). Set `GOOGLE_CLIENT_ID` in Railway and `REACT_APP_GOOGLE_CLIENT_ID` in Cloudflare Pages.
- [ ] Privacy notice published and linked from sign-up. It should cover what is stored, that answers are processed by OpenAI, and how to export or delete an account.
- [ ] `ADMIN_EMAILS` set to your login. Verify that email by signing in, so the admin views work.
- [ ] Smoke test on `https://www.mockmba.com`: sign up (password and Google), upload a résumé, run one typed interview to the debrief, then export and delete the test account.
- [ ] Decide on voice mode: phone recording is not yet verified (R08). Either test it on an iPhone and an Android phone, or label it as desktop-only for the pilot.
- [ ] Have an encrypted backup run and a restore drill done against the production database (`scripts/db_backup_pg.sh`, `scripts/db_restore_drill.py`).
- [ ] Review the 4 SEO pages and the "Free during the pilot" footer, and decide on `REACT_APP_ALLOW_INDEXING`.
