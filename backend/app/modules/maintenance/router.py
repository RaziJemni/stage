from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.maintenance import service
from app.modules.maintenance.schemas import (
    ContractorCreateRequest,
    ContractorResponse,
    ContractorUpdateRequest,
    TicketAssignmentCreateRequest,
    TicketAssignmentResponse,
    TicketCreateRequest,
    TicketResponse,
    TicketSuggestionResponse,
    TicketSuggestionReviewRequest,
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
