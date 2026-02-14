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
SKIP_E2E=0

if [[ "${1:-}" == "--skip-e2e" ]]; then
  SKIP_E2E=1
fi

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

echo "[1/7] Environment validation"
"${PYTHON_BIN}" "${ROOT_DIR}/scripts/validate_env.py"

if [[ "${RUN_DB_DRILL:-0}" == "1" ]]; then
  echo "[2/7] DB backup/restore drill"
  "${PYTHON_BIN}" "${ROOT_DIR}/scripts/db_backup_restore.py" drill
else
  echo "[2/7] DB backup/restore drill skipped (set RUN_DB_DRILL=1 to enable)"
fi

echo "[3/7] Backend API smoke tests"
"${PYTHON_BIN}" -m unittest "${BACKEND_DIR}/tests/test_api_smoke.py"

echo "[4/7] Frontend unit tests"
CI=true npm --prefix "${FRONTEND_DIR}" run test -- --watchAll=false

if [[ "${SKIP_E2E}" -eq 1 ]]; then
  echo "Skipping e2e checks (--skip-e2e)."
  echo "All non-e2e checks passed."
  exit 0
fi

echo "[5/7] Ensure backend is running for e2e"
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

echo "[6/7] Ensure frontend is running for e2e"
if ! is_url_up "http://127.0.0.1:${FRONTEND_PORT}"; then
  (
    cd "${FRONTEND_DIR}"
    CI=true BROWSER=none REACT_APP_API_URL="http://127.0.0.1:${BACKEND_PORT}" npm start
  ) >"${ROOT_DIR}/.frontend-e2e.log" 2>&1 &
  frontend_pid=$!
  frontend_started=1
  wait_for_url "http://127.0.0.1:${FRONTEND_PORT}" "frontend"
fi

echo "[7/7] Frontend Playwright smoke tests"
E2E_BASE_URL="${E2E_BASE_URL}" npm --prefix "${FRONTEND_DIR}" run e2e

echo "All checks passed."
