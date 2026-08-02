from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import BookingRecordType, BookingSource, BookingStatus


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
