"""Repair constraints that pre-Alembic SQLite databases could not get via ALTER TABLE.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-15

Old local SQLite databases gained essays.application_id and users.role through
ALTER TABLE ADD COLUMN, which in SQLite cannot add a foreign key or NOT NULL. This
revision rebuilds just those tables (data preserved, via Alembic batch mode) when the
constraint is missing. Fresh databases and PostgreSQL already match, so it is a no-op there.
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        return
    insp = sa.inspect(bind)

    if insp.has_table("essays"):
        has_fk = any(fk["referred_table"] == "applications" and fk["constrained_columns"] == ["application_id"]
                     for fk in insp.get_foreign_keys("essays"))
        if not has_fk:
            with op.batch_alter_table("essays", recreate="always") as batch:
                batch.create_foreign_key("fk_essays_application_id_applications", "applications",
                                         ["application_id"], ["id"])

    if insp.has_table("users"):
        role = next((c for c in insp.get_columns("users") if c["name"] == "role"), None)
        if role is not None and role["nullable"]:
            op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
            with op.batch_alter_table("users", recreate="always") as batch:
                batch.alter_column("role", existing_type=sa.String(), nullable=False,
                                   existing_server_default=sa.text("'user'"))


def downgrade() -> None:
    pass
