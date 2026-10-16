"""Alembic environment.

Connection precedence:
1. An already-open connection passed by the caller (config.attributes["connection"]),
   used by scripts/tests that manage their own engine.
2. MIGRATION_DATABASE_URL: schema-owner credentials (on Neon, the *direct*, non-pooled endpoint).
3. DATABASE_URL: fallback for local development.

The runtime API never runs migrations in production-like environments; a release step does.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from config import get_settings, sqlalchemy_url
from database import Base
import models  # noqa: F401  (registers all tables on Base.metadata)

config = context.config
if config.config_file_name is not None and config.attributes.get("configure_logging", True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def migration_url() -> str:
    settings = get_settings()
    return sqlalchemy_url(settings.MIGRATION_DATABASE_URL or settings.DATABASE_URL)


def configure(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # SQLite cannot ALTER most constraints in place; batch mode copies the table.
        render_as_batch=connection.dialect.name == "sqlite",
    )


def run_migrations_offline() -> None:
    context.configure(
        url=migration_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        configure(connection)
        with context.begin_transaction():
            context.run_migrations()
        return

    engine = create_engine(migration_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        configure(connection)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
