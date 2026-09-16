from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import PageParams
from app.core.config import settings
from app.core.enums import (
    BookingStatus,
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
)
from app.integrations.whatsapp import get_whatsapp_adapter
from app.modules.calendar.models import Booking
from app.modules.chatbot.policy import apply_escalation, classify_message
from app.modules.messaging.models import Conversation, Message
from app.modules.properties.models import Property


@dataclass(frozen=True)
class InboundMessageResult:
    message: Message
    created: bool


def get_conversation(
    db: Session,
    company_id: UUID,
    conversation_id: UUID,
    property_ids: set[UUID] | None = None,
) -> Conversation | None:
    statement = select(Conversation).where(
            Conversation.company_id == company_id,
            Conversation.id == conversation_id,
        )
    if property_ids is not None:
        statement = statement.where(Conversation.property_id.in_(property_ids))
    return db.scalar(statement)


def get_property_for_inbound_event(db: Session, *, property_id: UUID) -> Property:
    property_obj = db.scalar(select(Property).where(Property.id == property_id))
    if property_obj is None:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="The inbound event references an unknown property.",
            code="property_not_found",
        )
    return property_obj


def list_messages(
    db: Session,
    company_id: UUID,
    conversation_id: UUID,
) -> list[Message]:
    return list(
        db.scalars(
            select(Message)
            .where(
                Message.company_id == company_id,
                Message.conversation_id == conversation_id,
            )
            .order_by(Message.created_at.asc())
        )
    )


def list_conversations(
    db: Session,
    company_id: UUID,
    params: PageParams,
    unread: bool | None = None,
    handling_mode: HandlingMode | None = None,
    property_ids: set[UUID] | None = None,
) -> tuple[list[Conversation], int]:
    statement = select(Conversation).where(Conversation.company_id == company_id)
    if property_ids is not None:
        statement = statement.where(Conversation.property_id.in_(property_ids))
    if unread:
        statement = statement.where(Conversation.unread_message_count > 0)
    if handling_mode is not None:
        statement = statement.where(Conversation.handling_mode == handling_mode)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    items = list(
        db.scalars(
            statement.order_by(Conversation.last_message_at.desc().nulls_last())
            .offset(params.offset)
            .limit(params.page_size)
        )
    )
    return items, total


def mark_conversation_read(db: Session, *, conversation: Conversation) -> Conversation:
    db.execute(
        update(Conversation)
        .where(Conversation.id == conversation.id, Conversation.company_id == conversation.company_id)
        .values(unread_message_count=0)
    )
    db.commit()
    db.refresh(conversation)
    return conversation


def create_message(
    db: Session,
    *,
    conversation: Conversation,
    company_id: UUID,
    sender_user_id: UUID,
    content: str,
) -> Message:
    _require_open_conversation(conversation)
    message = Message(
        company_id=company_id,
        conversation_id=conversation.id,
        direction=MessageDirection.OUTBOUND,
        sender_type=SenderType.STAFF,
        sender_user_id=sender_user_id,
        content=content,
        delivery_status=DeliveryStatus.QUEUED,
        automatically_sent=False,
    )
    adapter = get_whatsapp_adapter()
    if adapter.mode in {"production", "test"}:
        delivery = adapter.send_message(
            to_phone=conversation.guest_contact_identifier,
            content=content,
        )
        if delivery.success:
            message.delivery_status = DeliveryStatus.SENT
            if delivery.external_message_id:
                message.external_message_id = delivery.external_message_id
        else:
            message.delivery_status = DeliveryStatus.FAILED
            message.escalation_reason = delivery.error_detail

    db.add(message)
    conversation.handling_mode = HandlingMode.MANUAL
    conversation.assigned_staff_user_id = sender_user_id
    conversation.last_message_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)
    return message


def update_handling_mode(
    db: Session,
    *,
    conversation: Conversation,
    handling_mode: HandlingMode,
    actor_user_id: UUID,
) -> Conversation:
    _require_open_conversation(conversation)
    conversation.handling_mode = handling_mode
    conversation.assigned_staff_user_id = (
        actor_user_id if handling_mode is HandlingMode.MANUAL else None
    )
    db.commit()
    db.refresh(conversation)
    return conversation


def automated_sending_allowed(conversation: Conversation) -> bool:
    return (
        conversation.status is ConversationStatus.OPEN
        and conversation.handling_mode is HandlingMode.AUTOMATIC
    )


