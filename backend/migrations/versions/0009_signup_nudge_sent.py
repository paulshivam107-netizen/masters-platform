"""Record when the one-time sign-up nudge email was claimed.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-16

Adds a nullable users.signup_nudge_sent_at. Additive only; downgrade drops the column.
"""
import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("signup_nudge_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("signup_nudge_sent_at")
