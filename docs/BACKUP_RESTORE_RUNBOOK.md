# PostgreSQL backup and restore runbook

Production data lives in **Neon PostgreSQL** (see [DEPLOYMENT.md](DEPLOYMENT.md)). Two independent layers:

1. **Neon point-in-time restore (PITR)**: managed, continuous, the first thing to use.
2. **Encrypted logical exports** (`scripts/db_backup_pg.sh`): copies outside Neon, so a lost Neon
   account, project deletion or a mistake that outlives the PITR window is still recoverable.

`scripts/db_backup_restore.py` copies a local **SQLite** file and is for local development only. It is not a
production backup and must not be described as one.

Nothing here has been run against a live Neon project yet; the drill below was run against a local PostgreSQL 16
(evidence: `docs/validation/2026-10-15/r06/`).

## 1. Neon point-in-time restore

Settings to record when the project is created (owner action):

| Setting | Value (fill in) |
| --- | --- |
| Plan and restore window / history retention | ______ (plan dependent; check Neon project settings) |
| Region | ______ |
| Who can restore (Neon org members with MFA) | ______ |

Use it for "undo the last N hours" (bad migration, accidental bulk delete):

1. **Stop writes**: scale the Railway API service to 0 or switch it to maintenance.
2. In the Neon console, **create a branch from a past point in time** (just before the incident). Do not restore
   the production branch in place yet.
3. Point a local shell at the branch (direct endpoint, owner role) and verify it:
   `python scripts/db_migrate.py check` (no drift) and the ownership checks in section 3.
4. Either restore the production branch to that timestamp in the Neon console (Neon keeps a backup branch of the
   pre-restore state), or swap the API's `DATABASE_URL` to the verified branch. Re-run `python scripts/db_roles.py`
   against it if the runtime role is missing.
5. **Replay account deletions** made after the restore point (section 5) before reopening.
6. Restart the API, check `/health`, sign in as a test account, then reopen.

## 2. Encrypted logical export

```bash
export BACKUP_DATABASE_URL='postgresql://<owner>:<pw>@<direct-host>/<db>?sslmode=require'
export BACKUP_ENCRYPTION_KEY='<from the password manager entry "masters backup key">'
scripts/db_backup_pg.sh /secure/backup/dir          # BACKUP_RETENTION_DAYS defaults to 35
```

- `pg_dump -Fc` is piped straight into `openssl enc -aes-256-cbc -pbkdf2 -iter 200000`; no plaintext touches disk.
  The script decrypts and lists the archive before keeping it, writes a `.sha256`, and deletes encrypted dumps older
  than the retention period in that directory.
- **Key handling:** generate once with `openssl rand -base64 48`, store it in the password manager, never in the
  repository, CI logs or the same storage bucket as the dumps. Losing the key makes every dump useless; rotating it
  means new dumps use the new key, so keep the old key until the last old dump expires.
- **Where:** a storage location outside Neon and Railway (e.g. an encrypted cloud bucket with object versioning off
  for deletion to work, or an owner machine with full-disk encryption). Weekly is a reasonable start; daily once
  there are paying users. Scheduling and missed-backup alerts are not automated yet (needs owner choice of runner).
- The output prints only the file name and size. Do not paste dumps or decrypted content into tickets or chat.

## 3. Restore drill (monthly, and after any change to the schema or the backup script)

```bash
# Synthetic drill on any disposable server (what CI/evidence uses):
DRILL_ADMIN_URL=postgresql://postgres:<pw>@127.0.0.1:5433/postgres python scripts/db_restore_drill.py

# Drill a real backup file into a scratch DB (a Neon branch or a local server, never production):
DRILL_ADMIN_URL=<server where you may create databases> BACKUP_ENCRYPTION_KEY=... \
  python scripts/db_restore_drill.py --dump /secure/backup/dir/<file>.dump.enc
```

The drill restores into a uniquely named scratch database, prints a JSON report and drops the scratch database.
It passes only if:

- schema is at head with **no drift** from the models;
- per-table row counts, per-user ownership counts (applications, essays, interview sessions/operations, résumé
  sets, feedback, tokens) and the AI usage-token total match the source (synthetic mode, or `--source-url`);
- account export for one user contains no other user's data;
- sequences continue (a new row gets a fresh id) and account deletion still works on the restored copy.

Record the date, file, `result` and duration in the operations log. A real-dump drill contains real personal
data in the scratch database for its duration; run it only on infrastructure with the same protection as production.

## 4. Full restore from a logical export (Neon unavailable)

1. Create a new empty database (new Neon project or other PostgreSQL 16).
2. `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_KEY -in <file> | pg_restore --no-owner --no-privileges --exit-on-error --dbname "$NEW_OWNER_URL"`
3. `MIGRATION_DATABASE_URL=$NEW_OWNER_URL python scripts/db_migrate.py check`, then `python scripts/db_roles.py`.
4. Replay deletions (section 5), update the API's `DATABASE_URL`, redeploy, verify, reopen.

## 5. Deletion log and restores

A restore brings back accounts that were deleted after the restore point. To keep the promise in
[DATA_RETENTION.md](DATA_RETENTION.md), before reopening a restored database: delete again every account
deleted after the restore point. Today the only record is the anonymous `account_deleted` admin event, which
deliberately has no email, so the owner must keep a separate, minimal deletion log outside the database
(date + a salted hash of the email is enough to match on re-run) until this is automated. This is an open item.

## 6. Retention summary

| Copy | Retention |
| --- | --- |
| Neon PITR history | Plan's restore window (record above) |
| Encrypted logical exports | 35 days by default (`BACKUP_RETENTION_DAYS`) |
| Local SQLite copies (`backups/`) | Development only; never hold production data |
