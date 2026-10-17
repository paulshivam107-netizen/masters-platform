"""R02: versioned migrations, legacy adoption and the startup schema gate (SQLite).

PostgreSQL-specific checks (runtime role, concurrency) live in test_postgres_runtime.py.
"""
import tempfile
import unittest

from alembic import command
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from config import Settings
from services.schema import (
    SchemaNotReady,
    alembic_config,
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

    def test_taster_backfill_marks_only_the_earliest_and_the_index_blocks_a_second(self):
        engine = self.engine()
        with engine.begin() as conn:
            command.upgrade(alembic_config(conn), "0007")
            conn.execute(text("INSERT INTO users (id, email, name, role, timezone, is_active) "
                              "VALUES (1, 'a@example.com', 'A', 'user', 'UTC', 1)"))
            for sid, kind, created in (("s1", "taster", "2026-10-01"), ("s2", "taster", "2026-10-02"),
                                       ("s3", "full", "2026-10-03")):
                conn.execute(text(
                    "INSERT INTO interview_sessions (id, user_id, create_request_id, create_fingerprint, context_json, "
                    "provider, mode, question_limit, status, transcript_json, prompt_version, version, created_at, "
                    "updated_at) VALUES (:id, 1, :id, 'x', :ctx, 'openai', 'chat', 3, 'active', '[]', 'v', 0, :at, :at)"),
                    {"id": sid, "ctx": '{"route": "auto", "kind": "%s"}' % kind, "at": created})
        migrate_to_head(engine)
        with engine.connect() as conn:
            kinds = dict(conn.execute(text("SELECT id, kind FROM interview_sessions")).all())
        self.assertEqual(kinds, {"s1": "taster", "s2": None, "s3": None})
        with self.assertRaises(IntegrityError), engine.begin() as conn:
            conn.execute(text("UPDATE interview_sessions SET kind = 'taster' WHERE id = 's2'"))
        with engine.begin() as conn:  # other kinds are unrestricted
            conn.execute(text("UPDATE interview_sessions SET kind = 'full' WHERE id IN ('s2', 's3')"))
        engine.dispose()

    def test_models_and_migrations_stay_in_sync(self):
        """Fails when a model changes without a matching Alembic revision."""
        engine = self.engine()
        migrate_to_head(engine)
        self.assertEqual(schema_drift(engine), [], "Model changed: add an Alembic revision (see README).")
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
