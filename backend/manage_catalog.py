#!/usr/bin/env python3
"""Programme catalogue maintenance (R09).

  python manage_catalog.py import-seed                 # load data/program_catalog_seed.json
  python manage_catalog.py import-seed --file other.json

Imports are idempotent: programmes that already exist in the database are skipped, so a re-run
never overwrites reviewed data. New records arrive as UNVERIFIED drafts and are not public until
an admin reviews and publishes them. The seed file is only read, never written.

Uses DATABASE_URL (the schema must already be migrated: python manage_db.py).
"""
import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import SessionLocal  # noqa: E402
from services.program_catalog import SEED_PATH, import_seed  # noqa: E402


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("action", choices=["import-seed"])
    parser.add_argument("--file", type=Path, default=SEED_PATH)
    args = parser.parse_args(argv)
    with SessionLocal() as db:
        result = import_seed(db, args.file)
    print(f"created={len(result['created'])} skipped={len(result['skipped'])} invalid={len(result['invalid'])}")
    for program_id in result["created"]:
        print(f"  + {program_id} (unverified draft)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
