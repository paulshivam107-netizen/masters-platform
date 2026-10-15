"""Versioned schema management (Alembic) and the API's startup schema check.

Release model
-------------
* Migrations run as a separate release step (``python scripts/db_migrate.py``) using the
  schema-owner connection (MIGRATION_DATABASE_URL). The API process connects with a
  restricted runtime role that cannot change the schema.
* In pilot/staging/production the API never migrates. It refuses to start unless the
  database is exactly at the code's head revision, so a release can't silently run against
  an incompatible schema.
* In development, AUTO_MIGRATE_ON_STARTUP (default on) upgrades the local database so
  ``start.sh`` keeps working without an extra step.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect
from sqlalchemy.engine import Connection, Engine

logger = logging.getLogger("mba.schema")

BACKEND_DIR = Path(__file__).resolve().parents[1]
BASELINE_REVISION = "0001"
# Tables that existed when the 0001 baseline was cut. Legacy adoption may only create these.
BASELINE_TABLES = (
    "users", "essays", "applications", "refresh_tokens", "auth_tokens", "pilot_feedback",
    "admin_events", "ai_runtime_config", "interview_sessions", "interview_operations",
    "interview_quotas", "resume_question_sets", "admin_economics_scenarios",
)


class SchemaNotReady(RuntimeError):
    """The database schema does not match what this release expects."""


@dataclass
class SchemaStatus:
    current: Optional[str]
    head: str

    @property
    def is_current(self) -> bool:
        return self.current == self.head


def alembic_config(connection: Optional[Connection] = None) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.attributes["configure_logging"] = False
    if connection is not None:
        cfg.attributes["connection"] = connection
    return cfg


def head_revision() -> str:
    heads = ScriptDirectory.from_config(alembic_config()).get_heads()
    if len(heads) != 1:
        raise SchemaNotReady(f"Expected exactly one migration head, found {heads}. Merge the branches.")
    return heads[0]


def current_revision(connection: Connection) -> Optional[str]:
    return MigrationContext.configure(connection).get_current_revision()


def schema_status(engine: Engine) -> SchemaStatus:
    with engine.connect() as conn:
        return SchemaStatus(current=current_revision(conn), head=head_revision())


def is_unversioned_legacy_db(connection: Connection) -> bool:
    insp = inspect(connection)
    return insp.has_table("users") and not insp.has_table("alembic_version")


def adopt_legacy_database(engine: Engine) -> None:
    """Bring a pre-Alembic database (created by the old startup create_all + ALTERs) to the
    0001 baseline shape, then stamp it so normal migrations can run from there."""
    from database import Base
    import models  # noqa: F401
    from services.legacy_schema import run_legacy_sqlite_migrations

    logger.warning("Adopting pre-Alembic database: applying legacy upgrades, then stamping %s",
                   BASELINE_REVISION)
    # Same order the old startup code used: create missing tables, then additive ALTERs.
    with engine.begin() as conn:
        tables = [Base.metadata.tables[name] for name in BASELINE_TABLES]
        Base.metadata.create_all(conn, tables=tables, checkfirst=True)
    run_legacy_sqlite_migrations(engine)
    with engine.begin() as conn:
        command.stamp(alembic_config(conn), BASELINE_REVISION)


def migrate_to_head(engine: Engine) -> SchemaStatus:
    """Upgrade (adopting a legacy database first if needed). Run with schema-owner credentials."""
    with engine.connect() as conn:
        legacy = is_unversioned_legacy_db(conn)
    if legacy:
        adopt_legacy_database(engine)
    with engine.begin() as conn:
        command.upgrade(alembic_config(conn), "head")
    return schema_status(engine)


def schema_drift(engine: Engine) -> list:
    """Differences between the live database and the SQLAlchemy models (empty = in sync)."""
    from database import Base
    import models  # noqa: F401

    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn, opts={"compare_type": True})
        diffs = compare_metadata(ctx, Base.metadata)
    return [d for d in diffs if not _is_ignorable_diff(d)]


def _is_ignorable_diff(diff) -> bool:
    # The alembic_version table is not a model.
    if isinstance(diff, tuple) and diff[0] == "remove_table" and getattr(diff[1], "name", "") == "alembic_version":
        return True
    # SQLite reports "INTEGER PRIMARY KEY" (no explicit NOT NULL) as nullable; a primary key
    # can never hold NULL, so this difference is cosmetic.
    if isinstance(diff, list) and len(diff) == 1:
        op_name, _, _table, column, _info, _old, new_nullable = diff[0][:7]
        if op_name == "modify_nullable" and column == "id" and new_nullable is False:
            return True
    return False


def ensure_schema_ready(engine: Engine, settings) -> SchemaStatus:
    """Startup gate. Never migrates in production-like environments."""
    if settings.is_production_like_env:
        status = schema_status(engine)
        if not status.is_current:
            raise SchemaNotReady(
                f"Database schema revision is {status.current or 'unversioned'}, but this release "
                f"requires {status.head}. Run the release migration (`python manage_db.py` in backend/, or `python scripts/db_migrate.py`) with "
                "MIGRATION_DATABASE_URL before starting the API."
            )
        return status

    if settings.AUTO_MIGRATE_ON_STARTUP:
        return migrate_to_head(engine)

    status = schema_status(engine)
    if not status.is_current:
        logger.warning("Database schema is at %s; head is %s. Run scripts/db_migrate.py.",
                       status.current, status.head)
    return status
