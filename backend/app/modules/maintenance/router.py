from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.maintenance import service
from app.modules.maintenance.schemas import TicketCreateRequest, TicketResponse, TicketSuggestionResponse, TicketSuggestionReviewRequest

router = APIRouter(prefix="/tickets", tags=["Maintenance"])


@router.get("", response_model=Page[TicketResponse])
def list_tickets(context: CurrentContext, db: Annotated[Session, Depends(get_db)], page_params: Annotated[PageParams, Depends(get_page_params)]) -> Page[TicketResponse]:
    items, total = service.list_tickets(db, company_id=context.company.id, params=page_params)
    return Page.create(items=items, params=page_params, total=total)


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(context: CsrfContext, payload: TicketCreateRequest, db: Annotated[Session, Depends(get_db)]) -> TicketResponse:
    return service.create_ticket(db, company_id=context.company.id, user_id=context.user.id, payload=payload)


@router.get("/suggestions", response_model=Page[TicketSuggestionResponse])
def list_suggestions(context: CurrentContext, db: Annotated[Session, Depends(get_db)], page_params: Annotated[PageParams, Depends(get_page_params)]) -> Page[TicketSuggestionResponse]:
    items, total = service.list_ticket_suggestions(db, company_id=context.company.id, params=page_params)
    return Page.create(items=items, params=page_params, total=total)


@router.post("/suggestions/{suggestion_id}/confirm", response_model=TicketSuggestionResponse)
def confirm_suggestion(suggestion_id: UUID, context: CsrfContext, payload: TicketSuggestionReviewRequest, db: Annotated[Session, Depends(get_db)]) -> TicketSuggestionResponse:
    return service.review_ticket_suggestion(db, company_id=context.company.id, user_id=context.user.id, suggestion_id=suggestion_id, payload=payload, confirm=True)


@router.post("/suggestions/{suggestion_id}/reject", response_model=TicketSuggestionResponse)
def reject_suggestion(suggestion_id: UUID, context: CsrfContext, db: Annotated[Session, Depends(get_db)]) -> TicketSuggestionResponse:
    return service.review_ticket_suggestion(db, company_id=context.company.id, user_id=context.user.id, suggestion_id=suggestion_id, payload=None, confirm=False)
