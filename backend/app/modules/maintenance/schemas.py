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
