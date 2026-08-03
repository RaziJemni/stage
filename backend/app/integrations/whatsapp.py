from dataclasses import dataclass
import hashlib
import hmac
from datetime import datetime
from uuid import UUID

from app.api.errors import ApiProblem
from app.core.config import settings


@dataclass(frozen=True)
class InboundMessageEvent:
    property_id: UUID
    guest_contact_identifier: str
    content: str
    external_message_id: str
    provider_timestamp: datetime | None
    language: str | None


class WhatsAppSimulatorAdapter:
    mode = "simulator"

    def verify_signature(self, *, raw_body: bytes, signature: str | None) -> None:
        expected_signature = hmac.new(
            settings.whatsapp_simulator_webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if signature is None or not hmac.compare_digest(signature, expected_signature):
            raise ApiProblem(
                status=401,
                title="Invalid webhook signature",
                detail="The simulator webhook signature could not be verified.",
                code="invalid_webhook_signature",
            )


simulator_adapter = WhatsAppSimulatorAdapter()
