"""R02: versioned migrations, legacy adoption and the startup schema gate (SQLite).

PostgreSQL-specific checks (runtime role, concurrency) live in test_postgres_runtime.py.
"""
import tempfile
import unittest

from sqlalchemy import create_engine, inspect, text

from config import Settings
from services.schema import (
    SchemaNotReady,
    ensure_schema_ready,
    head_revision,
    migrate_to_head,
    schema_drift,
    schema_status,
)


def settings(**overrides):
    values = {"SECRET_KEY": "x" * 40, "APP_ENV": "development", "_env_file": None}
    values.update(overrides)
    return Settings(**values)


# The shape a database had when it was first created by early pre-Alembic code:
# some tables missing entirely, others missing later additive columns.
OLD_SCHEMA = [
    """CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR UNIQUE, name VARCHAR,
       hashed_password VARCHAR, created_at DATETIME)""",
    "CREATE UNIQUE INDEX ix_users_email ON users (email)",
    "CREATE INDEX ix_users_id ON users (id)",
    """CREATE TABLE applications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
       school_name VARCHAR, program_name VARCHAR, application_round VARCHAR, deadline DATE NOT NULL,
       application_fee FLOAT, fee_currency VARCHAR, essays_required INTEGER, lors_required INTEGER,
       requirements_notes TEXT, status VARCHAR, created_at DATETIME, updated_at DATETIME)""",
    "CREATE INDEX ix_applications_id ON applications (id)",
    "CREATE INDEX ix_applications_school_name ON applications (school_name)",
    """CREATE TABLE essays (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
       school_name VARCHAR, program_type VARCHAR, essay_prompt TEXT, essay_content TEXT, ai_review TEXT,
       review_score FLOAT, version INTEGER, parent_essay_id INTEGER REFERENCES essays(id),
       is_latest BOOLEAN, created_at DATETIME, updated_at DATETIME)""",
    "CREATE INDEX ix_essays_id ON essays (id)",
    "CREATE INDEX ix_essays_school_name ON essays (school_name)",
    "INSERT INTO users (id, email, name, hashed_password) VALUES (1, 'founder@example.com', 'Founder', 'h')",
    "INSERT INTO applications (id, user_id, school_name, deadline) VALUES (7, 1, 'IIM A', '2026-12-01')",
    "INSERT INTO essays (id, user_id, school_name, essay_content) VALUES (3, 1, 'IIM A', 'draft')",
]


class SchemaMigrationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def engine(self, name="db"):
        return create_engine(f"sqlite:///{self.tmp.name}/{name}.sqlite")

    def test_fresh_database_upgrades_to_head_without_drift(self):
        engine = self.engine()
        status = migrate_to_head(engine)
        self.assertTrue(status.is_current)
        self.assertEqual(status.current, head_revision())
        self.assertEqual(schema_drift(engine), [])
        engine.dispose()

    def test_legacy_database_is_adopted_preserving_data(self):
        engine = self.engine()
        with engine.begin() as conn:
            for statement in OLD_SCHEMA:
                conn.execute(text(statement))

        migrate_to_head(engine)
        migrate_to_head(engine)  # repeatable

        self.assertTrue(schema_status(engine).is_current)
        self.assertEqual(schema_drift(engine), [])
        with engine.connect() as conn:
            user = conn.execute(text("SELECT email, role, timezone FROM users WHERE id = 1")).one()
            self.assertEqual(tuple(user), ("founder@example.com", "user", "UTC"))
            self.assertEqual(conn.execute(text("SELECT essay_content FROM essays WHERE id = 3")).scalar(), "draft")
            self.assertIn("interview_sessions", inspect(conn).get_table_names())
        engine.dispose()

    def test_production_refuses_unmigrated_database_and_changes_nothing(self):
        engine = self.engine()
        with self.assertRaises(SchemaNotReady):
            ensure_schema_ready(engine, settings(APP_ENV="production", AUTO_MIGRATE_ON_STARTUP=True))
        with engine.connect() as conn:
            self.assertEqual(inspect(conn).get_table_names(), [])
        engine.dispose()

    def test_production_starts_on_current_schema(self):
        engine = self.engine()
        migrate_to_head(engine)
        status = ensure_schema_ready(engine, settings(APP_ENV="production"))
        self.assertTrue(status.is_current)
        engine.dispose()

    def test_development_auto_migrates_unless_disabled(self):
        disabled = self.engine("disabled")
        status = ensure_schema_ready(disabled, settings(AUTO_MIGRATE_ON_STARTUP=False))
        self.assertIsNone(status.current)
        disabled.dispose()

        enabled = self.engine("enabled")
        self.assertTrue(ensure_schema_ready(enabled, settings()).is_current)
        enabled.dispose()

    def test_models_and_migrations_stay_in_sync(self):
        """Fails when a model changes without a matching Alembic revision."""
        engine = self.engine()
        migrate_to_head(engine)
        self.assertEqual(schema_drift(engine), [], "Model changed: add an Alembic revision (see README).")
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
