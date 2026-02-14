#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
if [[ ! -x "${PYTHON_BIN}" ]]; then
  PYTHON_BIN="python3"
fi

E2E_WORKERS="${E2E_WORKERS:-1}"
RUN_RESET="${RUN_RESET:-1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
START_TS="$(date +%s)"
CURRENT_STEP="init"
backend_started=0
backend_pid=""

cleanup() {
  if [[ "${backend_started}" -eq 1 ]] && [[ -n "${backend_pid}" ]]; then
    kill "${backend_pid}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

is_url_up() {
  local url="$1"
  curl -fsS "${url}" >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  local delay="${3:-1}"
  for _ in $(seq 1 "${attempts}"); do
    if is_url_up "${url}"; then
      return 0
    fi
    sleep "${delay}"
  done
  return 1
}

on_error() {
  local exit_code="$1"
  local end_ts
  end_ts="$(date +%s)"
  local elapsed=$((end_ts - START_TS))
  echo ""
  echo "Pilot readiness check: FAILED"
  echo "Failed step: ${CURRENT_STEP}"
  echo "Elapsed: ${elapsed}s"
  exit "${exit_code}"
}
trap 'on_error $?' ERR

echo "== Pilot readiness check =="

CURRENT_STEP="validate-env"
echo "[1/5] Validate environment configuration"
"${PYTHON_BIN}" "${ROOT_DIR}/scripts/validate_env.py"

if [[ "${RUN_RESET}" == "1" ]]; then
  CURRENT_STEP="reset-seed"
  echo "[2/5] Reset and seed local data"
  bash "${ROOT_DIR}/scripts/reset_seed_local.sh"
else
  echo "[2/5] Reset and seed local data (skipped: RUN_RESET=${RUN_RESET})"
fi

CURRENT_STEP="backend-health"
echo "[3/5] Ensure backend is running + verify health endpoint"
if ! is_url_up "http://127.0.0.1:${BACKEND_PORT}/health"; then
  (
    cd "${BACKEND_DIR}"
    "${PYTHON_BIN}" -m uvicorn main:app --host 127.0.0.1 --port "${BACKEND_PORT}" --log-level warning
  ) >"${ROOT_DIR}/.backend-pilot-ready.log" 2>&1 &
  backend_pid=$!
  backend_started=1
fi
wait_for_url "http://127.0.0.1:${BACKEND_PORT}/health" 45 1
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null

CURRENT_STEP="e2e-suite"
echo "[4/5] Run full E2E suite"
E2E_WORKERS="${E2E_WORKERS}" bash "${ROOT_DIR}/scripts/run_e2e_full.sh"

CURRENT_STEP="post-summary"
echo "[5/5] Final summary"
END_TS="$(date +%s)"
ELAPSED=$((END_TS - START_TS))
echo ""
echo "Pilot readiness check: PASSED"
echo "E2E workers: ${E2E_WORKERS}"
echo "Elapsed: ${ELAPSED}s"
