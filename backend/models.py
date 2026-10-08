from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    avatar_url = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    target_intake = Column(String, nullable=True)
    target_countries = Column(String, nullable=True)  # comma-separated values
    preferred_currency = Column(String, default="USD")
    notification_email = Column(String, nullable=True)
    email_provider = Column(String, nullable=True)  # e.g., gmail/outlook/manual
    email_reminders_enabled = Column(Boolean, default=False)
    reminder_days = Column(String, default="30,14,7,1")
    bio = Column(Text, nullable=True)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    essays = relationship("Essay", back_populates="user")
    applications = relationship("ApplicationTracker", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    auth_tokens = relationship("AuthToken", back_populates="user")


class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_name = Column(String, index=True)
    program_type = Column(String)
    essay_prompt = Column(Text)
    essay_content = Column(Text)
    ai_review = Column(Text, nullable=True)
    review_score = Column(Float, nullable=True)
    
    # Version tracking
    version = Column(Integer, default=1)
    parent_essay_id = Column(Integer, ForeignKey("essays.id"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    is_latest = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="essays")
    application = relationship("ApplicationTracker", back_populates="essays")
    # Self-referential relationship for versions
    versions = relationship("Essay", backref="parent", remote_side=[id])


class ApplicationTracker(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_name = Column(String, index=True)
    program_name = Column(String)
    application_round = Column(String, nullable=True)
    deadline = Column(Date, nullable=False)
    application_fee = Column(Float, nullable=True)
    program_total_fee = Column(Float, nullable=True)
    fee_currency = Column(String, default="USD")
    essays_required = Column(Integer, default=0)
    lors_required = Column(Integer, default=0)
    lors_submitted = Column(Integer, default=0)
    interview_required = Column(Boolean, default=False)
    interview_completed = Column(Boolean, default=False)
    decision_status = Column(String, default="Pending")
    requirements_notes = Column(Text, nullable=True)
    status = Column(String, default="Planning")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applications")
    essays = relationship("Essay", back_populates="application")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    purpose = Column(String, nullable=False, index=True)  # email_verify | password_reset
    expires_at = Column(DateTime, nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="auth_tokens")


class PilotFeedback(Base):
    __tablename__ = "pilot_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False, default="general")
    message = Column(Text, nullable=False)
    page_context = Column(String, nullable=True)
    status = Column(String(24), nullable=False, default="open", server_default="open")
    resolution_note = Column(Text, nullable=False, default="", server_default="")
    revision = Column(Integer, nullable=False, default=0, server_default="0")
    handled_by = Column(Integer, nullable=True)
    handled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AdminEvent(Base):
    __tablename__ = "admin_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_name = Column(String, nullable=False, index=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AiRuntimeConfig(Base):
    __tablename__ = "ai_runtime_config"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False, default="mock")
    ai_enabled = Column(Boolean, nullable=False, default=True)
    openai_model = Column(String, nullable=False, default="gpt-4o-mini")
    gemini_model = Column(String, nullable=False, default="gemini-1.5-flash")
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    __table_args__ = (UniqueConstraint("user_id", "create_request_id"),)

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    create_request_id = Column(String(36), nullable=False)
    create_fingerprint = Column(String(64), nullable=False)
    # Snapshot context survives deletion/renaming of the source application.
    context_json = Column(Text, nullable=False)
    provider = Column(String(16), nullable=False)
    mode = Column(String(16), nullable=False)
    question_limit = Column(Integer, nullable=False)
    status = Column(String(24), nullable=False, default="active")
    transcript_json = Column(Text, nullable=False, default="[]")
    feedback_json = Column(Text, nullable=True)
    prompt_version = Column(String(24), nullable=False, default="mba-interview-v1")
    version = Column(Integer, nullable=False, default=0)
    pending_token = Column(String(36), nullable=True)
    pending_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class InterviewOperation(Base):
    __tablename__ = "interview_operations"
    __table_args__ = (UniqueConstraint("session_id", "request_id"),)

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    request_id = Column(String(36), nullable=False)
    kind = Column(String(24), nullable=False)
    fingerprint = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False, default="pending")
    result_json = Column(Text, nullable=True)
    usage_json = Column(Text, nullable=True)
    failure_code = Column(String(40), nullable=True)
    failed_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class InterviewQuota(Base):
    __tablename__ = "interview_quotas"

    # UTC day + actor. Updated atomically; quotas survive restarts and multiple workers.
    id = Column(String(80), primary_key=True)
    calls = Column(Integer, nullable=False, default=0)


class ResumeQuestionSet(Base):
    __tablename__ = "resume_question_sets"
    __table_args__ = (UniqueConstraint("user_id", "request_id"),)
    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    request_id = Column(String(36), nullable=False)
    fingerprint = Column(String(64), nullable=False)
    context_json = Column(Text, nullable=False)
    questions_json = Column(Text, nullable=True)
    usage_json = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="pending")
    pending_token = Column(String(36), nullable=True)
    pending_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    # The original file and reviewed resume text are deliberately not persisted.


class AdminEconomicsScenario(Base):
    __tablename__ = "admin_economics_scenarios"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    assumptions_json = Column(Text, nullable=False)
    revision = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
