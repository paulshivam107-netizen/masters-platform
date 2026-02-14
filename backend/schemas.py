from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import datetime, date


# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters")
        return cleaned


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    avatar_url: Optional[str] = None
    timezone: Optional[str] = "UTC"
    target_intake: Optional[str] = None
    target_countries: Optional[str] = None
    preferred_currency: Optional[str] = "USD"
    notification_email: Optional[str] = None
    email_provider: Optional[str] = None
    email_reminders_enabled: bool = False
    reminder_days: Optional[str] = "30,14,7,1"
    bio: Optional[str] = None
    email_verified: bool = False
    is_active: bool = True
    role: str = "user"
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=2048)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = Field(default=None, min_length=10, max_length=2048)
    all_sessions: bool = False


class EmailActionRequest(BaseModel):
    email: EmailStr


class EmailVerificationConfirmRequest(BaseModel):
    token: str = Field(min_length=10, max_length=2048)


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=10, max_length=2048)
    new_password: str = Field(min_length=6)


class GenericActionResponse(BaseModel):
    success: bool
    message: str
    dev_token: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    timezone: Optional[str] = Field(default=None, max_length=64)
    target_intake: Optional[str] = Field(default=None, max_length=80)
    target_countries: Optional[str] = Field(default=None, max_length=250)
    preferred_currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    notification_email: Optional[str] = None
    email_provider: Optional[str] = Field(default=None, max_length=64)
    email_reminders_enabled: Optional[bool] = None
    reminder_days: Optional[str] = Field(default=None, max_length=64)
    bio: Optional[str] = Field(default=None, max_length=1200)

    @field_validator("name", "timezone", "target_intake", "target_countries", "email_provider", "bio")
    @classmethod
    def strip_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("preferred_currency")
    @classmethod
    def validate_preferred_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if len(cleaned) != 3:
            raise ValueError("preferred_currency must be a 3-letter ISO code")
        return cleaned


class ReminderPreviewItem(BaseModel):
    application_id: int
    school_name: str
    program_name: str
    deadline: date
    days_left: int
    reason: str


class ReminderPreviewResponse(BaseModel):
    notification_email: Optional[str]
    reminders_enabled: bool
    total_matches: int
    items: List[ReminderPreviewItem]


class ReminderSendResponse(BaseModel):
    sent: bool
    dry_run: bool
    message: str
    matches: int


class FeedbackCreate(BaseModel):
    category: str = Field(default="general", min_length=2, max_length=40)
    message: str = Field(min_length=10, max_length=4000)
    page_context: Optional[str] = Field(default=None, max_length=120)

    @field_validator("category", "message", "page_context")
    @classmethod
    def normalize_feedback_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned


