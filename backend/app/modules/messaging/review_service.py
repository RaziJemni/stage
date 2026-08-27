from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import (
    BookingRecordType,
    BookingStatus,
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
    TicketPriority,
    TicketStatus,
)
from app.modules.calendar.models import Booking
from app.modules.maintenance.models import Ticket
from app.modules.messaging.models import Conversation, Message
from app.modules.properties.models import Property


REVIEW_TEMPLATES: dict[str, str] = {
    "en": "Dear {guest_name}, thank you for staying at {property_name}! We hope you had a wonderful visit. We would love to hear your feedback or a review of your stay!",
    "fr": "Cher(e) {guest_name}, merci pour votre séjour à {property_name} ! Nous espérons que vous avez passé un excellent moment. N'hésitez pas à nous laisser un avis sur votre expérience !",
    "ar": "عزيزنا {guest_name}، شكراً لإقامتك في {property_name}! نتمنى أن تكون قد قضيت وقتاً رائعاً. يسعدنا جداً أن تشاركنا رأيك وتقييمك لإقامتك معنا!",
    "it": "Gentile {guest_name}, grazie per aver soggiornato a {property_name}! Ci auguriamo che tu abbia trascorso un soggiorno piacevole. Ci farebbe molto piacere ricevere una tua recensione!",
    "de": "Liebe(r) {guest_name}, vielen Dank für Ihren Aufenthalt in {property_name}! Wir hoffen, Sie hatten eine wunderbare Zeit. Wir würden uns sehr über Ihre Bewertung freuen!",
}


@dataclass(frozen=True)
class ReviewRequestEvaluation:
    booking_id: UUID
    property_id: UUID
    property_name: str
    guest_name: str
    guest_contact: str
    status: str
    skip_reason: str | None
    language: str
    sent_at: str | None


