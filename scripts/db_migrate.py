#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base, engine  # noqa: E402
from services.migrations import run_schema_migrations  # noqa: E402


if __name__ == "__main__":
    # Create base schema first so additive ALTER migrations can run on a fresh DB.
    Base.metadata.create_all(bind=engine)
    run_schema_migrations(engine)
    print("Database migrations complete")
