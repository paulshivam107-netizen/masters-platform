#!/usr/bin/env bash
# Encrypted logical backup of a PostgreSQL database (independent of Neon's own history).
#
#   BACKUP_DATABASE_URL='postgresql://owner:pw@direct-host/db?sslmode=require' \
#   BACKUP_ENCRYPTION_KEY='<long random secret from your password manager>' \
#   scripts/db_backup_pg.sh [output-dir]
#
# Writes <output-dir>/<db>-<UTC timestamp>.dump.enc (pg_dump custom format, AES-256-CBC with
# PBKDF2), a .sha256 beside it, and deletes encrypted dumps older than BACKUP_RETENTION_DAYS
# (default 35) in that directory. Nothing is ever written unencrypted to disk. The key is read
# from the environment and passed to openssl via env:, so it never appears in `ps` output.
# Use the DIRECT (non-pooler) endpoint and the owner role: pg_dump needs to read every table.
# Restore: see docs/BACKUP_RESTORE_RUNBOOK.md, or scripts/db_restore_drill.py --dump FILE.
set -euo pipefail
umask 077

: "${BACKUP_DATABASE_URL:?set BACKUP_DATABASE_URL (owner role, direct endpoint)}"
: "${BACKUP_ENCRYPTION_KEY:?set BACKUP_ENCRYPTION_KEY}"
if [[ ${#BACKUP_ENCRYPTION_KEY} -lt 24 ]]; then
  echo "BACKUP_ENCRYPTION_KEY is too short (use at least 24 random characters)" >&2
  exit 2
fi
export BACKUP_ENCRYPTION_KEY

OUT_DIR="${1:-${BACKUP_DIR:-./backups/pg}}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"
mkdir -p "${OUT_DIR}"

db_name="$(python3 -c 'import sys,urllib.parse as u; print(u.urlparse(sys.argv[1]).path.lstrip("/") or "db")' "${BACKUP_DATABASE_URL}")"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${OUT_DIR}/${db_name}-${stamp}.dump.enc"
partial="${target}.partial"
trap 'rm -f "${partial}"' EXIT

pg_dump --format=custom --no-owner --no-privileges --dbname="${BACKUP_DATABASE_URL}" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_ENCRYPTION_KEY -out "${partial}"

# Verify the file decrypts and is a readable archive before declaring success.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_KEY -in "${partial}" \
  | pg_restore --list >/dev/null

mv "${partial}" "${target}"
(cd "${OUT_DIR}" && sha256sum "$(basename "${target}")" > "$(basename "${target}").sha256")
find "${OUT_DIR}" -maxdepth 1 -name '*.dump.enc*' -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "backup ok: ${target} ($(wc -c < "${target}") bytes)"
