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
    """One row per issued refresh token. Rotation revokes the presented row and inserts a new
    one in the same family (one family = one signed-in device/browser session). Presenting an
    already-rotated token after the grace window revokes the whole family (theft detection)."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    family_id = Column(String(36), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked = Column(Boolean, default=False, nullable=False)
    revoked_reason = Column(String(32), nullable=True)
    rotated_at = Column(DateTime, nullable=True)
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


class RateLimitBucket(Base):
    """Shared fixed-window counter (R05). One row per hashed key and window; expired rows are purged."""
    __tablename__ = "rate_limit_buckets"

    # "<action>:<scope>:<sha256 prefix>:<window index>" - never a raw email or IP.
    id = Column(String(160), primary_key=True)
    count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False, index=True)


class AiPriceVersion(Base):
    """Versioned provider prices in integer paise per million units (R05). Never floats."""
    __tablename__ = "ai_price_versions"
    __table_args__ = (UniqueConstraint("model", "version"),)

    id = Column(Integer, primary_key=True)
    model = Column(String(80), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    input_unit = Column(String(24), nullable=False, default="tokens")
    output_unit = Column(String(24), nullable=False, default="tokens")
    input_paise_per_million = Column(Integer, nullable=False)
    output_paise_per_million = Column(Integer, nullable=False)
    request_paise = Column(Integer, nullable=False, default=0)
    effective_from = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(String(200), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AiSpendCounter(Base):
    """Per-day committed AI exposure (reserved + settled + unknown) for the global and per-user caps."""
    __tablename__ = "ai_spend_counters"

    # "global:<day>" or "user:<id>:<day>". Updated with conditional atomic UPDATEs only.
    id = Column(String(80), primary_key=True)
    day = Column(Date, nullable=False, index=True)
    committed_paise = Column(Integer, nullable=False, default=0)
    in_flight = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AiCostEntry(Base):
    """Append-mostly AI cost ledger: reserved -> settled | released | unknown (R05)."""
    __tablename__ = "ai_cost_entries"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    day = Column(Date, nullable=False, index=True)
    operation = Column(String(32), nullable=False)
    reference_id = Column(String(36), nullable=True, index=True)
    model = Column(String(80), nullable=False)
    price_version_id = Column(Integer, ForeignKey("ai_price_versions.id"), nullable=True)
    price_source = Column(String(16), nullable=False)
    status = Column(String(16), nullable=False, default="reserved", index=True)
    reserved_paise = Column(Integer, nullable=False)
    actual_paise = Column(Integer, nullable=True)
    input_units = Column(Integer, nullable=True)
    output_units = Column(Integer, nullable=True)
    usage_reported = Column(Boolean, nullable=False, default=False)
    failure_code = Column(String(40), nullable=True)
    note = Column(String(200), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


# --- Programme catalogue (R09) -------------------------------------------------------------
# Programme -> intake cycle -> revisions. A revision is a snapshot of one cycle's facts and
# rounds; corrections are new revisions and published ones are never edited in place.


class CatalogProgram(Base):
    __tablename__ = "catalog_programs"

    id = Column(String(180), primary_key=True)  # stable slug, e.g. "iima-pgpx"
    school_name = Column(String(180), nullable=False)
    program_name = Column(String(180), nullable=False)
    degree = Column(String(120), nullable=False)
    country = Column(String(120), nullable=False)
    city = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cycles = relationship("CatalogCycle", back_populates="program", order_by="CatalogCycle.cycle")


class CatalogCycle(Base):
    __tablename__ = "catalog_cycles"
    __table_args__ = (UniqueConstraint("program_id", "cycle"),)

    id = Column(Integer, primary_key=True)
    program_id = Column(String(180), ForeignKey("catalog_programs.id"), nullable=False, index=True)
    cycle = Column(String(16), nullable=False)  # admissions cycle, e.g. "2026-27"
    published_revision_id = Column(Integer, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    program = relationship("CatalogProgram", back_populates="cycles")
    revisions = relationship("CatalogRevision", back_populates="cycle_row",
                             order_by="CatalogRevision.revision_number")


class CatalogRevision(Base):
    __tablename__ = "catalog_revisions"
    __table_args__ = (UniqueConstraint("cycle_id", "revision_number"),)

    id = Column(Integer, primary_key=True)
    cycle_id = Column(Integer, ForeignKey("catalog_cycles.id"), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)
    # draft -> in_review -> published -> superseded (in_review -> draft when returned)
    state = Column(String(16), nullable=False, default="draft", index=True)
    # Reviewer's judgement: unverified | verified | stale | archived. Freshness is applied on read.
    verification_status = Column(String(16), nullable=False, default="unverified")
    rights_status = Column(String(16), nullable=False, default="unknown")  # unknown | facts_only | restricted
    application_fee = Column(Float, nullable=True)
    fee_currency = Column(String(3), nullable=False, default="INR")
    source_url = Column(String(600), nullable=True)
    checked_at = Column(Date, nullable=True)  # when a human last checked source_url
    change_note = Column(Text, nullable=False, default="")
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cycle_row = relationship("CatalogCycle", back_populates="revisions")
    rounds = relationship("CatalogRound", back_populates="revision", order_by="CatalogRound.sort_order",
                          cascade="all, delete-orphan")


class CatalogRound(Base):
    __tablename__ = "catalog_rounds"

    id = Column(Integer, primary_key=True)
    revision_id = Column(Integer, ForeignKey("catalog_revisions.id"), nullable=False, index=True)
    label = Column(String(60), nullable=False)
    deadline = Column(Date, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    revision = relationship("CatalogRevision", back_populates="rounds")
