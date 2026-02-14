#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
BACKUP_DIR="${ROOT_DIR}/backups"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
PYTHON_BIN="python3"

if [[ -x "${VENV_PYTHON}" ]]; then
  PYTHON_BIN="${VENV_PYTHON}"
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
E2E_EMAIL="${E2E_EMAIL:-pilot.user.e2e@gmail.com}"
E2E_PASSWORD="${E2E_PASSWORD:-Axiom!Pilot_User#2026}"
E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-pilot.admin.e2e@gmail.com}"
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-Axiom!Pilot_Admin#2026}"

find_pids_on_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

stop_server_on_port() {
  local port="$1"
  local label="$2"
  local pids
  pids="$(find_pids_on_port "${port}")"
  if [[ -n "${pids}" ]]; then
    echo "Stopping ${label} on :${port} (${pids})"
    kill ${pids} >/dev/null 2>&1 || true
    sleep 1
  fi
}

echo "[1/6] Stop running dev servers (if any)"
stop_server_on_port "${BACKEND_PORT}" "backend"
stop_server_on_port "${FRONTEND_PORT}" "frontend"

echo "[2/6] Resolve sqlite database path"
DB_PATH="$(
  cd "${BACKEND_DIR}"
  "${PYTHON_BIN}" - <<'PY'
from pathlib import Path
from config import get_settings

url = get_settings().DATABASE_URL
if not url.startswith("sqlite:///"):
    raise SystemExit(f"Non-sqlite DATABASE_URL configured: {url}")
db_rel = url.replace("sqlite:///", "", 1)
db_path = Path(db_rel)
if not db_path.is_absolute():
    db_path = (Path.cwd() / db_path).resolve()
print(db_path)
PY
)"

echo "Using DB: ${DB_PATH}"

echo "[3/6] Backup existing DB (if present)"
mkdir -p "${BACKUP_DIR}"
if [[ -f "${DB_PATH}" ]]; then
  backup_file="${BACKUP_DIR}/$(basename "${DB_PATH%.*}")-pre-reset-$(date +%Y%m%d-%H%M%S).sqlite3"
  cp "${DB_PATH}" "${backup_file}"
  echo "Backup created: ${backup_file}"
else
  echo "No existing DB file found. Continuing."
fi

echo "[4/6] Reset schema + seed pilot data"
rm -f "${DB_PATH}"
(
  cd "${BACKEND_DIR}"
  "${PYTHON_BIN}" "${ROOT_DIR}/scripts/db_migrate.py"
  "${PYTHON_BIN}" "${ROOT_DIR}/scripts/seed_pilot_data.py"
)

echo "[5/6] Provision deterministic E2E users"
(
  cd "${BACKEND_DIR}"
  "${PYTHON_BIN}" - <<PY
from auth import get_password_hash
from database import SessionLocal
from models import User

users = [
    {
        "email": "${E2E_EMAIL}".strip().lower(),
        "name": "Pilot E2E User",
        "password": "${E2E_PASSWORD}",
        "role": "user",
    },
    {
        "email": "${E2E_ADMIN_EMAIL}".strip().lower(),
        "name": "Pilot E2E Admin",
        "password": "${E2E_ADMIN_PASSWORD}",
        "role": "admin",
    },
]

db = SessionLocal()
try:
    for payload in users:
        user = db.query(User).filter(User.email == payload["email"]).first()
        password_hash = get_password_hash(payload["password"])
        if user is None:
            user = User(
                email=payload["email"],
                name=payload["name"],
                hashed_password=password_hash,
                role=payload["role"],
                email_verified=True,
                is_active=True,
                notification_email=payload["email"],
            )
            db.add(user)
            print(f"Created E2E user: {payload['email']} ({payload['role']})")
        else:
            user.name = payload["name"]
            user.hashed_password = password_hash
            user.role = payload["role"]
            user.is_active = True
            user.email_verified = True
            user.notification_email = user.notification_email or payload["email"]
            print(f"Updated E2E user: {payload['email']} ({payload['role']})")
    db.commit()
finally:
    db.close()
PY
)

echo "[6/6] Done"
echo "Local data reset complete. Next run:"
echo "  bash \"${ROOT_DIR}/scripts/run_e2e_full.sh\""
