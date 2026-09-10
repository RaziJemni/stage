from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.enums import UserRole, UserStatus


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegistrationRequest(StrictRequest):
    company_name: str = Field(min_length=2, max_length=160)
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    timezone: str = Field(default="Africa/Tunis", min_length=1, max_length=64)

    @field_validator("company_name", "name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 2:
            raise ValueError("Use at least two non-space characters")
        return trimmed


class LoginRequest(StrictRequest):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class InvitationAcceptRequest(StrictRequest):
    token: str = Field(min_length=32, max_length=256)
    password: str = Field(min_length=12, max_length=128)


class CompanySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    timezone: str
    default_currency: str


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    preferred_language: str = "fr"


class AuthResponse(BaseModel):
    user: UserSummary
    company: CompanySummary
    permissions: list[str]


class TeamMemberResponse(UserSummary):
    last_login_at: datetime | None
    invitation_expires_at: datetime | None = None


class TeamListResponse(BaseModel):
    items: list[TeamMemberResponse]


class InvitationCreateRequest(StrictRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 2:
            raise ValueError("Use at least two non-space characters")
        return trimmed


class InvitationResponse(BaseModel):
    member: TeamMemberResponse
    invitation_url: str | None


class TeamMemberStatusRequest(StrictRequest):
    status: Literal["active", "inactive"]


class UserPreferencesRequest(StrictRequest):
    preferred_language: Literal["fr", "en"]
