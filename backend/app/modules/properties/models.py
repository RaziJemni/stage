from decimal import Decimal
from datetime import datetime, time
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.enums import ChannelType, PropertyStatus, enum_type


class Owner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "owners"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_owners_company_id_id"),
        CheckConstraint(
            "commission_percentage >= 0 AND commission_percentage <= 100",
            name="ck_owners_commission_range",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    commission_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("20.00"), server_default="20.00", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )


class Property(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "properties"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_properties_company_id_id"),
        ForeignKeyConstraint(
            ["company_id", "owner_id"],
            ["owners.company_id", "owners.id"],
            name="fk_properties_company_owner",
            ondelete="SET NULL",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country_code: Mapped[str] = mapped_column(String(2), default="TN", server_default="TN", nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(64), default="Africa/Tunis", server_default="Africa/Tunis", nullable=False
    )
    max_guests: Mapped[int | None] = mapped_column(Integer)
    check_in_time: Mapped[time | None] = mapped_column(Time(timezone=False))
    check_out_time: Mapped[time | None] = mapped_column(Time(timezone=False))
    wifi_network: Mapped[str | None] = mapped_column(String(160))
    wifi_password: Mapped[str | None] = mapped_column(String(255))
    parking_info: Mapped[str | None] = mapped_column(Text)
    amenities: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    house_rules: Mapped[str | None] = mapped_column(Text)
    emergency_contact: Mapped[str | None] = mapped_column(Text)
    directions: Mapped[str | None] = mapped_column(Text)
    external_booking_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[PropertyStatus] = mapped_column(
        enum_type(PropertyStatus, "property_status"),
        default=PropertyStatus.ACTIVE,
        server_default=PropertyStatus.ACTIVE.value,
        nullable=False,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Channel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "channels"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_channels_company_property",
            ondelete="CASCADE",
        ),
        UniqueConstraint("company_id", "id", name="uq_channels_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    channel_type: Mapped[ChannelType] = mapped_column(
        enum_type(ChannelType, "channel_type"), nullable=False
    )
    external_listing_id: Mapped[str | None] = mapped_column(String(255))
    calendar_url: Mapped[str | None] = mapped_column(String(2000))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    last_successful_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_summary: Mapped[str | None] = mapped_column(Text)


Index(
    "uq_channels_external_listing",
    Channel.company_id,
    Channel.property_id,
    Channel.channel_type,
    Channel.external_listing_id,
    unique=True,
    postgresql_where=Channel.external_listing_id.is_not(None),
)
