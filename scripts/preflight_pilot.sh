#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
PYTHON_BIN="python3"
RUN_E2E="${RUN_E2E:-0}"

if [[ -x "${VENV_PYTHON}" ]]; then
  PYTHON_BIN="${VENV_PYTHON}"
fi

echo "[1/3] Pilot env validation (strict)"
APP_ENV=pilot "${PYTHON_BIN}" "${ROOT_DIR}/scripts/validate_env.py" --strict

echo "[2/3] Non-e2e smoke checks"
bash "${ROOT_DIR}/scripts/run_checks.sh" --skip-e2e

if [[ "${RUN_E2E}" == "1" ]]; then
  echo "[3/3] Full pilot gate (includes e2e)"
  APP_ENV=pilot RUN_RESET=0 E2E_WORKERS=1 bash "${ROOT_DIR}/scripts/pilot_ready_check.sh"
else
  echo "[3/3] Full pilot gate skipped (set RUN_E2E=1 to run scripts/pilot_ready_check.sh)"
fi

echo "Pilot preflight passed."
