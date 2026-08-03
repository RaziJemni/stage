from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.core.enums import ChannelType, SyncStatus


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CalendarFeedRequest(StrictRequest):
    channel_type: ChannelType
    calendar_url: HttpUrl = Field(max_length=2000)
    external_listing_id: str | None = Field(default=None, max_length=255)

    @field_validator("channel_type")
    @classmethod
    def validate_channel_type(cls, value: ChannelType) -> ChannelType:
        if value is ChannelType.DIRECT:
            raise ValueError("Direct channels do not use iCalendar feeds")
        return value


class CalendarFeedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    channel_type: ChannelType
    external_listing_id: str | None
    calendar_url: str | None
    is_active: bool
    last_successful_sync_at: datetime | None
    last_error_summary: str | None


class CalendarSyncResponse(BaseModel):
    id: UUID
    channel_id: UUID
    status: SyncStatus
    started_at: datetime
    completed_at: datetime | None
    created_count: int
    updated_count: int
    cancelled_count: int
    rejected_count: int
    error_summary: str | None


class CalendarSyncQueuedResponse(BaseModel):
    channel_id: UUID
    status: str
