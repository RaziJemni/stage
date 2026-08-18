from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import Page, PageParams, get_page_params
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import HandlingMode
from app.integrations.whatsapp import InboundMessageEvent, simulator_adapter
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.messaging import service
from app.modules.messaging.schemas import (
    ConversationResponse,
    HandlingModeRequest,
    MessageCreateRequest,
    MessageResponse,
    SimulatorInboundEventRequest,
    SimulatorInboundEventResponse,
)


router = APIRouter(
    prefix="/conversations",
    tags=["Messages"],
)

simulator_router = APIRouter(
    prefix="/integrations/whatsapp",
    tags=["Messages"],
)


async def require_simulator_signature(
    request: Request,
    signature: Annotated[str | None, Header(alias="X-Vayca-Simulator-Signature")] = None,
) -> None:
    if settings.whatsapp_mode != simulator_adapter.mode:
        raise ApiProblem(
            status=503,
            title="Simulator unavailable",
            detail="The WhatsApp simulator is not enabled in the current integration mode.",
            code="integration_mode_unavailable",
        )
    simulator_adapter.verify_signature(raw_body=await request.body(), signature=signature)


@simulator_router.post(
    "/simulator/inbound",
    response_model=SimulatorInboundEventResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Messages"],
    summary="Accept a signed simulator-only inbound WhatsApp event",
)
def receive_simulator_inbound_event(
    payload: SimulatorInboundEventRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[None, Depends(require_simulator_signature)],
) -> SimulatorInboundEventResponse:
    event = InboundMessageEvent(
        property_id=payload.property_id,
        guest_contact_identifier=payload.guest_contact_identifier,
        content=payload.content,
        external_message_id=payload.external_message_id,
        provider_timestamp=payload.provider_timestamp,
        language=payload.language,
    )
    property_obj = service.get_property_for_inbound_event(db, property_id=event.property_id)
    result = service.record_inbound_message(
        db,
        company_id=property_obj.company_id,
        property_id=property_obj.id,
        guest_contact_identifier=event.guest_contact_identifier,
        content=event.content,
        external_message_id=event.external_message_id,
        provider_timestamp=event.provider_timestamp,
        language=event.language,
    )
    return SimulatorInboundEventResponse(
        mode=simulator_adapter.mode,
        message_id=result.message.id,
        conversation_id=result.message.conversation_id,
        created=result.created,
    )


@router.get("", response_model=Page[ConversationResponse])
def list_conversations_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    unread: bool | None = None,
    handling_mode: HandlingMode | None = None,
) -> Page[ConversationResponse]:
    items, total = service.list_conversations(
        db=db,
        company_id=context.company.id,
        params=page_params,
        unread=unread,
        handling_mode=handling_mode,
    )

    return Page.create(
        items=items,
        params=page_params,
        total=total,
    )


@router.post("/{conversation_id}/read", response_model=ConversationResponse)
def mark_conversation_read_endpoint(
    conversation_id: UUID,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> ConversationResponse:
    conversation = service.get_conversation(db, company_id=context.company.id, conversation_id=conversation_id)
    if conversation is None:
        raise ApiProblem(status=404, title="Conversation not found", detail="Conversation does not exist or does not belong to your company.", code="conversation_not_found")
    return service.mark_conversation_read(db, conversation=conversation)


@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def list_messages_endpoint(
    conversation_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> list[MessageResponse]:
    conversation = service.get_conversation(
        db=db,
        company_id=context.company.id,
        conversation_id=conversation_id,
    )

    if conversation is None:
        raise ApiProblem(
            status=404,
            title="Conversation not found",
            detail="Conversation does not exist or does not belong to your company.",
            code="conversation_not_found",
        )

    return service.list_messages(
        db=db,
        company_id=context.company.id,
        conversation_id=conversation_id,
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
def create_message_endpoint(
    conversation_id: UUID,
    request: MessageCreateRequest,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:

    conversation = service.get_conversation(
        db=db,
        company_id=context.company.id,
        conversation_id=conversation_id,
    )

    if conversation is None:
        raise ApiProblem(
            status=404,
            title="Conversation not found",
            detail="Conversation does not exist or does not belong to your company.",
            code="conversation_not_found",
        )

    return service.create_message(
        db=db,
        conversation=conversation,
        company_id=context.company.id,
        sender_user_id=context.user.id,
        content=request.content,
    )


@router.patch(
    "/{conversation_id}/handling-mode",
    response_model=ConversationResponse,
)
def update_handling_mode_endpoint(
    conversation_id: UUID,
    request: HandlingModeRequest,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> ConversationResponse:

    conversation = service.get_conversation(
        db=db,
        company_id=context.company.id,
        conversation_id=conversation_id,
    )

    if conversation is None:
        raise ApiProblem(
            status=404,
            title="Conversation not found",
            detail="Conversation does not exist or does not belong to your company.",
            code="conversation_not_found",
        )

    return service.update_handling_mode(
        db=db,
        conversation=conversation,
        handling_mode=request.handling_mode,
        actor_user_id=context.user.id,
    )
