#!/usr/bin/env python3
"""Run database migrations from the repository root. See backend/manage_db.py for usage."""
import runpy
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.argv[0] = str(BACKEND_DIR / "manage_db.py")
runpy.run_path(str(BACKEND_DIR / "manage_db.py"), run_name="__main__")
