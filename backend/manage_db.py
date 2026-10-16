#!/usr/bin/env python3
"""Release-step database migrations (run BEFORE starting a new API release).

Uses MIGRATION_DATABASE_URL (schema-owner credentials; on Neon the direct, non-pooled
endpoint) and falls back to DATABASE_URL for local development.

  python manage_db.py            # upgrade to head (adopts a pre-Alembic DB first)
  python manage_db.py status     # print current vs head revision; exit 1 if behind
  python manage_db.py check      # exit 1 if the live schema drifts from the models

Lives in backend/ so the API container image can run it as its release command.
scripts/db_migrate.py is a wrapper for running it from the repository root.

Back up any valuable database before upgrading. Never run seed/reset scripts on real data.
"""
import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine, pool  # noqa: E402

from config import get_settings, sqlalchemy_url  # noqa: E402
from services.schema import migrate_to_head, schema_drift, schema_status  # noqa: E402


def owner_engine():
    settings = get_settings()
    url = sqlalchemy_url(settings.MIGRATION_DATABASE_URL or settings.DATABASE_URL)
    return create_engine(url, poolclass=pool.NullPool)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("action", nargs="?", default="upgrade", choices=["upgrade", "status", "check"])
    args = parser.parse_args()
    engine = owner_engine()
    try:
        if args.action == "upgrade":
            status = migrate_to_head(engine)
            print(f"Database at revision {status.current} (head {status.head})")
            return 0 if status.is_current else 1
        if args.action == "status":
            status = schema_status(engine)
            print(f"current={status.current or 'unversioned'} head={status.head} "
                  f"{'up-to-date' if status.is_current else 'BEHIND'}")
            return 0 if status.is_current else 1
        diffs = schema_drift(engine)
        if diffs:
            print("Schema drift between database and models:")
            for diff in diffs:
                print(f"  {diff}")
            return 1
        print("No schema drift: database matches the models.")
        return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
