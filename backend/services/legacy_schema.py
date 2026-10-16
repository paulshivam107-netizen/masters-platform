"""Frozen pre-Alembic schema helpers.

Before R02 the API mutated the schema at startup (create_all + the additive ALTERs below).
These helpers now run ONLY when scripts/db_migrate.py adopts a database that has tables but
no alembic_version row, bringing it to the 0001 baseline shape before it is stamped.

Do not add new schema changes here. Every new change is an Alembic revision.
"""
from sqlalchemy import inspect, text


def run_legacy_sqlite_migrations(engine):
    """Additive SQLite upgrades that pre-Alembic local databases may be missing."""
    run_admin_operations_migrations(engine)
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        user_columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_column_names = {row[1] for row in user_columns}
        if "avatar_url" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
        if "timezone" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN timezone VARCHAR DEFAULT 'UTC'"))
        if "target_intake" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN target_intake VARCHAR"))
        if "target_countries" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN target_countries VARCHAR"))
        if "preferred_currency" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN preferred_currency VARCHAR DEFAULT 'USD'"))
        if "notification_email" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN notification_email VARCHAR"))
        if "email_provider" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_provider VARCHAR"))
        if "email_reminders_enabled" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_reminders_enabled BOOLEAN DEFAULT 0"))
        if "reminder_days" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN reminder_days VARCHAR DEFAULT '30,14,7,1'"))
        if "bio" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
        if "email_verified" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0"))
        if "is_active" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
        if "role" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_role ON users(role)"))

        columns = conn.execute(text("PRAGMA table_info(essays)")).fetchall()
        column_names = {row[1] for row in columns}
        if "application_id" not in column_names:
            conn.execute(text("ALTER TABLE essays ADD COLUMN application_id INTEGER"))

        app_columns = conn.execute(text("PRAGMA table_info(applications)")).fetchall()
        app_column_names = {row[1] for row in app_columns}
        if app_columns and "program_total_fee" not in app_column_names:
            conn.execute(text("ALTER TABLE applications ADD COLUMN program_total_fee FLOAT"))
        if app_columns and "lors_submitted" not in app_column_names:
            conn.execute(text("ALTER TABLE applications ADD COLUMN lors_submitted INTEGER DEFAULT 0"))
        if app_columns and "interview_required" not in app_column_names:
            conn.execute(text("ALTER TABLE applications ADD COLUMN interview_required BOOLEAN DEFAULT 0"))
        if app_columns and "interview_completed" not in app_column_names:
            conn.execute(text("ALTER TABLE applications ADD COLUMN interview_completed BOOLEAN DEFAULT 0"))
        if app_columns and "decision_status" not in app_column_names:
            conn.execute(text("ALTER TABLE applications ADD COLUMN decision_status VARCHAR DEFAULT 'Pending'"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                revoked BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON refresh_tokens(expires_at)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS auth_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR NOT NULL UNIQUE,
                purpose VARCHAR NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_auth_tokens_user_id ON auth_tokens(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_auth_tokens_token_hash ON auth_tokens(token_hash)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_auth_tokens_purpose ON auth_tokens(purpose)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_auth_tokens_expires_at ON auth_tokens(expires_at)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pilot_feedback (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                category VARCHAR NOT NULL DEFAULT 'general',
                message TEXT NOT NULL,
                page_context VARCHAR,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pilot_feedback_user_id ON pilot_feedback(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pilot_feedback_created_at ON pilot_feedback(created_at)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS admin_events (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                event_name VARCHAR NOT NULL,
                payload_json TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_events_user_id ON admin_events(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_events_event_name ON admin_events(event_name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_events_created_at ON admin_events(created_at)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_runtime_config (
                id INTEGER PRIMARY KEY,
                provider VARCHAR NOT NULL DEFAULT 'mock',
                ai_enabled BOOLEAN NOT NULL DEFAULT 1,
                openai_model VARCHAR NOT NULL DEFAULT 'gpt-4o-mini',
                gemini_model VARCHAR NOT NULL DEFAULT 'gemini-1.5-flash',
                updated_by_user_id INTEGER,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(updated_by_user_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_runtime_config_id ON ai_runtime_config(id)"))
        ai_columns = conn.execute(text("PRAGMA table_info(ai_runtime_config)")).fetchall()
        ai_column_names = {row[1] for row in ai_columns}
        if "openai_model" not in ai_column_names:
            conn.execute(text("ALTER TABLE ai_runtime_config ADD COLUMN openai_model VARCHAR NOT NULL DEFAULT 'gpt-4o-mini'"))
        if "gemini_model" not in ai_column_names:
            conn.execute(text("ALTER TABLE ai_runtime_config ADD COLUMN gemini_model VARCHAR NOT NULL DEFAULT 'gemini-1.5-flash'"))


def run_admin_operations_migrations(engine):
    """Additive, repeatable upgrade for existing SQLite and PostgreSQL pilots."""
    if engine.dialect.name not in ("sqlite", "postgresql"):
        return
    additions = {
        "pilot_feedback": {
            "status": "VARCHAR(24) NOT NULL DEFAULT 'open'",
            "resolution_note": "TEXT NOT NULL DEFAULT ''",
            "revision": "INTEGER NOT NULL DEFAULT 0",
            "handled_by": "INTEGER",
            "handled_at": "TIMESTAMP",
        },
        "interview_operations": {
            "failure_code": "VARCHAR(40)", "failed_at": "TIMESTAMP",
        },
    }
    with engine.begin() as conn:
        inspector = inspect(conn)
        for table, columns in additions.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
