"""Grounded reply orchestration for persisted inbound guest messages."""

import re
from dataclasses import dataclass
from datetime import datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.enums import DeliveryStatus, HandlingMode, MessageDirection, SenderType
from app.integrations.chatbot import (
    ChatbotProviderError,
    GeneratedReply,
    GroundedReplyRequest,
    get_chatbot_provider,
)
from app.modules.calendar.service import is_available
from app.modules.chatbot.policy import PolicyOutcome, apply_escalation, classify_message
from app.modules.messaging.models import Conversation, Message
from app.modules.properties.models import Property


_DATE_PATTERN = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
_ARABIC_PATTERN = re.compile(r"[\u0600-\u06ff]")


@dataclass(frozen=True)
class GroundedFact:
    label: str
    value: str


def process_inbound_message(
    db: Session,
    *,
    company_id: UUID,
    inbound_message_id: UUID,
) -> Message | None:
    """Create at most one queued chatbot reply, or escalate the conversation."""
    inbound = db.scalar(
        select(Message).where(
            Message.company_id == company_id,
            Message.id == inbound_message_id,
            Message.direction == MessageDirection.INBOUND,
            Message.sender_type == SenderType.GUEST,
        )
    )
    if inbound is None:
        return None
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.company_id == company_id,
            Conversation.id == inbound.conversation_id,
        )
    )
    if conversation is None or conversation.handling_mode is not HandlingMode.AUTOMATIC:
        return None
    reply_external_id = f"chatbot-reply:{inbound.id}"
    existing = db.scalar(
        select(Message).where(
            Message.company_id == company_id,
            Message.external_message_id == reply_external_id,
        )
    )
    if existing is not None:
        return existing

    decision = classify_message(inbound.content)
    if decision.outcome is not PolicyOutcome.SAFE:
        _escalate(db, conversation, decision.reason or "confirmation_required")
        return None

    property_obj = db.scalar(
        select(Property).where(
            Property.company_id == company_id,
            Property.id == conversation.property_id,
        )
    )
    fact = _grounded_fact(db, company_id=company_id, property_obj=property_obj, content=inbound.content)
    if fact is None:
        _escalate(db, conversation, "missing_or_uncertain_information")
        return None

    language = _supported_language(inbound.language, inbound.content)
    try:
        generated = get_chatbot_provider().generate(
            GroundedReplyRequest(
                language=language,
                guest_message=inbound.content,
                fact_label=fact.label,
                fact_value=fact.value,
            )
        )
    except ChatbotProviderError:
        _escalate(db, conversation, "chatbot_provider_unavailable")
        return None

    return _persist_reply(
        db,
        conversation=conversation,
        inbound=inbound,
        external_message_id=reply_external_id,
        language=language,
        generated=generated,
    )


def _grounded_fact(
    db: Session, *, company_id: UUID, property_obj: Property | None, content: str
) -> GroundedFact | None:
    if property_obj is None:
        return None
    normalized = content.casefold()
    if any(term in normalized for term in ("availability", "available", "disponib", "متاح", "شاغر")):
        dates = _DATE_PATTERN.findall(content)
        if len(dates) != 2:
            return None
        try:
            timezone = ZoneInfo(property_obj.timezone)
            check_in = datetime.combine(datetime.fromisoformat(dates[0]).date(), time.min, timezone)
            check_out = datetime.combine(datetime.fromisoformat(dates[1]).date(), time.min, timezone)
            available = is_available(
                db,
                company_id=company_id,
                property_id=property_obj.id,
                check_in=check_in,
                check_out=check_out,
            )
        except (ValueError, ZoneInfoNotFoundError, ApiProblem):
            return None
        return GroundedFact(
            label="Availability",
            value="available" if available else "unavailable",
        )
    fields: tuple[tuple[tuple[str, ...], str, object | None], ...] = (
        (("wifi", "wi-fi", "internet", "واي فاي"), "Wi-Fi", property_obj.wifi_password),
        (("check-in", "check in", "arrival", "arrivée", "وصول"), "Check-in", property_obj.check_in_time),
        (("check-out", "check out", "departure", "départ", "مغادرة"), "Check-out", property_obj.check_out_time),
        (("parking", "stationnement", "موقف"), "Parking", property_obj.parking_info),
        (("directions", "direction", "itinéraire", "عنوان"), "Directions", property_obj.directions),
        (("rules", "règles", "house rule", "قواعد"), "House rules", property_obj.house_rules),
        (("amenities", "equipment", "équipement", "مرافق"), "Amenities", property_obj.amenities),
    )
    for terms, label, value in fields:
        if any(term in normalized for term in terms) and value:
            return GroundedFact(label=label, value=_format_fact(value))
    return None


def _format_fact(value: object) -> str:
    if isinstance(value, dict):
        return ", ".join(str(item) for item in value.values())
    return str(value)


def _supported_language(declared_language: str | None, content: str) -> str:
    if declared_language in {"en", "fr", "ar"}:
        return declared_language
    normalized = content.casefold()
    if _ARABIC_PATTERN.search(content) or any(term in normalized for term in ("chnowa", "win", "nheb")):
        return "ar"
    if any(term in normalized for term in ("bonjour", "merci", "disponib", "arrivée", "règles")):
        return "fr"
    return "en"


def _persist_reply(
    db: Session,
    *,
    conversation: Conversation,
    inbound: Message,
    external_message_id: str,
    language: str,
    generated: GeneratedReply,
) -> Message:
    reply = Message(
        company_id=conversation.company_id,
        conversation_id=conversation.id,
        external_message_id=external_message_id,
        direction=MessageDirection.OUTBOUND,
        sender_type=SenderType.CHATBOT,
        language=language,
        content=generated.content,
        delivery_status=DeliveryStatus.QUEUED,
        automatically_sent=True,
        model_version=generated.model_version,
    )
    db.add(reply)
    conversation.last_message_at = inbound.provider_timestamp or inbound.created_at
    try:
        db.commit()
    except IntegrityError:
        # Celery may redeliver or run two copies of the same task concurrently.
        db.rollback()
        existing = db.scalar(
            select(Message).where(
                Message.company_id == conversation.company_id,
                Message.external_message_id == external_message_id,
            )
        )
        if existing is not None:
            return existing
        raise
    db.refresh(reply)
    return reply


def _escalate(db: Session, conversation: Conversation, reason: str) -> None:
    apply_escalation(
        conversation,
        classify_message("", facts_available=False),
    )
    conversation.escalation_reason = reason
    db.commit()
