"""Remove the pre-R02 Postgres RLS policies.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-15

The old startup code enabled RLS on every table with a policy that only allowed
current_user = 'service_role' or LIKE 'postgres%'. That grants nothing per-user and blocks
any properly restricted runtime role. Per the architecture plan, the first release enforces
ownership in the API and restricts database access with a DML-only runtime role
(scripts/db_roles.py). A fresh database never had these policies, so this is a no-op there.
"""
from alembic import op
from sqlalchemy import text

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TABLES = (
    "users", "essays", "applications", "refresh_tokens", "auth_tokens", "pilot_feedback",
    "admin_events", "ai_runtime_config", "interview_sessions", "interview_operations",
    "interview_quotas", "resume_question_sets", "admin_economics_scenarios",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for table in TABLES:
        exists = bind.execute(text("SELECT to_regclass(:t) IS NOT NULL"), {"t": f"public.{table}"}).scalar()
        if not exists:
            continue
        op.execute(f"DROP POLICY IF EXISTS app_service_full_access_{table} ON public.{table}")
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    # The removed policies were not a security boundary; nothing to restore.
    pass