def _detect_guest_language(
    db: Session,
    company_id: UUID,
    property_id: UUID,
    guest_contact: str,
) -> str:
    conv = db.scalar(
        select(Conversation).where(
            Conversation.company_id == company_id,
            Conversation.property_id == property_id,
            Conversation.guest_contact_identifier == guest_contact,
        )
    )
    if conv:
        last_msg = db.scalar(
            select(Message)
            .where(
                Message.company_id == company_id,
                Message.conversation_id == conv.id,
                Message.language.is_not(None),
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        if last_msg and last_msg.language in REVIEW_TEMPLATES:
            return last_msg.language

    return "fr"


def evaluate_and_send_review_requests(
    db: Session,
    *,
    company_id: UUID | None = None,
    now: datetime | None = None,
) -> list[ReviewRequestEvaluation]:
    if now is None:
        now = datetime.now(UTC)

    seven_days_ago = now - timedelta(days=7)
    stmt = (
        select(Booking)
        .where(
            Booking.record_type == BookingRecordType.RESERVATION,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.check_out <= now,
            Booking.check_out >= seven_days_ago,
            Booking.guest_contact.is_not(None),
        )
        .order_by(Booking.check_out.desc())
    )
    if company_id is not None:
        stmt = stmt.where(Booking.company_id == company_id)

    candidate_bookings = list(db.scalars(stmt))
    evaluations: list[ReviewRequestEvaluation] = []

    for booking in candidate_bookings:
        raw = dict(booking.raw_payload) if booking.raw_payload else {}
        review_info = raw.get("review_request", {})

        if review_info.get("status") in ("sent", "skipped"):
            continue

        guest_contact = (booking.guest_contact or "").strip()
        if not guest_contact:
            continue

        prop = db.scalar(
            select(Property).where(
                Property.company_id == booking.company_id,
                Property.id == booking.property_id,
            )
        )
        prop_name = prop.name if prop else "our property"
        guest_name = booking.guest_name or "Guest"

        # Safety Rule 1: Urgent maintenance ticket during stay
        problematic_ticket = db.scalar(
            select(Ticket).where(
                Ticket.company_id == booking.company_id,
                Ticket.property_id == booking.property_id,
                Ticket.priority == TicketPriority.URGENT,
                Ticket.status != TicketStatus.CANCELLED,
                Ticket.created_at >= booking.check_in,
                Ticket.created_at <= now,
            )
        )
        if problematic_ticket:
            raw["review_request"] = {
                "status": "skipped",
                "skip_reason": "urgent_maintenance_incident",
                "evaluated_at": now.isoformat(),
            }
            booking.raw_payload = raw
            db.commit()
            evaluations.append(
                ReviewRequestEvaluation(
                    booking_id=booking.id,
                    property_id=booking.property_id,
                    property_name=prop_name,
                    guest_name=guest_name,
                    guest_contact=guest_contact,
                    status="skipped",
                    skip_reason="urgent_maintenance_incident",
                    language="en",
                    sent_at=None,
                )
            )
            continue

        # Safety Rule 2: Escalated complaint or emergency in conversation
        escalated_conv = db.scalar(
            select(Conversation).where(
                Conversation.company_id == booking.company_id,
                Conversation.property_id == booking.property_id,
                Conversation.guest_contact_identifier == guest_contact,
                Conversation.escalation_reason.in_(["complaint", "complaint_or_conflict", "emergency"]),
            )
        )
        if escalated_conv:
            raw["review_request"] = {
                "status": "skipped",
                "skip_reason": "guest_escalated_complaint",
                "evaluated_at": now.isoformat(),
            }
            booking.raw_payload = raw
            db.commit()
            evaluations.append(
                ReviewRequestEvaluation(
                    booking_id=booking.id,
                    property_id=booking.property_id,
                    property_name=prop_name,
                    guest_name=guest_name,
                    guest_contact=guest_contact,
                    status="skipped",
                    skip_reason="guest_escalated_complaint",
                    language="en",
                    sent_at=None,
                )
            )
            continue

        # Safe to send review request
        lang = _detect_guest_language(db, booking.company_id, booking.property_id, guest_contact)
        template = REVIEW_TEMPLATES.get(lang, REVIEW_TEMPLATES["en"])
        content = template.format(guest_name=guest_name, property_name=prop_name)

        conv = db.scalar(
            select(Conversation).where(
                Conversation.company_id == booking.company_id,
                Conversation.property_id == booking.property_id,
                Conversation.guest_contact_identifier == guest_contact,
                Conversation.status == ConversationStatus.OPEN,
            )
        )
        if conv is None:
            conv = Conversation(
                company_id=booking.company_id,
                property_id=booking.property_id,
                booking_id=booking.id,
                guest_contact_identifier=guest_contact,
                status=ConversationStatus.OPEN,
                handling_mode=HandlingMode.AUTOMATIC,
            )
            db.add(conv)
            db.flush()

        external_msg_id = f"review-request-{booking.id}"
        existing_msg = db.scalar(
            select(Message).where(
                Message.company_id == booking.company_id,
                Message.external_message_id == external_msg_id,
            )
        )
        if not existing_msg:
            msg = Message(
                company_id=booking.company_id,
                conversation_id=conv.id,
                external_message_id=external_msg_id,
                direction=MessageDirection.OUTBOUND,
                sender_type=SenderType.SYSTEM,
                content=content,
                language=lang,
                delivery_status=DeliveryStatus.QUEUED,
                automatically_sent=True,
                created_at=now,
            )
            db.add(msg)
            conv.last_message_at = now

        raw["review_request"] = {
            "status": "sent",
            "sent_at": now.isoformat(),
            "language": lang,
            "external_message_id": external_msg_id,
        }
        booking.raw_payload = raw
        db.commit()

        evaluations.append(
            ReviewRequestEvaluation(
                booking_id=booking.id,
                property_id=booking.property_id,
                property_name=prop_name,
                guest_name=guest_name,
                guest_contact=guest_contact,
                status="sent",
                skip_reason=None,
                language=lang,
                sent_at=now.isoformat(),
            )
        )

    return evaluations


def list_review_request_logs(
    db: Session,
    *,
    company_id: UUID,
    limit: int = 50,
) -> list[ReviewRequestEvaluation]:
    stmt = (
        select(Booking)
        .where(
            Booking.company_id == company_id,
            Booking.record_type == BookingRecordType.RESERVATION,
        )
        .order_by(Booking.check_out.desc())
        .limit(limit)
    )
    bookings = list(db.scalars(stmt))
    logs: list[ReviewRequestEvaluation] = []

    for b in bookings:
        raw = b.raw_payload or {}
        review = raw.get("review_request")
        if not review:
            continue

        prop = db.scalar(
            select(Property).where(
                Property.company_id == company_id,
                Property.id == b.property_id,
            )
        )
        prop_name = prop.name if prop else "Unknown Property"

        logs.append(
            ReviewRequestEvaluation(
                booking_id=b.id,
                property_id=b.property_id,
                property_name=prop_name,
                guest_name=b.guest_name or "Guest",
                guest_contact=b.guest_contact or "",
                status=review.get("status", "unknown"),
                skip_reason=review.get("skip_reason"),
                language=review.get("language", "en"),
                sent_at=review.get("sent_at"),
            )
        )

    return logs
