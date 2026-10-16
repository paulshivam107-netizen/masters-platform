"""Shared rate-limit buckets, AI price versions, spend counters and cost ledger (R05).

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-15

Additive only. Rollback drops the four new tables; the previous in-process limiter and
call-count quotas (interview_quotas) are untouched, so a downgrade loses only R05 history.
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rate_limit_buckets",
        sa.Column("id", sa.String(length=160), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rate_limit_buckets_expires_at"), "rate_limit_buckets", ["expires_at"], unique=False)

    op.create_table(
        "ai_price_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("input_unit", sa.String(length=24), nullable=False),
        sa.Column("output_unit", sa.String(length=24), nullable=False),
        sa.Column("input_paise_per_million", sa.Integer(), nullable=False),
        sa.Column("output_paise_per_million", sa.Integer(), nullable=False),
        sa.Column("request_paise", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.DateTime(), nullable=False),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model", "version"),
    )
    op.create_index(op.f("ix_ai_price_versions_model"), "ai_price_versions", ["model"], unique=False)

    op.create_table(
        "ai_spend_counters",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("committed_paise", sa.Integer(), nullable=False),
        sa.Column("in_flight", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_spend_counters_day"), "ai_spend_counters", ["day"], unique=False)

    op.create_table(
        "ai_cost_entries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("operation", sa.String(length=32), nullable=False),
        sa.Column("reference_id", sa.String(length=36), nullable=True),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("price_version_id", sa.Integer(), nullable=True),
        sa.Column("price_source", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reserved_paise", sa.Integer(), nullable=False),
        sa.Column("actual_paise", sa.Integer(), nullable=True),
        sa.Column("input_units", sa.Integer(), nullable=True),
        sa.Column("output_units", sa.Integer(), nullable=True),
        sa.Column("usage_reported", sa.Boolean(), nullable=False),
        sa.Column("failure_code", sa.String(length=40), nullable=True),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["price_version_id"], ["ai_price_versions.id"]),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("user_id", "day", "reference_id", "status", "created_at"):
        op.create_index(op.f(f"ix_ai_cost_entries_{column}"), "ai_cost_entries", [column], unique=False)


def downgrade() -> None:
    for column in ("created_at", "status", "reference_id", "day", "user_id"):
        op.drop_index(op.f(f"ix_ai_cost_entries_{column}"), table_name="ai_cost_entries")
    op.drop_table("ai_cost_entries")
    op.drop_index(op.f("ix_ai_spend_counters_day"), table_name="ai_spend_counters")
    op.drop_table("ai_spend_counters")
    op.drop_index(op.f("ix_ai_price_versions_model"), table_name="ai_price_versions")
    op.drop_table("ai_price_versions")
    op.drop_index(op.f("ix_rate_limit_buckets_expires_at"), table_name="rate_limit_buckets")
    op.drop_table("rate_limit_buckets")
