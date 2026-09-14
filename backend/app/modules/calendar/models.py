from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    ConflictStatus,
    PaymentStatus,
    SyncStatus,
    enum_type,
)


class CalendarSyncRun(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "calendar_sync_runs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "channel_id"],
            ["channels.company_id", "channels.id"],
            name="fk_calendar_sync_runs_company_channel",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_calendar_sync_runs_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    channel_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    status: Mapped[SyncStatus] = mapped_column(
        enum_type(SyncStatus, "sync_status"),
        default=SyncStatus.RUNNING,
        server_default=SyncStatus.RUNNING.value,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    updated_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    cancelled_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    rejected_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    error_summary: Mapped[str | None] = mapped_column(Text)
    correlation_id: Mapped[str | None] = mapped_column(String(100))


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_bookings_company_property",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "channel_id"],
            ["channels.company_id", "channels.id"],
            name="fk_bookings_company_channel",
            ondelete="RESTRICT",
        ),
        CheckConstraint("check_out > check_in", name="booking_date_range"),
        CheckConstraint("total_amount IS NULL OR total_amount >= 0", name="booking_total_amount_positive"),
        CheckConstraint("paid_amount IS NULL OR paid_amount >= 0", name="booking_paid_amount_positive"),
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'card', 'check', 'other')",
            name="booking_payment_method_valid",
        ),
        UniqueConstraint("company_id", "id", name="uq_bookings_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    channel_id: Mapped[UUID | None] = mapped_column(index=True)
    source_type: Mapped[BookingSource] = mapped_column(
        enum_type(BookingSource, "booking_source"), nullable=False
    )
    external_event_id: Mapped[str | None] = mapped_column(String(255))
    guest_name: Mapped[str | None] = mapped_column(String(160))
    guest_contact: Mapped[str | None] = mapped_column(String(255))
    check_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        enum_type(BookingStatus, "booking_status"),
        default=BookingStatus.CONFIRMED,
        server_default=BookingStatus.CONFIRMED.value,
        nullable=False,
    )
    record_type: Mapped[BookingRecordType] = mapped_column(
        enum_type(BookingRecordType, "booking_record_type"), nullable=False
    )
    payment_status: Mapped[PaymentStatus | None] = mapped_column(
        enum_type(PaymentStatus, "payment_status"),
        nullable=True,
        index=True,
    )
    total_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 3), nullable=True)
    paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 3), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)


class PropertyPricingProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "property_pricing_profiles"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"),
        UniqueConstraint("company_id", "property_id", name="uq_property_pricing_profile"),
        CheckConstraint("base_nightly_rate >= 0", name="pricing_base_rate_nonnegative"),
        CheckConstraint("weekend_adjustment_percent >= -100", name="pricing_weekend_adjustment_valid"),
        CheckConstraint("minimum_nights >= 1", name="pricing_minimum_nights_positive"),
    )
    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    base_nightly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    weekend_adjustment_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, server_default="0", nullable=False)
    minimum_nights: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)


class SeasonalPricingRule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "seasonal_pricing_rules"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"),
        CheckConstraint("end_date >= start_date", name="seasonal_pricing_date_range"),
        CheckConstraint("nightly_rate >= 0", name="seasonal_pricing_rate_nonnegative"),
        CheckConstraint("minimum_nights IS NULL OR minimum_nights >= 1", name="seasonal_pricing_minimum_nights_positive"),
    )
    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(nullable=False)
    end_date: Mapped[date] = mapped_column(nullable=False)
    nightly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    minimum_nights: Mapped[int | None] = mapped_column(Integer)


class BookingPricingDecision(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Immutable record of a staff-approved direct-booking price."""

    __tablename__ = "booking_pricing_decisions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "approved_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "booking_id", name="uq_booking_pricing_decision"),
        CheckConstraint("quoted_total >= 0", name="booking_pricing_quoted_total_nonnegative"),
        CheckConstraint("approved_total >= 0", name="booking_pricing_approved_total_nonnegative"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    booking_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    approved_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    quoted_total: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    approved_total: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    override_reason: Mapped[str | None] = mapped_column(Text)
    quote_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


Index(
    "uq_bookings_channel_external_event",
    Booking.company_id,
    Booking.channel_id,
    Booking.external_event_id,
    unique=True,
    postgresql_where=(Booking.channel_id.is_not(None) & Booking.external_event_id.is_not(None)),
)


class BookingConflict(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "booking_conflicts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_booking_conflicts_company_property",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "resolved_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_booking_conflicts_company_resolved_by_user",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "acknowledged_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_booking_conflicts_company_acknowledged_by_user",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_booking_conflicts_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    status: Mapped[ConflictStatus] = mapped_column(
        enum_type(ConflictStatus, "conflict_status"),
        default=ConflictStatus.OPEN,
        server_default=ConflictStatus.OPEN.value,
        nullable=False,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acknowledged_by_user_id: Mapped[UUID | None] = mapped_column()
    resolution_note: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by_user_id: Mapped[UUID | None] = mapped_column()


class BookingConflictBooking(Base):
    __tablename__ = "booking_conflict_bookings"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "conflict_id"],
            ["booking_conflicts.company_id", "booking_conflicts.id"],
            name="fk_conflict_bookings_company_conflict",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_conflict_bookings_company_booking",
            ondelete="CASCADE",
        ),
        PrimaryKeyConstraint("company_id", "conflict_id", "booking_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False)
    conflict_id: Mapped[UUID] = mapped_column(nullable=False)
    booking_id: Mapped[UUID] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
