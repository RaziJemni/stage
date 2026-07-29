from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.enums import (
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
    enum_type,
)


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_conversations_company_property",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_conversations_company_booking",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "assigned_staff_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_conversations_company_assigned_staff",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_conversations_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    booking_id: Mapped[UUID | None] = mapped_column(index=True)
    guest_contact_identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ConversationStatus] = mapped_column(
        enum_type(ConversationStatus, "conversation_status"),
        default=ConversationStatus.OPEN,
        server_default=ConversationStatus.OPEN.value,
        nullable=False,
    )
    handling_mode: Mapped[HandlingMode] = mapped_column(
        enum_type(HandlingMode, "handling_mode"),
        default=HandlingMode.AUTOMATIC,
        server_default=HandlingMode.AUTOMATIC.value,
        nullable=False,
    )
    assigned_staff_user_id: Mapped[UUID | None] = mapped_column(index=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    escalation_reason: Mapped[str | None] = mapped_column(Text)


class Message(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "conversation_id"],
            ["conversations.company_id", "conversations.id"],
            name="fk_messages_company_conversation",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "sender_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_messages_company_sender_user",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("company_id", "id", name="uq_messages_company_id_id"),
    )

    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    conversation_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    external_message_id: Mapped[str | None] = mapped_column(String(255))
    direction: Mapped[MessageDirection] = mapped_column(
        enum_type(MessageDirection, "message_direction"), nullable=False
    )
    sender_type: Mapped[SenderType] = mapped_column(
        enum_type(SenderType, "sender_type"), nullable=False
    )
    sender_user_id: Mapped[UUID | None] = mapped_column(index=True)
    language: Mapped[str | None] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_status: Mapped[DeliveryStatus] = mapped_column(
        enum_type(DeliveryStatus, "delivery_status"),
        default=DeliveryStatus.RECEIVED,
        server_default=DeliveryStatus.RECEIVED.value,
        nullable=False,
    )
    automatically_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(100))
    escalation_reason: Mapped[str | None] = mapped_column(Text)
    provider_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


Index(
    "uq_conversations_open_identity",
    Conversation.company_id,
    Conversation.property_id,
    Conversation.guest_contact_identifier,
    unique=True,
    postgresql_where=Conversation.status == ConversationStatus.OPEN.value,
)
Index(
    "uq_messages_external_id",
    Message.company_id,
    Message.external_message_id,
    unique=True,
    postgresql_where=Message.external_message_id.is_not(None),
)
