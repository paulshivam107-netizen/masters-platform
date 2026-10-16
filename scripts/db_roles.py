#!/usr/bin/env python3
"""Create or refresh the restricted PostgreSQL runtime role the API connects as.

Run once per database with schema-owner credentials, after `db_migrate.py`:

  MIGRATION_DATABASE_URL=postgresql://owner:...@host/db \\
  APP_RUNTIME_DB_PASSWORD='<long random secret>' \\
  python scripts/db_roles.py [--role app_runtime]

Then point the API's DATABASE_URL at that role (on Neon, via the pooled endpoint).

The runtime role can read and write rows (SELECT/INSERT/UPDATE/DELETE) and use sequences,
can only READ alembic_version, and cannot create, alter or drop anything. Tables created by
future migrations (run as the owner) are granted automatically via default privileges.
Ownership/isolation between applicants is enforced by the API, not by RLS (see
docs/future-roadmap/02_ARCHITECTURE_AND_DEPLOYMENT.md, step B). The password is never printed.
"""
import argparse
import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "backend"))

import psycopg2  # noqa: E402
from psycopg2 import sql  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from config import get_settings, sqlalchemy_url  # noqa: E402


def connect(url: str):
    u = make_url(sqlalchemy_url(url))
    if not u.drivername.startswith("postgresql"):
        raise SystemExit("db_roles.py only applies to PostgreSQL.")
    return psycopg2.connect(host=u.host, port=u.port or 5432, user=u.username, password=u.password,
                            dbname=u.database, **dict(u.query))


def apply_runtime_role(conn, role: str, password: str) -> None:
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", role):
        raise SystemExit("Role name must be a lowercase identifier.")
    if len(password) < 24:
        raise SystemExit("APP_RUNTIME_DB_PASSWORD must be at least 24 characters.")
    r = sql.Identifier(role)
    with conn, conn.cursor() as cur:
        cur.execute("SELECT current_user, current_database()")
        owner, database = cur.fetchone()
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
        if cur.fetchone() is None:
            cur.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(r, sql.Literal(password)))
        else:
            cur.execute(sql.SQL("ALTER ROLE {} WITH LOGIN PASSWORD {}").format(r, sql.Literal(password)))
        cur.execute(sql.SQL("ALTER ROLE {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS").format(r))
        # Nobody but the owner may create objects in the app schema.
        cur.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
        cur.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(sql.Identifier(database), r))
        cur.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(r))
        cur.execute(sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}").format(r))
        cur.execute(sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}").format(r))
        cur.execute(sql.SQL("ALTER DEFAULT PRIVILEGES FOR ROLE {} IN SCHEMA public "
                            "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}").format(sql.Identifier(owner), r))
        cur.execute(sql.SQL("ALTER DEFAULT PRIVILEGES FOR ROLE {} IN SCHEMA public "
                            "GRANT USAGE, SELECT ON SEQUENCES TO {}").format(sql.Identifier(owner), r))
        # The API reads the migration version at startup but must never change it.
        cur.execute("SELECT to_regclass('public.alembic_version') IS NOT NULL")
        if cur.fetchone()[0]:
            cur.execute(sql.SQL("REVOKE ALL ON public.alembic_version FROM {}").format(r))
            cur.execute(sql.SQL("GRANT SELECT ON public.alembic_version TO {}").format(r))
    print(f"Runtime role '{role}' ready on database '{database}' (owner '{owner}').")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--role", default="app_runtime")
    args = parser.parse_args()
    settings = get_settings()
    owner_url = settings.MIGRATION_DATABASE_URL or settings.DATABASE_URL
    password = os.environ.get("APP_RUNTIME_DB_PASSWORD", "")
    conn = connect(owner_url)
    try:
        apply_runtime_role(conn, args.role, password)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
