from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    CalendarFeedHealthStatus,
    ChannelType,
    ConflictStatus,
    PaymentMethod,
    PaymentStatus,
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
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    total_amount: Decimal | None = Field(default=None, ge=0)
    paid_amount: Decimal | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None

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

    @model_validator(mode="after")
    def validate_payment_amounts(self) -> "ManualBookingCreateRequest":
        if self.record_type == BookingRecordType.BLOCKED_PERIOD:
            return self
        if self.paid_amount is not None and self.total_amount is not None:
            if self.paid_amount > self.total_amount:
                raise ValueError("Paid amount cannot exceed total amount.")
        if self.payment_status == PaymentStatus.PAID_IN_FULL and self.total_amount is not None:
            if self.paid_amount is None:
                self.paid_amount = self.total_amount
        return self


class ManualBookingUpdateRequest(StrictRequest):
    status: Literal[BookingStatus.TENTATIVE, BookingStatus.CONFIRMED] | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    guest_name: str | None = Field(default=None, max_length=160)
    guest_contact: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=4000)
    payment_status: PaymentStatus | None = None
    total_amount: Decimal | None = Field(default=None, ge=0)
    paid_amount: Decimal | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None

    @field_validator("check_in", "check_out")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Use a timezone-aware timestamp.")
        return value

    @model_validator(mode="after")
    def validate_payment_amounts(self) -> "ManualBookingUpdateRequest":
        if self.paid_amount is not None and self.total_amount is not None:
            if self.paid_amount > self.total_amount:
                raise ValueError("Paid amount cannot exceed total amount.")
        return self


class BookingResponse(BaseModel):
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
    guest_contact: str | None
    notes: str | None
    payment_status: PaymentStatus | None = None
    total_amount: Decimal | None = None
    paid_amount: Decimal | None = None
    payment_method: PaymentMethod | None = None
    created_at: datetime
    updated_at: datetime


class BookingCalendarResponse(BaseModel):
    """Booking fields safe for the portfolio calendar grid."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    source_type: BookingSource
    record_type: BookingRecordType
    status: BookingStatus
    check_in: datetime
    check_out: datetime
    guest_name: str | None
    payment_status: PaymentStatus | None = None


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


class CalendarFeedHealthResponse(BaseModel):
    id: UUID
    property_id: UUID
    channel_type: ChannelType
    is_active: bool
    health_status: CalendarFeedHealthStatus
    last_successful_sync_at: datetime | None
    last_sync_at: datetime | None
    last_sync_status: SyncStatus | None
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


class AvailabilityCheckResponse(BaseModel):
    is_available: bool
    conflicting_bookings: list[ConflictBookingResponse]


class BookingReceiptDataResponse(BaseModel):
    invoice_number: str
    issue_date: datetime
    booking_id: UUID
    property_id: UUID
    company_name: str
    property_name: str
    property_address: str | None = None
    property_city: str | None = None
    guest_name: str | None = None
    guest_contact: str | None = None
    check_in: datetime
    check_out: datetime
    check_in_time: str | None = None
    check_out_time: str | None = None
    nights: int
    currency: str = "TND"
    unit_nightly_rate: Decimal | None = None
    total_amount: Decimal | None = None
    paid_amount: Decimal | None = None
    outstanding_balance: Decimal | None = None
    payment_status: PaymentStatus | None = None
    payment_method: str | None = None
    status: BookingStatus
    source_type: BookingSource
    notes: str | None = None

