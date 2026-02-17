from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Date
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
