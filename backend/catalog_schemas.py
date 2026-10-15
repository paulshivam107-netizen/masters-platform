"""Request/response models for the programme catalogue (R09)."""
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

CYCLE_PATTERN = r"^\d{4}-\d{2}$"
VerificationStatus = Literal["unverified", "verified", "stale", "archived"]
RightsStatus = Literal["unknown", "facts_only", "restricted"]


class CatalogRoundIn(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    deadline: Optional[date] = None


class CatalogRoundOut(BaseModel):
    label: str
    deadline: Optional[date] = None


class CatalogDraftRequest(BaseModel):
    """Creates (POST) or edits (PUT) a draft revision for one programme cycle."""

    program_id: Optional[str] = Field(default=None, min_length=2, max_length=180)
    school_name: str = Field(min_length=2, max_length=180)
    program_name: str = Field(min_length=2, max_length=180)
    degree: str = Field(min_length=2, max_length=120)
    country: str = Field(min_length=2, max_length=120)
    city: Optional[str] = Field(default=None, max_length=120)
    cycle: str = Field(pattern=CYCLE_PATTERN)
    application_fee: Optional[float] = Field(default=None, ge=0)
    fee_currency: str = Field(default="INR", min_length=3, max_length=3)
    rounds: List[CatalogRoundIn] = Field(default_factory=list, max_length=8)
    source_url: Optional[str] = Field(default=None, max_length=600)
    checked_at: Optional[date] = None
    rights_status: RightsStatus = "unknown"
    change_note: str = Field(default="", max_length=2000)

    @field_validator("program_id", "school_name", "program_name", "degree", "country", "city",
                     "source_url", mode="before")
    @classmethod
    def strip_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("fee_currency")
    @classmethod
    def upper_currency(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("cycle")
    @classmethod
    def consecutive_years(cls, value: str) -> str:
        start, end = value.split("-")
        if (int(start) + 1) % 100 != int(end):
            raise ValueError("cycle must look like 2026-27")
        return value

    @field_validator("source_url")
    @classmethod
    def http_url(cls, value: Optional[str]) -> Optional[str]:
        if value and not value.lower().startswith(("http://", "https://")):
            raise ValueError("source_url must start with http:// or https://")
        return value


class CatalogPublishRequest(BaseModel):
    verification_status: Literal["verified", "unverified"]
    note: str = Field(default="", max_length=2000)


class CatalogReturnRequest(BaseModel):
    note: str = Field(default="", max_length=2000)


class ProgramCatalogItem(BaseModel):
    """Public, published-only view of a programme's current catalogue record."""

    id: str
    school_name: str
    program_name: str
    degree: str
    country: str
    city: Optional[str] = None
    cycle: str
    current_cycle: str
    is_current_cycle: bool
    application_fee: Optional[float] = None
    fee_currency: str
    rounds: List[CatalogRoundOut] = []
    deadline_round_1: Optional[str] = None
    deadline_round_2: Optional[str] = None
    source_url: Optional[str] = None
    checked_at: Optional[date] = None
    last_updated: Optional[str] = None
    verification_status: VerificationStatus
    status_reason: Optional[str] = None
    autofill_allowed: bool
    revision_number: int
    published_at: Optional[datetime] = None
    confidence: Literal["low", "medium", "high"]


class ProgramCatalogSearchResponse(BaseModel):
    total: int
    items: List[ProgramCatalogItem]


class CatalogRevisionOut(BaseModel):
    id: int
    cycle_id: int
    cycle: str
    revision_number: int
    state: str
    verification_status: str
    rights_status: str
    application_fee: Optional[float] = None
    fee_currency: str
    source_url: Optional[str] = None
    checked_at: Optional[date] = None
    rounds: List[CatalogRoundOut] = []
    change_note: str = ""
    created_by_user_id: Optional[int] = None
    reviewer_user_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class CatalogCycleOut(BaseModel):
    id: int
    cycle: str
    archived: bool
    effective_status: Optional[str] = None
    status_reason: Optional[str] = None
    published: Optional[CatalogRevisionOut] = None
    open_revision: Optional[CatalogRevisionOut] = None


class CatalogProgramOut(BaseModel):
    id: str
    school_name: str
    program_name: str
    degree: str
    country: str
    city: Optional[str] = None
    cycles: List[CatalogCycleOut] = []


class CatalogAdminListResponse(BaseModel):
    current_cycle: str
    stale_after_days: int
    items: List[CatalogProgramOut]
