from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import PageParams
from app.core.enums import PropertyStatus, TicketStatus
from app.modules.calendar.models import Booking
from app.modules.messaging.models import Conversation
from app.modules.maintenance.models import Ticket, TicketSuggestion
from app.modules.maintenance.schemas import TicketCreateRequest, TicketSuggestionCreateRequest, TicketSuggestionReviewRequest
from app.modules.properties.models import Property


def _validate_links(db: Session, company_id: UUID, payload: TicketCreateRequest) -> None:
    property_obj = db.scalar(select(Property).where(Property.company_id == company_id, Property.id == payload.property_id))
    if not property_obj or property_obj.status is PropertyStatus.ARCHIVED:
        raise ApiProblem(status=404, title="Property not found", detail="Property does not exist or is unavailable to your company.", code="property_not_found")
    if payload.booking_id:
        booking = db.scalar(select(Booking).where(Booking.company_id == company_id, Booking.id == payload.booking_id, Booking.property_id == payload.property_id))
        if not booking:
            raise ApiProblem(status=404, title="Booking not found", detail="Booking does not exist or does not belong to this property.", code="booking_not_found")
    if payload.conversation_id:
        conversation = db.scalar(select(Conversation).where(Conversation.company_id == company_id, Conversation.id == payload.conversation_id, Conversation.property_id == payload.property_id))
        if not conversation:
            raise ApiProblem(status=404, title="Conversation not found", detail="Conversation does not exist or does not belong to this property.", code="conversation_not_found")


def create_ticket(db: Session, *, company_id: UUID, user_id: UUID, payload: TicketCreateRequest, suggested_by_chatbot: bool = False) -> Ticket:
    _validate_links(db, company_id, payload)
    ticket = Ticket(company_id=company_id, created_by_user_id=user_id, suggested_by_chatbot=suggested_by_chatbot, **payload.model_dump())
    db.add(ticket); db.commit(); db.refresh(ticket)
    return ticket


def list_tickets(db: Session, *, company_id: UUID, params: PageParams) -> tuple[list[Ticket], int]:
    statement = select(Ticket).where(Ticket.company_id == company_id)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    return list(db.scalars(statement.order_by(Ticket.created_at.desc()).offset(params.offset).limit(params.page_size)).all()), total


def create_ticket_suggestion(db: Session, *, company_id: UUID, payload: TicketSuggestionCreateRequest) -> TicketSuggestion:
    _validate_links(db, company_id, payload)
    suggestion = TicketSuggestion(company_id=company_id, **payload.model_dump())
    db.add(suggestion); db.commit(); db.refresh(suggestion)
    return suggestion


def list_ticket_suggestions(db: Session, *, company_id: UUID, params: PageParams) -> tuple[list[TicketSuggestion], int]:
    statement = select(TicketSuggestion).where(TicketSuggestion.company_id == company_id, TicketSuggestion.status == "pending")
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    return list(db.scalars(statement.order_by(TicketSuggestion.created_at.desc()).offset(params.offset).limit(params.page_size)).all()), total


def review_ticket_suggestion(db: Session, *, company_id: UUID, user_id: UUID, suggestion_id: UUID, payload: TicketSuggestionReviewRequest | None, confirm: bool) -> TicketSuggestion:
    suggestion = db.scalar(select(TicketSuggestion).where(TicketSuggestion.company_id == company_id, TicketSuggestion.id == suggestion_id))
    if not suggestion:
        raise ApiProblem(status=404, title="Ticket suggestion not found", detail="Suggestion does not exist or does not belong to your company.", code="ticket_suggestion_not_found")
    if suggestion.status != "pending":
        raise ApiProblem(status=409, title="Suggestion already reviewed", detail="Only pending suggestions can be reviewed.", code="ticket_suggestion_already_reviewed")
    suggestion.reviewed_by_user_id = user_id; suggestion.reviewed_at = datetime.now(timezone.utc)
    if confirm:
        assert payload is not None
        ticket_payload = TicketCreateRequest(property_id=suggestion.property_id, booking_id=suggestion.booking_id, conversation_id=suggestion.conversation_id, **payload.model_dump())
        ticket = create_ticket(db, company_id=company_id, user_id=user_id, payload=ticket_payload, suggested_by_chatbot=True)
        suggestion.status = "confirmed"; suggestion.ticket_id = ticket.id
    else:
        suggestion.status = "rejected"
    db.commit()
    db.refresh(suggestion)
    return suggestion
