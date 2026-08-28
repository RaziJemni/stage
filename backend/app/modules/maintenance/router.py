from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.maintenance import service
from app.core.enums import TicketPriority, TicketStatus
from app.modules.maintenance.schemas import (
    ContractorCreateRequest,
    ContractorResponse,
    ContractorUpdateRequest,
    TicketAssignmentCreateRequest,
    TicketAssignmentResponse,
    TicketCreateRequest,
    TicketResponse,
    TicketStatusHistoryResponse,
    TicketStatusUpdateRequest,
    TicketSuggestionResponse,
    TicketSuggestionReviewRequest,
    TicketGuestUpdateRequest,
    TicketGuestUpdateResponse,
)

router = APIRouter(prefix="/tickets", tags=["Maintenance"])
contractor_router = APIRouter(prefix="/contractors", tags=["Maintenance"])


@contractor_router.get("", response_model=Page[ContractorResponse])
def list_contractors(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    include_inactive: bool = False,
) -> Page[ContractorResponse]:
    items, total = service.list_contractors(
        db,
        company_id=context.company.id,
        params=page_params,
        include_inactive=include_inactive,
    )
    return Page.create(items=items, params=page_params, total=total)


@contractor_router.post("", response_model=ContractorResponse, status_code=status.HTTP_201_CREATED)
def create_contractor(
    context: CsrfContext,
    payload: ContractorCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ContractorResponse:
    return service.create_contractor(db, company_id=context.company.id, payload=payload)


@contractor_router.patch("/{contractor_id}", response_model=ContractorResponse)
def update_contractor(
    contractor_id: UUID,
    context: CsrfContext,
    payload: ContractorUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ContractorResponse:
    return service.update_contractor(
        db,
        company_id=context.company.id,
        contractor_id=contractor_id,
        payload=payload,
    )


@router.get("", response_model=Page[TicketResponse])
def list_tickets(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    property_id: UUID | None = None,
    priority: TicketPriority | None = None,
    status: TicketStatus | None = None,
    contractor_id: UUID | None = None,
) -> Page[TicketResponse]:
    items, total = service.list_tickets(
        db,
        company_id=context.company.id,
        params=page_params,
        property_id=property_id,
        priority=priority,
        status=status,
        contractor_id=contractor_id,
    )
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


@router.get("/{ticket_id}/assignments", response_model=list[TicketAssignmentResponse])
def list_ticket_assignments(
    ticket_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> list[TicketAssignmentResponse]:
    return service.list_ticket_assignments(
        db, company_id=context.company.id, ticket_id=ticket_id
    )


@router.post("/{ticket_id}/assignments", response_model=TicketAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_contractor(
    ticket_id: UUID,
    context: CsrfContext,
    payload: TicketAssignmentCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TicketAssignmentResponse:
    return service.assign_contractor(
        db,
        company_id=context.company.id,
        ticket_id=ticket_id,
        assigned_by_user_id=context.user.id,
        payload=payload,
    )


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: UUID,
    context: CsrfContext,
    payload: TicketStatusUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TicketResponse:
    return service.update_ticket_status(
        db,
        company_id=context.company.id,
        user_id=context.user.id,
        ticket_id=ticket_id,
        payload=payload,
    )


@router.get("/{ticket_id}/status-history", response_model=list[TicketStatusHistoryResponse])
def list_ticket_status_history(
    ticket_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> list[TicketStatusHistoryResponse]:
    return service.list_ticket_status_history(
        db, company_id=context.company.id, ticket_id=ticket_id
    )


@router.post("/{ticket_id}/guest-update", response_model=TicketGuestUpdateResponse, status_code=status.HTTP_201_CREATED)
def send_ticket_guest_update(
    ticket_id: UUID,
    context: CsrfContext,
    payload: TicketGuestUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TicketGuestUpdateResponse:
    message = service.send_guest_update(
        db,
        company_id=context.company.id,
        user_id=context.user.id,
        ticket_id=ticket_id,
        payload=payload,
    )
    return TicketGuestUpdateResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        content=message.content,
        delivery_status=message.delivery_status.value if hasattr(message.delivery_status, "value") else str(message.delivery_status),
        created_at=message.created_at,
    )
