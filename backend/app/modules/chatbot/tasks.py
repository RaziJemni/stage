from uuid import UUID

from app.core.database import SessionLocal
from app.modules.chatbot.service import process_inbound_message
from app.worker import celery


@celery.task(name="vayca.chatbot.process_inbound_message")
def process_chatbot_inbound_message(company_id: str, inbound_message_id: str) -> str | None:
    with SessionLocal() as db:
        reply = process_inbound_message(
            db,
            company_id=UUID(company_id),
            inbound_message_id=UUID(inbound_message_id),
        )
        return str(reply.id) if reply else None
