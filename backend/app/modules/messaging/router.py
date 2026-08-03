from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.messaging import service
from app.modules.messaging.schemas import (
    ConversationResponse,
    HandlingModeRequest,
    MessageCreateRequest,
    MessageResponse,
)


router = APIRouter(
    prefix="/conversations",
    tags=["Messages"],
)


@router.get("", response_model=Page[ConversationResponse])
def list_conversations_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
) -> Page[ConversationResponse]:
    items, total = service.list_conversations(
        db=db,
        company_id=context.company.id,
        params=page_params,
    )

    return Page.create(
        items=items,
        params=page_params,
        total=total,
    )


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
