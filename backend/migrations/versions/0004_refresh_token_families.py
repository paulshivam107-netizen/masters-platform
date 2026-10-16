"""Refresh-token families for rotation, reuse detection and per-session revocation (R04).

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-15

Existing tokens each become their own one-token family ("legacy-<id>").
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("refresh_tokens") as batch:
        batch.add_column(sa.Column("family_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("revoked_reason", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("rotated_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE refresh_tokens SET family_id = 'legacy-' || CAST(id AS VARCHAR) WHERE family_id IS NULL")
    with op.batch_alter_table("refresh_tokens") as batch:
        batch.alter_column("family_id", existing_type=sa.String(length=36), nullable=False)
        batch.create_index(batch.f("ix_refresh_tokens_family_id"), ["family_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("refresh_tokens") as batch:
        batch.drop_index(batch.f("ix_refresh_tokens_family_id"))
        batch.drop_column("rotated_at")
        batch.drop_column("revoked_reason")
        batch.drop_column("family_id")
