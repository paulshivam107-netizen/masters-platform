"""DB-backed programme catalogue with cycles, rounds and revision history (R09).

Revision ID: 0007
Revises: 0004
Create Date: 2026-10-15

Replaces the mutable backend/data/program_catalog_seed.json store. The seed file is now
import-only (``python manage_catalog.py import-seed``) and loads records as unverified drafts.
Downgrade drops the catalogue tables (export first if reviewed data must be kept).
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalog_programs",
        sa.Column("id", sa.String(length=180), nullable=False),
        sa.Column("school_name", sa.String(length=180), nullable=False),
        sa.Column("program_name", sa.String(length=180), nullable=False),
        sa.Column("degree", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "catalog_cycles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("program_id", sa.String(length=180), nullable=False),
        sa.Column("cycle", sa.String(length=16), nullable=False),
        sa.Column("published_revision_id", sa.Integer(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["program_id"], ["catalog_programs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("program_id", "cycle"),
    )
    op.create_index(op.f("ix_catalog_cycles_program_id"), "catalog_cycles", ["program_id"], unique=False)
    op.create_table(
        "catalog_revisions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cycle_id", sa.Integer(), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("verification_status", sa.String(length=16), nullable=False),
        sa.Column("rights_status", sa.String(length=16), nullable=False),
        sa.Column("application_fee", sa.Float(), nullable=True),
        sa.Column("fee_currency", sa.String(length=3), nullable=False),
        sa.Column("source_url", sa.String(length=600), nullable=True),
        sa.Column("checked_at", sa.Date(), nullable=True),
        sa.Column("change_note", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewer_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cycle_id"], ["catalog_cycles.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cycle_id", "revision_number"),
    )
    op.create_index(op.f("ix_catalog_revisions_cycle_id"), "catalog_revisions", ["cycle_id"], unique=False)
    op.create_index(op.f("ix_catalog_revisions_state"), "catalog_revisions", ["state"], unique=False)
    op.create_table(
        "catalog_rounds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("revision_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["revision_id"], ["catalog_revisions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_catalog_rounds_revision_id"), "catalog_rounds", ["revision_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_catalog_rounds_revision_id"), table_name="catalog_rounds")
    op.drop_table("catalog_rounds")
    op.drop_index(op.f("ix_catalog_revisions_state"), table_name="catalog_revisions")
    op.drop_index(op.f("ix_catalog_revisions_cycle_id"), table_name="catalog_revisions")
    op.drop_table("catalog_revisions")
    op.drop_index(op.f("ix_catalog_cycles_program_id"), table_name="catalog_cycles")
    op.drop_table("catalog_cycles")
    op.drop_table("catalog_programs")