class FeedbackResponse(BaseModel):
    id: int
    category: str
    message: str
    page_context: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TelemetryEventIngest(BaseModel):
    event_name: str = Field(min_length=2, max_length=120)
    payload_json: Optional[str] = Field(default=None, max_length=8000)

    @field_validator("event_name")
    @classmethod
    def normalize_event_name(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if len(cleaned) < 2:
            raise ValueError("event_name must be at least 2 characters")
        return cleaned


class TelemetryEventIngestResponse(BaseModel):
    success: bool
    event_id: int


class ProgramCatalogItem(BaseModel):
    id: str
    school_name: str
    program_name: str
    degree: str
    country: str
    city: Optional[str] = None
    application_fee: Optional[float] = None
    fee_currency: str = "USD"
    deadline_round_1: Optional[str] = None
    deadline_round_2: Optional[str] = None
    source_url: Optional[str] = None
    last_updated: Optional[str] = None
    confidence: Literal["low", "medium", "high"] = "medium"


class ProgramCatalogSearchResponse(BaseModel):
    total: int
    items: List[ProgramCatalogItem]


class AdminProgramCatalogUpsertRequest(BaseModel):
    id: Optional[str] = Field(default=None, min_length=2, max_length=180)
    school_name: str = Field(min_length=2, max_length=180)
    program_name: str = Field(min_length=2, max_length=180)
    degree: str = Field(min_length=2, max_length=120)
    country: str = Field(min_length=2, max_length=120)
    city: Optional[str] = Field(default=None, max_length=120)
    application_fee: Optional[float] = Field(default=None, ge=0)
    fee_currency: str = Field(default="USD", min_length=3, max_length=3)
    deadline_round_1: Optional[str] = Field(default=None, max_length=40)
    deadline_round_2: Optional[str] = Field(default=None, max_length=40)
    source_url: Optional[str] = Field(default=None, max_length=600)
    last_updated: Optional[str] = Field(default=None, max_length=40)
    confidence: Literal["low", "medium", "high"] = "medium"

    @field_validator(
        "id",
        "school_name",
        "program_name",
        "degree",
        "country",
        "city",
        "deadline_round_1",
        "deadline_round_2",
        "source_url",
        "last_updated",
    )
    @classmethod
    def trim_catalog_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("fee_currency")
    @classmethod
    def normalize_catalog_currency(cls, value: str) -> str:
        return value.strip().upper()


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    verified_users: int
    admin_users: int
    total_applications: int
    total_essays: int
    total_feedback: int
    total_events: int
    recent_feedback_7d: int
    recent_events_7d: int
    dau_users_1d: int
    wau_users_7d: int
    new_users_7d: int
    activated_users_7d: int
    activation_rate_7d: float
    applications_created_7d: int
    essays_created_7d: int
    api_error_events_7d: int


class AdminUserRow(BaseModel):
    id: int
    email: str
    name: str
    role: str
    email_verified: bool
    created_at: datetime
    essays_count: int
    applications_count: int


class AdminEventRow(BaseModel):
    id: int
    user_id: Optional[int]
    event_name: str
    payload_json: Optional[str]
    created_at: datetime


class AdminRoleUpdateRequest(BaseModel):
    role: str = Field(min_length=4, max_length=20)


class AdminFeedbackRow(BaseModel):
    id: int
    user_id: int
    user_email: str
    category: str
    message: str
    page_context: Optional[str]
    created_at: datetime


class AdminEventBreakdownRow(BaseModel):
    event_name: str
    count: int


class AdminEventCoverageItem(BaseModel):
    event_name: str
    count_7d: int
    covered: bool


class AdminEventCoverageResponse(BaseModel):
    required_events: int
    tracked_events_7d: int
    missing_events: List[str]
    items: List[AdminEventCoverageItem]


class AdminRoleUpdateResponse(BaseModel):
    id: int
    email: str
    role: str


# Essay schemas
class EssayCreate(BaseModel):
    school_name: str = Field(min_length=2, max_length=160)
    program_type: str = Field(min_length=2, max_length=120)
    essay_prompt: str = Field(min_length=5, max_length=2000)
    essay_content: str = Field(min_length=20, max_length=50000)
    parent_essay_id: Optional[int] = None  # For creating new version
    application_id: Optional[int] = None

    @field_validator("school_name", "program_type", "essay_prompt", "essay_content")
    @classmethod
    def trim_essay_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned


class EssayResponse(BaseModel):
    id: int
    user_id: int
    school_name: str
    program_type: str
    essay_prompt: str
    essay_content: str
    ai_review: Optional[str]
    review_score: Optional[float]
    version: int
    parent_essay_id: Optional[int]
    application_id: Optional[int]
    is_latest: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EssayReviewRequest(BaseModel):
    focus_areas: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    essay_id: int
    review_content: str
    score: Optional[float]


class EssayAssistRequest(BaseModel):
    school_name: str = Field(min_length=2, max_length=160)
    program_type: str = Field(min_length=2, max_length=120)
    essay_prompt: str = Field(min_length=5, max_length=2000)
    skeleton_points: List[str] = Field(min_length=3, max_length=12)
    target_word_count: int = Field(default=550, ge=250, le=1200)

    @field_validator("school_name", "program_type", "essay_prompt")
    @classmethod
    def trim_assist_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("skeleton_points")
    @classmethod
    def normalize_skeleton_points(cls, value: List[str]) -> List[str]:
        normalized = [item.strip() for item in value if item and item.strip()]
        if len(normalized) < 3:
            raise ValueError("Provide at least 3 non-empty skeleton points")
        return normalized


class EssayAssistResponse(BaseModel):
    outline_markdown: str
    next_steps: List[str]
    mode: Literal["mock", "ai"]
    caution: str


class EssayVersionInfo(BaseModel):
    """Info about essay versions"""
    essay_id: int
    total_versions: int
    current_version: int
    versions: List[EssayResponse]
    
    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    school_name: str = Field(min_length=2, max_length=160)
    program_name: str = Field(min_length=2, max_length=160)
    application_round: Optional[str] = Field(default=None, max_length=64)
    deadline: date
    application_fee: Optional[float] = Field(default=None, ge=0)
    program_total_fee: Optional[float] = Field(default=None, ge=0)
    fee_currency: str = Field(default="USD", min_length=3, max_length=3)
    essays_required: int = Field(default=0, ge=0)
    lors_required: int = Field(default=0, ge=0)
    lors_submitted: int = Field(default=0, ge=0)
    interview_required: bool = False
    interview_completed: bool = False
    decision_status: Literal["Pending", "Interview Invite", "Waitlisted", "Admitted", "Rejected", "Accepted", "Interview"] = "Pending"
    requirements_notes: Optional[str] = Field(default=None, max_length=4000)
    status: Literal["Planning", "In Progress", "Submitted", "Awaiting Decision", "Complete"] = "Planning"

    @field_validator("school_name", "program_name", "application_round", "requirements_notes")
    @classmethod
    def trim_application_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("fee_currency")
    @classmethod
    def validate_fee_currency(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if len(cleaned) != 3:
            raise ValueError("fee_currency must be a 3-letter ISO code")
        return cleaned

    @model_validator(mode="after")
    def validate_application_integrity(self):
        if self.deadline < date.today():
            raise ValueError("deadline cannot be in the past")
        if self.lors_submitted > self.lors_required:
            raise ValueError("lors_submitted cannot exceed lors_required")
        if not self.interview_required and self.interview_completed:
            raise ValueError("interview_completed cannot be true when interview_required is false")
        return self


class ApplicationUpdate(BaseModel):
    school_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    program_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    application_round: Optional[str] = Field(default=None, max_length=64)
    deadline: Optional[date] = None
    application_fee: Optional[float] = Field(default=None, ge=0)
    program_total_fee: Optional[float] = Field(default=None, ge=0)
    fee_currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    essays_required: Optional[int] = Field(default=None, ge=0)
    lors_required: Optional[int] = Field(default=None, ge=0)
    lors_submitted: Optional[int] = Field(default=None, ge=0)
    interview_required: Optional[bool] = None
    interview_completed: Optional[bool] = None
    decision_status: Optional[Literal["Pending", "Interview Invite", "Waitlisted", "Admitted", "Rejected", "Accepted", "Interview"]] = None
    requirements_notes: Optional[str] = Field(default=None, max_length=4000)
    status: Optional[Literal["Planning", "In Progress", "Submitted", "Awaiting Decision", "Complete"]] = None

    @field_validator("school_name", "program_name", "application_round", "requirements_notes")
    @classmethod
    def trim_application_update_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("fee_currency")
    @classmethod
    def validate_optional_fee_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if len(cleaned) != 3:
            raise ValueError("fee_currency must be a 3-letter ISO code")
        return cleaned

    @model_validator(mode="after")
    def validate_update_integrity(self):
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("deadline cannot be in the past")
        if self.lors_required is not None and self.lors_submitted is not None and self.lors_submitted > self.lors_required:
            raise ValueError("lors_submitted cannot exceed lors_required")
        if self.interview_required is False and self.interview_completed is True:
            raise ValueError("interview_completed cannot be true when interview_required is false")
        return self


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    school_name: str
    program_name: str
    application_round: Optional[str]
    deadline: date
    application_fee: Optional[float]
    program_total_fee: Optional[float]
    fee_currency: str
    essays_required: int
    lors_required: int
    lors_submitted: int
    interview_required: bool
    interview_completed: bool
    decision_status: str
    requirements_notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
