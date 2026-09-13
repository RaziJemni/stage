import json
from typing import Annotated
import urllib.parse
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import Page, PageParams, get_page_params
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import HandlingMode
from app.integrations.whatsapp import InboundMessageEvent, get_whatsapp_adapter, simulator_adapter
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.messaging import service
from app.modules.chatbot.tasks import process_chatbot_inbound_message
from app.modules.messaging.schemas import (
    ConversationResponse,
    HandlingModeRequest,
    MessageCreateRequest,
    MessageResponse,
    SimulatorInboundEventRequest,
    SimulatorInboundEventResponse,
)
from app.modules.properties.models import Property


router = APIRouter(
    prefix="/conversations",
    tags=["Messages"],
)

simulator_router = APIRouter(
    prefix="/integrations/whatsapp",
    tags=["Messages"],
)


@simulator_router.get(
    "/webhook",
    summary="Meta WhatsApp webhook subscription handshake verification",
    tags=["Messages"],
)
def verify_whatsapp_webhook_handshake(
    hub_mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    hub_verify_token: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    hub_challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
) -> Response:
    adapter = get_whatsapp_adapter()
    if hub_mode and hub_verify_token and hub_challenge:
        verified = adapter.verify_challenge(
            mode=hub_mode,
            token=hub_verify_token,
            challenge=hub_challenge,
        )
        if verified:
            return Response(content=verified, media_type="text/plain")
    return Response(content="Verification failed", status_code=403, media_type="text/plain")


@simulator_router.post(
    "/webhook",
    summary="Receive production WhatsApp inbound messages and delivery status callbacks",
    status_code=status.HTTP_200_OK,
    tags=["Messages"],
)
async def receive_whatsapp_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    x_hub_signature_256: Annotated[str | None, Header(alias="X-Hub-Signature-256")] = None,
    x_twilio_signature: Annotated[str | None, Header(alias="X-Twilio-Signature")] = None,
) -> dict[str, str]:
    adapter = get_whatsapp_adapter()
    raw_body = await request.body()
    signature = x_hub_signature_256 or x_twilio_signature
    adapter.verify_signature(raw_body=raw_body, signature=signature)

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            payload = {}
    elif "application/x-www-form-urlencoded" in content_type:
        parsed_form = urllib.parse.parse_qs(raw_body.decode("utf-8"))
        payload = {k: v[0] if len(v) == 1 else v for k, v in parsed_form.items()}
    else:
        payload = {}

    inbound_events, status_updates = adapter.parse_webhook_payload(payload)

    # 1. Process inbound messages
    for event in inbound_events:
        property_obj = None
        if event.property_id:
            property_obj = db.scalar(select(Property).where(Property.id == event.property_id))
        if not property_obj:
            property_obj = service.resolve_property_for_guest(
                db, guest_contact_identifier=event.guest_contact_identifier
            )
        if not property_obj:
            continue

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
        if result.created:
            try:
                process_chatbot_inbound_message.apply_async(
                    args=(str(property_obj.company_id), str(result.message.id)),
                    retry=False,
                )
            except Exception:
                pass

    # 2. Process delivery status callbacks
    for status_update in status_updates:
        service.record_delivery_status(
            db,
            external_message_id=status_update.external_message_id,
            status=status_update.status,
            error_detail=status_update.error_detail,
            provider_timestamp=status_update.provider_timestamp,
        )

    return {"status": "ok"}


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
    if result.created:
        try:
            process_chatbot_inbound_message.apply_async(
                args=(str(property_obj.company_id), str(result.message.id)),
                retry=False,
            )
        except Exception:
            # Persistence and staff access must not depend on the worker broker.
            pass
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
