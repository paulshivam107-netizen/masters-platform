#!/usr/bin/env bash
# One-time setup of the mockmba-prod Neon database: schema at head + restricted runtime role.
# Run it yourself in a terminal. It asks for the Neon owner password without echoing it and
# prints the two connection URLs for your password manager. Nothing is written to disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${PYTHON:-/Users/shivampaul/Documents/Projects/mba-platform/.venv/bin/python}"
DB=mockmba
OWNER=mockmba_owner
DIRECT=ep-cold-unit-a1uz18mr.ap-southeast-1.aws.neon.tech
POOLED=ep-cold-unit-a1uz18mr-pooler.ap-southeast-1.aws.neon.tech

read -rsp "Neon password for ${OWNER} (Neon > Connect > Show password): " OWNER_PW; echo
export OWNER_PW
ENCODED="$("$PY" -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["OWNER_PW"], safe=""))')"
unset OWNER_PW
export MIGRATION_DATABASE_URL="postgresql://${OWNER}:${ENCODED}@${DIRECT}/${DB}?sslmode=require"

cd "$ROOT"
echo "== Migrating to head"
"$PY" scripts/db_migrate.py
echo "== Checking for drift"
"$PY" scripts/db_migrate.py check

echo "== Creating the restricted app_runtime role"
export APP_RUNTIME_DB_PASSWORD="$(openssl rand -hex 32)"
"$PY" scripts/db_roles.py

cat <<EOF

Done. Save BOTH lines in your password manager now; Railway needs them and they are not stored anywhere:

DATABASE_URL=postgresql://app_runtime:${APP_RUNTIME_DB_PASSWORD}@${POOLED}/${DB}?sslmode=require
MIGRATION_DATABASE_URL=${MIGRATION_DATABASE_URL}

Then clear this terminal (Cmd+K).
EOF
