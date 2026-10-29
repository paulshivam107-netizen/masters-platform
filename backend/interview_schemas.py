from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class InterviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: UUID
    application_id: Optional[int] = Field(default=None, gt=0)
    # "auto" is the default: the interviewer infers the stage. "cat"/"experienced" stay valid for old data.
    route: Literal["auto", "cat", "experienced"] = "auto"
    kind: Literal["full", "taster"] = "full"
    programme_name: str = Field(default="", max_length=160)
    practice_focus: Literal["balanced", "resume", "behavioural", "motivation", "academics", "work"] = "balanced"
    profile_fact_ids: Optional[list[str]] = Field(default=None, max_length=12)
    profile_set_id: Optional[UUID] = None
    background: str = Field(default="", max_length=4000)
    goal: str = Field(default="", max_length=1000)
    mode: Literal["chat", "voice"] = "chat"
    provider: Literal["openai", "demo"] = "openai"
    question_limit: Literal[3, 5, 8] = 5
    # Ignored: an inline notice replaced the checkbox. Kept so older clients that still send it are accepted.
    consent: bool = False
    question_id: Optional[str] = Field(default=None, max_length=80, pattern=r"^[a-z0-9-]+$")
    question_set_id: Optional[UUID] = None


class InterviewAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    expected_version: int = Field(ge=0)


class InterviewAnswer(InterviewAction):
    text: str = Field(min_length=1, max_length=3000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("An answer cannot be blank")
        return value


class PublicTry(BaseModel):
    """A signed-out visitor's one-question try: nothing is stored, only the follow-up is generated."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    resume_line: str = Field(min_length=5, max_length=240)
    answer: str = Field(min_length=1, max_length=1500)


class InterviewSpeech(InterviewAction):
    turn_id: str = Field(pattern=r"^q([1-9]|1[0-6])$")


class NextQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Any clash between the latest answer and the resume or earlier answers; empty when none.
    conflict: str = Field(default="", max_length=300)
    question: str = Field(min_length=10, max_length=650)
    kind: Literal["follow_up", "clarification", "new_topic", "end_requested", "off_topic"]
    topic: Literal["education", "experience", "projects", "behaviour", "motivation", "contribution", "interests"]
    anchor_turn_id: str = Field(pattern=r"^(a([1-9]|1[0-6]))?$")
    anchor_quote: str = Field(max_length=240)


class FeedbackPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    turn_id: str = Field(pattern=r"^a([1-9]|1[0-6])$")
    quote: str = Field(min_length=1, max_length=400)
    observation: str = Field(min_length=1, max_length=600)


class Improvement(FeedbackPoint):
    suggestion: str = Field(min_length=1, max_length=600)


class DimensionEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dimension: Literal["motivation", "work_experience", "academics", "projects", "communication"]
    # Evidence comes before the level so the model commits to a quote first; empty when not assessed.
    turn_id: str = Field(pattern=r"^(a([1-9]|1[0-6]))?$")
    quote: str = Field(max_length=400)
    level: Literal["not_assessed", "missing", "partial", "strong"]


class InterviewFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=1, max_length=800)
    strengths: list[FeedbackPoint] = Field(min_length=1, max_length=2)
    improvements: list[Improvement] = Field(min_length=1, max_length=3)
    next_exercise: str = Field(min_length=1, max_length=700)
    dimensions: list[DimensionEvidence] = Field(min_length=5, max_length=5)
