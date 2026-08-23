from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.enums import TicketPriority, TicketStatus, enum_type


class Contractor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "contractors"
    __table_args__ = (UniqueConstraint("company_id", "id", name="uq_contractors_company_id_id"),)

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    specialty: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )


class Ticket(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tickets"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_tickets_company_property",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_tickets_company_booking",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "conversation_id"],
            ["conversations.company_id", "conversations.id"],
            name="fk_tickets_company_conversation",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "created_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_tickets_company_created_by_user",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_tickets_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    booking_id: Mapped[UUID | None] = mapped_column(index=True)
    conversation_id: Mapped[UUID | None] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    priority: Mapped[TicketPriority] = mapped_column(
        enum_type(TicketPriority, "ticket_priority"),
        default=TicketPriority.MEDIUM,
        server_default=TicketPriority.MEDIUM.value,
        nullable=False,
    )
    status: Mapped[TicketStatus] = mapped_column(
        enum_type(TicketStatus, "ticket_status"),
        default=TicketStatus.OPEN,
        server_default=TicketStatus.OPEN.value,
        nullable=False,
    )
    created_by_user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    suggested_by_chatbot: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TicketSuggestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ticket_suggestions"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'rejected')", name="ticket_suggestion_status_valid"),
        ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], name="fk_ticket_suggestions_company_property", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "booking_id"], ["bookings.company_id", "bookings.id"], name="fk_ticket_suggestions_company_booking", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "conversation_id"], ["conversations.company_id", "conversations.id"], name="fk_ticket_suggestions_company_conversation", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "reviewed_by_user_id"], ["app_users.company_id", "app_users.id"], name="fk_ticket_suggestions_company_reviewer", ondelete="RESTRICT"),
        UniqueConstraint("company_id", "id", name="uq_ticket_suggestions_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    booking_id: Mapped[UUID | None] = mapped_column(index=True)
    conversation_id: Mapped[UUID | None] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    priority: Mapped[TicketPriority] = mapped_column(enum_type(TicketPriority, "ticket_priority"), default=TicketPriority.MEDIUM, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ticket_id: Mapped[UUID | None] = mapped_column(index=True)


class TicketAssignment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ticket_assignments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "ticket_id"],
            ["tickets.company_id", "tickets.id"],
            name="fk_ticket_assignments_company_ticket",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "contractor_id"],
            ["contractors.company_id", "contractors.id"],
            name="fk_ticket_assignments_company_contractor",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "assigned_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_ticket_assignments_company_assigned_by_user",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_ticket_assignments_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    ticket_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    contractor_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    assigned_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)


class TicketStatusHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ticket_status_history"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "ticket_id"],
            ["tickets.company_id", "tickets.id"],
            name="fk_ticket_status_history_company_ticket",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "changed_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_ticket_status_history_company_changed_by_user",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_ticket_status_history_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    ticket_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    from_status: Mapped[TicketStatus | None] = mapped_column(enum_type(TicketStatus, "ticket_status"))
    to_status: Mapped[TicketStatus] = mapped_column(enum_type(TicketStatus, "ticket_status"), nullable=False)
    changed_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text)


Index(
    "uq_ticket_assignments_active",
    TicketAssignment.company_id,
    TicketAssignment.ticket_id,
    unique=True,
    postgresql_where=TicketAssignment.ended_at.is_(None),
)
