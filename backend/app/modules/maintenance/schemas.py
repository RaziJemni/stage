from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import TicketPriority, TicketStatus


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TicketCreateRequest(StrictRequest):
    property_id: UUID
    booking_id: UUID | None = None
    conversation_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category: str | None = Field(default=None, max_length=80)
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketSuggestionReviewRequest(StrictRequest):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category: str | None = Field(default=None, max_length=80)
    priority: TicketPriority


class TicketSuggestionCreateRequest(TicketCreateRequest):
    """Internal/chatbot-facing input; it does not create a ticket."""


class ContractorCreateRequest(StrictRequest):
    name: str = Field(min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    specialty: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)


class ContractorUpdateRequest(StrictRequest):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    specialty: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)
    is_active: bool | None = None


class ContractorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    specialty: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TicketAssignmentCreateRequest(StrictRequest):
    contractor_id: UUID
    notes: str | None = Field(default=None, max_length=5000)


class TicketAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticket_id: UUID
    contractor_id: UUID
    assigned_by_user_id: UUID
    assigned_at: datetime
    ended_at: datetime | None
    notes: str | None


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    company_id: UUID
    property_id: UUID
    booking_id: UUID | None
    conversation_id: UUID | None
    title: str
    description: str
    category: str | None
    priority: TicketPriority
    status: TicketStatus
    created_by_user_id: UUID
    suggested_by_chatbot: bool
    created_at: datetime
    updated_at: datetime


class TicketSuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    company_id: UUID
    property_id: UUID
    booking_id: UUID | None
    conversation_id: UUID | None
    title: str
    description: str
    category: str | None
    priority: TicketPriority
    status: str
    reviewed_by_user_id: UUID | None
    reviewed_at: datetime | None
    ticket_id: UUID | None
    created_at: datetime