def record_inbound_message(
    db: Session,
    *,
    company_id: UUID,
    property_id: UUID,
    guest_contact_identifier: str,
    content: str,
    external_message_id: str,
    provider_timestamp: datetime | None = None,
    language: str | None = None,
    facts_available: bool = True,
) -> InboundMessageResult:
    _get_property(db, company_id=company_id, property_id=property_id)
    existing = db.scalar(
        select(Message).where(
            Message.company_id == company_id,
            Message.external_message_id == external_message_id,
        )
    )
    if existing is not None:
        return InboundMessageResult(message=existing, created=False)

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.company_id == company_id,
            Conversation.property_id == property_id,
            Conversation.guest_contact_identifier == guest_contact_identifier,
            Conversation.status == ConversationStatus.OPEN,
        )
    )
    if conversation is None:
        conversation = Conversation(
            company_id=company_id,
            property_id=property_id,
            guest_contact_identifier=guest_contact_identifier,
        )
        db.add(conversation)
        db.flush()

    message = Message(
        company_id=company_id,
        conversation_id=conversation.id,
        external_message_id=external_message_id,
        direction=MessageDirection.INBOUND,
        sender_type=SenderType.GUEST,
        content=content,
        language=language,
        delivery_status=DeliveryStatus.RECEIVED,
        automatically_sent=False,
        provider_timestamp=provider_timestamp,
    )
    db.add(message)
    apply_escalation(
        conversation,
        classify_message(content, facts_available=facts_available),
    )
    conversation.last_message_at = provider_timestamp or datetime.now(UTC)
    db.execute(
        update(Conversation)
        .where(Conversation.id == conversation.id, Conversation.company_id == company_id)
        .values(unread_message_count=Conversation.unread_message_count + 1)
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        duplicate = db.scalar(
            select(Message).where(
                Message.company_id == company_id,
                Message.external_message_id == external_message_id,
            )
        )
        if duplicate is None:
            raise
        return InboundMessageResult(message=duplicate, created=False)
    db.refresh(message)
    return InboundMessageResult(message=message, created=True)


def _get_property(db: Session, *, company_id: UUID, property_id: UUID) -> Property:
    property_obj = db.scalar(
        select(Property).where(
            Property.company_id == company_id,
            Property.id == property_id,
        )
    )
    if property_obj is None:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )
    return property_obj


def _require_open_conversation(conversation: Conversation) -> None:
    if conversation.status is ConversationStatus.CLOSED:
        raise ApiProblem(
            status=409,
            title="Conversation closed",
            detail="Closed conversations cannot be updated.",
            code="conversation_closed",
        )


def record_delivery_status(
    db: Session,
    *,
    external_message_id: str,
    status: DeliveryStatus,
    error_detail: str | None = None,
    provider_timestamp: datetime | None = None,
) -> Message | None:
    message = db.scalar(
        select(Message).where(Message.external_message_id == external_message_id)
    )
    if message is None:
        return None
    message.delivery_status = status
    if error_detail:
        message.escalation_reason = error_detail
    if provider_timestamp:
        message.provider_timestamp = provider_timestamp
    db.commit()
    db.refresh(message)
    return message


def resolve_property_for_guest(
    db: Session,
    *,
    guest_contact_identifier: str,
) -> Property | None:
    # 1. Match active open conversation with this phone number
    existing_conv = db.scalar(
        select(Conversation)
        .where(
            Conversation.guest_contact_identifier == guest_contact_identifier,
            Conversation.status == ConversationStatus.OPEN,
        )
        .order_by(Conversation.last_message_at.desc().nulls_last())
    )
    if existing_conv:
        return db.scalar(select(Property).where(Property.id == existing_conv.property_id))

    # 2. Match active/upcoming non-cancelled booking with this guest contact
    booking = db.scalar(
        select(Booking)
        .where(
            Booking.guest_contact == guest_contact_identifier,
            Booking.status != BookingStatus.CANCELLED,
        )
        .order_by(Booking.check_in.desc())
    )
    if booking:
        return db.scalar(select(Property).where(Property.id == booking.property_id))

    # 3. Match configured default property fallback
    if settings.whatsapp_default_property_id:
        try:
            prop_id = UUID(settings.whatsapp_default_property_id)
            return db.scalar(select(Property).where(Property.id == prop_id))
        except (ValueError, TypeError):
            pass

    return None
