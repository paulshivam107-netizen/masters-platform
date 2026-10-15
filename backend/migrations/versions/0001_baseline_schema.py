"""Baseline schema: the tables and columns the app had when Alembic was introduced (R02).

Revision ID: 0001
Revises:
Create Date: 2026-10-15

Generated from the models against an empty PostgreSQL 16 database and reviewed. This file is
frozen: it must not import the models, and later schema changes go in new revisions.
Pre-Alembic databases are brought to this shape and stamped by services.schema.adopt_legacy_database.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('interview_quotas',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('calls', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=True),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('hashed_password', sa.String(), nullable=True),
    sa.Column('avatar_url', sa.String(), nullable=True),
    sa.Column('timezone', sa.String(), nullable=True),
    sa.Column('target_intake', sa.String(), nullable=True),
    sa.Column('target_countries', sa.String(), nullable=True),
    sa.Column('preferred_currency', sa.String(), nullable=True),
    sa.Column('notification_email', sa.String(), nullable=True),
    sa.Column('email_provider', sa.String(), nullable=True),
    sa.Column('email_reminders_enabled', sa.Boolean(), nullable=True),
    sa.Column('reminder_days', sa.String(), nullable=True),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('email_verified', sa.Boolean(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_table('admin_economics_scenarios',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('assumptions_json', sa.Text(), nullable=False),
    sa.Column('revision', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('admin_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('event_name', sa.String(), nullable=False),
    sa.Column('payload_json', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_events_created_at'), 'admin_events', ['created_at'], unique=False)
    op.create_index(op.f('ix_admin_events_event_name'), 'admin_events', ['event_name'], unique=False)
    op.create_index(op.f('ix_admin_events_id'), 'admin_events', ['id'], unique=False)
    op.create_index(op.f('ix_admin_events_user_id'), 'admin_events', ['user_id'], unique=False)
    op.create_table('ai_runtime_config',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(), nullable=False),
    sa.Column('ai_enabled', sa.Boolean(), nullable=False),
    sa.Column('openai_model', sa.String(), nullable=False),
    sa.Column('gemini_model', sa.String(), nullable=False),
    sa.Column('updated_by_user_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['updated_by_user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_runtime_config_id'), 'ai_runtime_config', ['id'], unique=False)
    op.create_table('applications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('school_name', sa.String(), nullable=True),
    sa.Column('program_name', sa.String(), nullable=True),
    sa.Column('application_round', sa.String(), nullable=True),
    sa.Column('deadline', sa.Date(), nullable=False),
    sa.Column('application_fee', sa.Float(), nullable=True),
    sa.Column('program_total_fee', sa.Float(), nullable=True),
    sa.Column('fee_currency', sa.String(), nullable=True),
    sa.Column('essays_required', sa.Integer(), nullable=True),
    sa.Column('lors_required', sa.Integer(), nullable=True),
    sa.Column('lors_submitted', sa.Integer(), nullable=True),
    sa.Column('interview_required', sa.Boolean(), nullable=True),
    sa.Column('interview_completed', sa.Boolean(), nullable=True),
    sa.Column('decision_status', sa.String(), nullable=True),
    sa.Column('requirements_notes', sa.Text(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_applications_id'), 'applications', ['id'], unique=False)
    op.create_index(op.f('ix_applications_school_name'), 'applications', ['school_name'], unique=False)
    op.create_table('auth_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(), nullable=False),
    sa.Column('purpose', sa.String(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('used', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_auth_tokens_expires_at'), 'auth_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_auth_tokens_id'), 'auth_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_auth_tokens_purpose'), 'auth_tokens', ['purpose'], unique=False)
    op.create_index(op.f('ix_auth_tokens_token_hash'), 'auth_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_auth_tokens_user_id'), 'auth_tokens', ['user_id'], unique=False)
    op.create_table('interview_sessions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('create_request_id', sa.String(length=36), nullable=False),
    sa.Column('create_fingerprint', sa.String(length=64), nullable=False),
    sa.Column('context_json', sa.Text(), nullable=False),
    sa.Column('provider', sa.String(length=16), nullable=False),
    sa.Column('mode', sa.String(length=16), nullable=False),
    sa.Column('question_limit', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('transcript_json', sa.Text(), nullable=False),
    sa.Column('feedback_json', sa.Text(), nullable=True),
    sa.Column('prompt_version', sa.String(length=24), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('pending_token', sa.String(length=36), nullable=True),
    sa.Column('pending_until', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'create_request_id')
    )
    op.create_index(op.f('ix_interview_sessions_created_at'), 'interview_sessions', ['created_at'], unique=False)
    op.create_index(op.f('ix_interview_sessions_user_id'), 'interview_sessions', ['user_id'], unique=False)
    op.create_table('pilot_feedback',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('page_context', sa.String(), nullable=True),
    sa.Column('status', sa.String(length=24), server_default='open', nullable=False),
    sa.Column('resolution_note', sa.Text(), server_default='', nullable=False),
    sa.Column('revision', sa.Integer(), server_default='0', nullable=False),
    sa.Column('handled_by', sa.Integer(), nullable=True),
    sa.Column('handled_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pilot_feedback_created_at'), 'pilot_feedback', ['created_at'], unique=False)
    op.create_index(op.f('ix_pilot_feedback_id'), 'pilot_feedback', ['id'], unique=False)
    op.create_index(op.f('ix_pilot_feedback_user_id'), 'pilot_feedback', ['user_id'], unique=False)
    op.create_table('refresh_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('revoked', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_expires_at'), 'refresh_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_id'), 'refresh_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_table('resume_question_sets',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('request_id', sa.String(length=36), nullable=False),
    sa.Column('fingerprint', sa.String(length=64), nullable=False),
    sa.Column('context_json', sa.Text(), nullable=False),
    sa.Column('questions_json', sa.Text(), nullable=True),
    sa.Column('usage_json', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('pending_token', sa.String(length=36), nullable=True),
    sa.Column('pending_until', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'request_id')
    )
    op.create_index(op.f('ix_resume_question_sets_created_at'), 'resume_question_sets', ['created_at'], unique=False)
    op.create_index(op.f('ix_resume_question_sets_user_id'), 'resume_question_sets', ['user_id'], unique=False)
    op.create_table('essays',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('school_name', sa.String(), nullable=True),
    sa.Column('program_type', sa.String(), nullable=True),
    sa.Column('essay_prompt', sa.Text(), nullable=True),
    sa.Column('essay_content', sa.Text(), nullable=True),
    sa.Column('ai_review', sa.Text(), nullable=True),
    sa.Column('review_score', sa.Float(), nullable=True),
    sa.Column('version', sa.Integer(), nullable=True),
    sa.Column('parent_essay_id', sa.Integer(), nullable=True),
    sa.Column('application_id', sa.Integer(), nullable=True),
    sa.Column('is_latest', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.ForeignKeyConstraint(['parent_essay_id'], ['essays.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_essays_id'), 'essays', ['id'], unique=False)
    op.create_index(op.f('ix_essays_school_name'), 'essays', ['school_name'], unique=False)
    op.create_table('interview_operations',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('session_id', sa.String(length=36), nullable=False),
    sa.Column('request_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=24), nullable=False),
    sa.Column('fingerprint', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('result_json', sa.Text(), nullable=True),
    sa.Column('usage_json', sa.Text(), nullable=True),
    sa.Column('failure_code', sa.String(length=40), nullable=True),
    sa.Column('failed_at', sa.DateTime(), nullable=True),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('session_id', 'request_id')
    )
    op.create_index(op.f('ix_interview_operations_session_id'), 'interview_operations', ['session_id'], unique=False)


def downgrade() -> None:
    # Downgrading the baseline would drop every table and all applicant data.
    raise RuntimeError("Refusing to downgrade past the baseline revision; restore from a backup instead.")
