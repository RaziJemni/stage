from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    ChannelType,
    ConflictStatus,
    SyncStatus,
)


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ManualBookingCreateRequest(StrictRequest):
    property_id: UUID
    source_type: Literal[BookingSource.DIRECT, BookingSource.MANUAL] = BookingSource.DIRECT
    record_type: BookingRecordType = BookingRecordType.RESERVATION
    status: Literal[BookingStatus.TENTATIVE, BookingStatus.CONFIRMED] = BookingStatus.CONFIRMED
    check_in: datetime
    check_out: datetime
    guest_name: str | None = Field(default=None, max_length=160)
    guest_contact: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("check_in", "check_out")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Use a timezone-aware timestamp.")
        return value

    @field_validator("check_out")
    @classmethod
    def validate_date_range(cls, check_out: datetime, info) -> datetime:
        check_in = info.data.get("check_in")
        if check_in is not None and check_out <= check_in:
            raise ValueError("Check-out must be after check-in.")
        return check_out


class ManualBookingUpdateRequest(StrictRequest):
    status: Literal[BookingStatus.TENTATIVE, BookingStatus.CONFIRMED] | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    guest_name: str | None = Field(default=None, max_length=160)
    guest_contact: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("check_in", "check_out")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Use a timezone-aware timestamp.")
        return value


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    source_type: BookingSource
    record_type: BookingRecordType
    status: BookingStatus
    check_in: datetime
    check_out: datetime
    guest_name: str | None
    guest_contact: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


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
    model_config = ConfigDict(from_attributes=True)

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


class ConflictAcknowledgeRequest(StrictRequest):
    resolution_note: str | None = Field(default=None, max_length=4000)

    @field_validator("resolution_note", mode="before")
    @classmethod
    def normalize_resolution_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        return normalized or None


class ConflictBookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    channel_id: UUID | None
    external_event_id: str | None
    source_type: BookingSource
    record_type: BookingRecordType
    status: BookingStatus
    check_in: datetime
    check_out: datetime
    guest_name: str | None


class BookingConflictResponse(BaseModel):
    id: UUID
    property_id: UUID
    status: ConflictStatus
    detected_at: datetime
    acknowledged_at: datetime | None
    acknowledged_by_user_id: UUID | None
    resolution_note: str | None
    resolved_at: datetime | None
    resolved_by_user_id: UUID | None
    bookings: list[ConflictBookingResponse]
