from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ResumeQuestionsCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: UUID
    route: Literal["cat", "experienced"]
    application_id: Optional[int] = Field(default=None, gt=0)
    programme_name: str = Field(default="", max_length=160)
    resume_text: str = Field(min_length=80, max_length=20000)
    consent: bool = False


class ResumeQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=10, max_length=400)
    evidence_quote: str = Field(min_length=5, max_length=240)


class ResumeBranch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    opening: ResumeQuestion
    follow_up: ResumeQuestion
    deeper_follow_up: ResumeQuestion


class ResumeQuestionDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: list["ResumeFact"] = Field(min_length=1, max_length=12)
    branches: list[ResumeBranch] = Field(min_length=3, max_length=3)


class ResumeFact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Literal["education", "experience", "project", "achievement", "skill", "interest"]
    evidence_quote: str = Field(min_length=5, max_length=240)


ResumeQuestionDraft.model_rebuild()
