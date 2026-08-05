from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import (
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
)


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    guest_contact_identifier: str
    status: ConversationStatus
    handling_mode: HandlingMode
    last_message_at: datetime | None
    escalation_reason: str | None


class MessageCreateRequest(StrictRequest):
    content: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    direction: MessageDirection
    sender_type: SenderType
    content: str
    delivery_status: DeliveryStatus
    automatically_sent: bool
    created_at: datetime


class HandlingModeRequest(StrictRequest):
    handling_mode: HandlingMode


class SimulatorInboundEventRequest(StrictRequest):
    property_id: UUID
    guest_contact_identifier: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=5000)
    external_message_id: str = Field(min_length=1, max_length=255)
    provider_timestamp: datetime | None = None
    language: str | None = Field(default=None, max_length=16)


class SimulatorInboundEventResponse(BaseModel):
    mode: str
    message_id: UUID
    conversation_id: UUID
    created: bool
