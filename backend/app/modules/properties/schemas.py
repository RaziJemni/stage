from decimal import Decimal
from datetime import datetime, time
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import PropertyStatus


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OwnerCreateRequest(StrictRequest):
    name: str = Field(min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    commission_percentage: Decimal = Field(default=Decimal("20.00"), ge=0, le=100)
    notes: str | None = Field(default=None, max_length=5000)


class OwnerUpdateRequest(StrictRequest):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    commission_percentage: Decimal | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=5000)
    is_active: bool | None = None


class OwnerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    name: str
    email: str | None
    phone: str | None
    commission_percentage: Decimal
    notes: str | None
    is_active: bool
    properties_count: int = 0
    created_at: datetime
    updated_at: datetime


class PropertyCreateRequest(StrictRequest):
    owner_id: UUID | None = None
    name: str = Field(min_length=1, max_length=160)
    address_line1: str | None = Field(default=None, max_length=200)
    address_line2: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country_code: str = Field(default="TN", min_length=2, max_length=2)
    timezone: str = Field(default="Africa/Tunis", min_length=1, max_length=64)
    max_guests: int | None = Field(default=None, ge=1)
    check_in_time: time | None = None
    check_out_time: time | None = None
    wifi_network: str | None = Field(default=None, max_length=160)
    wifi_password: str | None = Field(default=None, max_length=255)
    parking_info: str | None = None
    amenities: dict[str, Any] | list[Any] | None = None
    house_rules: str | None = None
    emergency_contact: str | None = None
    directions: str | None = None
    external_booking_url: str | None = Field(default=None, max_length=500)

    @field_validator("name", mode="before")
    def validate_name(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Property name cannot be null")
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Property name cannot be empty or whitespace only")
            return trimmed
        return value


class PropertyUpdateRequest(StrictRequest):
    owner_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=160)
    address_line1: str | None = Field(default=None, max_length=200)
    address_line2: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    max_guests: int | None = Field(default=None, ge=1)
    check_in_time: time | None = None
    check_out_time: time | None = None
    wifi_network: str | None = Field(default=None, max_length=160)
    wifi_password: str | None = Field(default=None, max_length=255)
    parking_info: str | None = None
    amenities: dict[str, Any] | list[Any] | None = None
    house_rules: str | None = None
    emergency_contact: str | None = None
    directions: str | None = None
    external_booking_url: str | None = Field(default=None, max_length=500)

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Property name cannot be null")
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Property name cannot be empty or whitespace only")
            return trimmed
        return value


class PropertyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    owner_id: UUID | None = None
    owner_name: str | None = None
    name: str
    address_line1: str | None
    address_line2: str | None
    city: str | None
    postal_code: str | None
    country_code: str
    timezone: str
    max_guests: int | None
    check_in_time: time | None
    check_out_time: time | None
    wifi_network: str | None
    wifi_password: str | None
    parking_info: str | None
    amenities: dict[str, Any] | list[Any] | None
    house_rules: str | None
    emergency_contact: str | None
    directions: str | None
    external_booking_url: str | None
    status: PropertyStatus
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
