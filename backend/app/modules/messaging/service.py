from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.pagination import PageParams
from app.core.enums import (
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
)
from app.modules.messaging.models import Conversation, Message
def get_conversation(
    db: Session,
    company_id: UUID,
    conversation_id: UUID,
) -> Conversation | None:
    return db.execute(
        select(Conversation).where(
            Conversation.company_id == company_id,
            Conversation.id == conversation_id,
        )
    ).scalar_one_or_none()


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
        ).all()
    )


def list_conversations(
    db: Session,
    company_id: UUID,
    params: PageParams,
) -> tuple[list[Conversation], int]:
    stmt = select(Conversation).where(
        Conversation.company_id == company_id,
    )

    total = db.scalar(
        select(func.count()).select_from(stmt.subquery())
    ) or 0

    items = list(
        db.scalars(
            stmt.order_by(Conversation.last_message_at.desc())
            .offset(params.offset)
            .limit(params.page_size)
        ).all()
    )

    return items, total
def create_message(
    db: Session,
    *,
    conversation: Conversation,
    company_id: UUID,
    sender_user_id: UUID,
    content: str,
) -> Message:
    message = Message(
        company_id=company_id,
        conversation_id=conversation.id,
        direction=MessageDirection.OUTBOUND,
        sender_type=SenderType.STAFF,
        sender_user_id=sender_user_id,
        content=content,
        delivery_status=DeliveryStatus.RECEIVED,
        automatically_sent=False,
    )

    db.add(message)

    conversation.last_message_at = datetime.now(UTC)

    db.commit()
    db.refresh(message)

    return message
def update_handling_mode(
    db: Session,
    *,
    conversation: Conversation,
    handling_mode: HandlingMode,
) -> Conversation:
    conversation.handling_mode = handling_mode

    db.commit()
    db.refresh(conversation)

    return conversation