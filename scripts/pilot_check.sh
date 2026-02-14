#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
PYTHON_BIN="python3"

if [[ -x "${VENV_PYTHON}" ]]; then
  PYTHON_BIN="${VENV_PYTHON}"
fi

echo "==> Frontend build check"
cd "$ROOT_DIR/frontend"
npm run build >/dev/null
echo "Frontend build passed"

echo "==> Backend import + health check"
cd "$ROOT_DIR"
PYTHONDONTWRITEBYTECODE=1 "${PYTHON_BIN}" - <<'PY'
import sys
sys.path.append('backend')
import main  # noqa
from routers.system_routes import health_check

health = health_check()
print("Backend health:", health)
if health.get("status") != "healthy":
    raise SystemExit("Backend health check failed")
PY

echo "==> Backend smoke tests"
PYTHONDONTWRITEBYTECODE=1 "${PYTHON_BIN}" -m unittest discover -s backend/tests -p "test_*.py" >/dev/null
echo "Backend smoke tests passed"

echo "Pilot check complete"
