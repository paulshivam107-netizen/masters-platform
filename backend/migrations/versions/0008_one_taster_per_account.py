"""Enforce one Why MBA taster per account in the database.

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-18

Adds a nullable interview_sessions.kind column and a partial unique index on user_id where
kind = 'taster', closing the race where two simultaneous first tasters both started.
Backfill marks only each account's earliest existing taster (from context_json), so accounts
that already hit the race keep all their sessions and the index still builds.
Additive only; downgrade drops the index and column (the kind stays in context_json).
"""
import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

TASTER = "context_json LIKE '%\"kind\": \"taster\"%'"


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("kind", sa.String(length=16), nullable=True))
    op.execute(f"""
        UPDATE interview_sessions SET kind = 'taster'
        WHERE {TASTER} AND id = (
            SELECT earliest.id FROM interview_sessions AS earliest
            WHERE earliest.user_id = interview_sessions.user_id AND earliest.{TASTER}
            ORDER BY earliest.created_at, earliest.id LIMIT 1)
    """)
    op.create_index("uq_interview_sessions_one_taster", "interview_sessions", ["user_id"], unique=True,
                    sqlite_where=sa.text("kind = 'taster'"), postgresql_where=sa.text("kind = 'taster'"))


def downgrade() -> None:
    op.drop_index("uq_interview_sessions_one_taster", table_name="interview_sessions")
    with op.batch_alter_table("interview_sessions") as batch:
        batch.drop_column("kind")
