#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
PYTHON_BIN="python3"

if [[ -x "${VENV_PYTHON}" ]]; then
  PYTHON_BIN="${VENV_PYTHON}"
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:${FRONTEND_PORT}}"
FORCE_E2E_RESTART="${FORCE_E2E_RESTART:-1}"
E2E_WORKERS="${E2E_WORKERS:-1}"
E2E_EMAIL="${E2E_EMAIL:-pilot.user.e2e@gmail.com}"
E2E_PASSWORD="${E2E_PASSWORD:-Axiom!Pilot_User#2026}"
E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-pilot.admin.e2e@gmail.com}"
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-Axiom!Pilot_Admin#2026}"

backend_started=0
frontend_started=0
backend_pid=""
frontend_pid=""

cleanup() {
  if [[ "${frontend_started}" -eq 1 ]] && [[ -n "${frontend_pid}" ]]; then
    kill "${frontend_pid}" >/dev/null 2>&1 || true
  fi
  if [[ "${backend_started}" -eq 1 ]] && [[ -n "${backend_pid}" ]]; then
    kill "${backend_pid}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: ${key}" >&2
    return 1
  fi
  return 0
}

is_placeholder() {
  local value="${1:-}"
  local normalized
  normalized="$(echo "${value}" | tr '[:upper:]' '[:lower:]' | xargs)"

  case "${normalized}" in
    "..."|"real_user_email"|"real_user_password"|"real_admin_email"|"real_admin_password"|"your-password")
      return 0
      ;;
  esac

  if [[ "${normalized}" == *"example.com"* || "${normalized}" == *"your_"* || "${normalized}" == *"real_"* ]]; then
    return 0
  fi
  return 1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local delay="${4:-1}"
  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done
  echo "Timed out waiting for ${label} at ${url}" >&2
  return 1
}

is_url_up() {
  local url="$1"
  curl -fsS "${url}" >/dev/null 2>&1
}

find_pids_on_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

stop_existing_server_on_port() {
  local port="$1"
  local label="$2"
  local pids
  pids="$(find_pids_on_port "${port}")"
  if [[ -n "${pids}" ]]; then
    echo "Stopping existing ${label} process on :${port} (${pids})"
    kill ${pids} >/dev/null 2>&1 || true
    sleep 1
  fi
}

require_python_module() {
  local module_name="$1"
  if ! "${PYTHON_BIN}" -c "import ${module_name}" >/dev/null 2>&1; then
    echo "Missing Python module '${module_name}' in ${PYTHON_BIN}." >&2
    echo "Run: cd ${ROOT_DIR} && source .venv/bin/activate && python -m pip install -r backend/requirements.txt" >&2
    exit 1
  fi
}

echo "[1/6] Validate required E2E credentials"
require_env "E2E_EMAIL"
require_env "E2E_PASSWORD"
if is_placeholder "${E2E_EMAIL}" || is_placeholder "${E2E_PASSWORD}"; then
  echo "E2E_EMAIL / E2E_PASSWORD look like placeholders. Use real test account credentials." >&2
  exit 1
fi

if [[ -z "${E2E_ADMIN_EMAIL:-}" || -z "${E2E_ADMIN_PASSWORD:-}" ]]; then
  echo "Admin E2E creds not fully set (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)."
  echo "Admin optional tests will be skipped."
elif is_placeholder "${E2E_ADMIN_EMAIL}" || is_placeholder "${E2E_ADMIN_PASSWORD}"; then
  echo "Admin creds look like placeholders; admin optional tests may be skipped/fail."
fi

require_python_module "sqlalchemy"

echo "[2/6] Ensure backend is running"
if [[ "${FORCE_E2E_RESTART}" == "1" ]] && is_url_up "http://127.0.0.1:${BACKEND_PORT}/health"; then
  stop_existing_server_on_port "${BACKEND_PORT}" "backend"
fi
if ! is_url_up "http://127.0.0.1:${BACKEND_PORT}/health"; then
  backend_start_cmd=("${PYTHON_BIN}" "-m" "uvicorn" "main:app" "--host" "127.0.0.1" "--port" "${BACKEND_PORT}" "--log-level" "warning")
  if command -v uvicorn >/dev/null 2>&1; then
    backend_start_cmd=("uvicorn" "main:app" "--host" "127.0.0.1" "--port" "${BACKEND_PORT}" "--log-level" "warning")
  fi
  (
    cd "${BACKEND_DIR}"
    "${backend_start_cmd[@]}"
  ) >"${ROOT_DIR}/.backend-e2e.log" 2>&1 &
  backend_pid=$!
  backend_started=1
  wait_for_url "http://127.0.0.1:${BACKEND_PORT}/health" "backend"
fi

echo "[3/6] Ensure frontend is running"
if [[ "${FORCE_E2E_RESTART}" == "1" ]] && is_url_up "http://127.0.0.1:${FRONTEND_PORT}"; then
  stop_existing_server_on_port "${FRONTEND_PORT}" "frontend"
fi
if ! is_url_up "http://127.0.0.1:${FRONTEND_PORT}"; then
  (
    cd "${FRONTEND_DIR}"
    CI=true BROWSER=none REACT_APP_API_URL="http://127.0.0.1:${BACKEND_PORT}" npm start
  ) >"${ROOT_DIR}/.frontend-e2e.log" 2>&1 &
  frontend_pid=$!
  frontend_started=1
  wait_for_url "http://127.0.0.1:${FRONTEND_PORT}" "frontend"
fi

echo "[4/6] Ensure Playwright chromium is installed"
if ! find "${HOME}/Library/Caches/ms-playwright" -maxdepth 4 -type f \( -name "chrome-headless-shell" -o -name "Google Chrome for Testing" \) >/dev/null 2>&1; then
  (cd "${FRONTEND_DIR}" && npx playwright install chromium)
fi

echo "[5/6] Provision E2E users (idempotent)"
(
cd "${BACKEND_DIR}"
"${PYTHON_BIN}" - <<PY
import sys
from pathlib import Path

root_dir = Path("${ROOT_DIR}")
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from auth import get_password_hash  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import User  # noqa: E402

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
            if not user.notification_email:
                user.notification_email = payload["email"]
            print(f"Updated E2E user: {payload['email']} ({payload['role']})")
    db.commit()
finally:
    db.close()
PY
)

echo "[6/6] Run full Playwright E2E suite"
E2E_EMAIL="${E2E_EMAIL}" \
E2E_PASSWORD="${E2E_PASSWORD}" \
E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL}" \
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD}" \
E2E_BASE_URL="${E2E_BASE_URL}" \
E2E_WORKERS="${E2E_WORKERS}" \
npm --prefix "${FRONTEND_DIR}" run e2e

echo "E2E run complete."
