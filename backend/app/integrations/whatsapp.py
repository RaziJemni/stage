import abc
import base64
from dataclasses import dataclass
from datetime import UTC, datetime
import hashlib
import hmac
import json
import logging
from typing import Any
import urllib.error
import urllib.parse
import urllib.request
from uuid import UUID

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.enums import DeliveryStatus

logger = logging.getLogger("vayca.whatsapp")


@dataclass(frozen=True)
class InboundMessageEvent:
    property_id: UUID | None
    guest_contact_identifier: str
    content: str
    external_message_id: str
    provider_timestamp: datetime | None = None
    language: str | None = None


@dataclass(frozen=True)
class OutboundDeliveryResult:
    success: bool
    external_message_id: str | None = None
    error_detail: str | None = None


@dataclass(frozen=True)
class DeliveryStatusUpdate:
    external_message_id: str
    status: DeliveryStatus
    provider_timestamp: datetime | None = None
    error_detail: str | None = None


class BaseWhatsAppAdapter(abc.ABC):
    mode: str

    @abc.abstractmethod
    def send_message(self, *, to_phone: str, content: str) -> OutboundDeliveryResult:
        """Transmits an outbound text message to a guest WhatsApp number."""
        pass

    @abc.abstractmethod
    def verify_signature(self, *, raw_body: bytes, signature: str | None) -> None:
        """Verifies cryptographic authenticity of inbound webhook payload."""
        pass

    def verify_challenge(self, *, mode: str, token: str, challenge: str) -> str | None:
        """Verifies GET subscription handshake for webhooks requiring challenge validation."""
        return None

    def parse_webhook_payload(
        self, payload: dict[str, Any]
    ) -> tuple[list[InboundMessageEvent], list[DeliveryStatusUpdate]]:
        """Parses webhook payload into inbound messages and delivery status callbacks."""
        return [], []


class WhatsAppSimulatorAdapter(BaseWhatsAppAdapter):
    mode = "simulator"

    def verify_signature(self, *, raw_body: bytes, signature: str | None) -> None:
        expected_signature = hmac.new(
            settings.whatsapp_simulator_webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        sig_to_check = signature.removeprefix("sha256=") if signature else None
        if sig_to_check is None or not hmac.compare_digest(sig_to_check, expected_signature):
            raise ApiProblem(
                status=401,
                title="Invalid webhook signature",
                detail="The simulator webhook signature could not be verified.",
                code="invalid_webhook_signature",
            )

    def verify_challenge(self, *, mode: str, token: str, challenge: str) -> str | None:
        expected_token = settings.whatsapp_webhook_verify_token or "simulator_verify_token"
        if mode == "subscribe" and token == expected_token:
            return challenge
        return None

    def parse_webhook_payload(
        self, payload: dict[str, Any]
    ) -> tuple[list[InboundMessageEvent], list[DeliveryStatusUpdate]]:
        if "object" in payload and payload.get("object") == "whatsapp_business_account":
            return MetaWhatsAppCloudAdapter().parse_webhook_payload(payload)
        if "MessageSid" in payload or "SmsSid" in payload or "From" in payload:
            return TwilioWhatsAppAdapter().parse_webhook_payload(payload)
        return [], []

    def send_message(self, *, to_phone: str, content: str) -> OutboundDeliveryResult:
        logger.info(
            "SimulatorWhatsAppAdapter: simulated message delivery to %s (%d chars)",
            to_phone,
            len(content),
        )
        return OutboundDeliveryResult(success=True, external_message_id=None)


class MetaWhatsAppCloudAdapter(BaseWhatsAppAdapter):
    """Production adapter for Meta WhatsApp Business Cloud API (Graph API)."""

    def __init__(
        self,
        phone_number_id: str | None = None,
        access_token: str | None = None,
        api_secret: str | None = None,
        webhook_verify_token: str | None = None,
        api_version: str = "v20.0",
        base_url: str = "https://graph.facebook.com",
    ) -> None:
        self.mode = settings.whatsapp_mode
        self.phone_number_id = phone_number_id if phone_number_id is not None else settings.whatsapp_phone_number_id
        self.access_token = access_token if access_token is not None else settings.whatsapp_access_token
        self.api_secret = api_secret if api_secret is not None else settings.whatsapp_api_secret
        self.webhook_verify_token = webhook_verify_token if webhook_verify_token is not None else settings.whatsapp_webhook_verify_token
        self.api_version = api_version
        self.base_url = base_url.rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.phone_number_id and self.access_token)

    def send_message(self, *, to_phone: str, content: str) -> OutboundDeliveryResult:
        if not self.is_configured:
            logger.error("Meta WhatsApp Cloud API credentials not configured.")
            return OutboundDeliveryResult(
                success=False,
                error_detail="WhatsApp Cloud API credentials not configured.",
            )

        clean_phone = to_phone.strip().lstrip("+")
        url = f"{self.base_url}/{self.api_version}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": False, "body": content},
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = json.loads(response.read().decode("utf-8"))
                messages = body.get("messages", [])
                external_id = messages[0].get("id") if messages else None
                logger.info("Meta WhatsApp message dispatched to %s: %s", to_phone, external_id)
                return OutboundDeliveryResult(success=True, external_message_id=external_id)
        except urllib.error.HTTPError as exc:
            error_msg = exc.read().decode("utf-8", errors="replace")
            logger.error("Meta WhatsApp HTTP error %s: %s", exc.code, error_msg)
            return OutboundDeliveryResult(
                success=False,
                error_detail=f"Meta HTTP {exc.code}: {error_msg}",
            )
        except Exception as exc:
            logger.exception("Meta WhatsApp network failure: %s", exc)
            return OutboundDeliveryResult(
                success=False,
                error_detail=f"Network error: {exc}",
            )

    def verify_signature(self, *, raw_body: bytes, signature: str | None) -> None:
        if not self.api_secret:
            logger.warning("WHATSAPP_API_SECRET not set; signature verification bypassed.")
            return

        if not signature or not signature.startswith("sha256="):
            raise ApiProblem(
                status=401,
                title="Invalid webhook signature",
                detail="Signature header missing or invalid format.",
                code="invalid_webhook_signature",
            )

        received_hash = signature.removeprefix("sha256=").strip()
        computed_hash = hmac.new(self.api_secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(received_hash, computed_hash):
            raise ApiProblem(
                status=401,
                title="Invalid webhook signature",
                detail="The Meta WhatsApp signature could not be verified.",
                code="invalid_webhook_signature",
            )

    def verify_challenge(self, *, mode: str, token: str, challenge: str) -> str | None:
        if mode == "subscribe" and token == self.webhook_verify_token:
            return challenge
        return None

    def parse_webhook_payload(
        self, payload: dict[str, Any]
    ) -> tuple[list[InboundMessageEvent], list[DeliveryStatusUpdate]]:
        inbound_events: list[InboundMessageEvent] = []
        status_updates: list[DeliveryStatusUpdate] = []

        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                if change.get("field") != "messages":
                    continue
                value = change.get("value", {})

                # Process inbound messages
                for msg in value.get("messages", []):
                    sender = msg.get("from")
                    if not sender:
                        continue
                    formatted_sender = f"+{sender.lstrip('+')}"
                    msg_id = msg.get("id") or ""
                    msg_type = msg.get("type")
                    text_content = ""
                    if msg_type == "text":
                        text_content = msg.get("text", {}).get("body", "")
                    elif msg_type == "button":
                        text_content = msg.get("button", {}).get("text", "")
                    elif msg_type == "interactive":
                        interactive = msg.get("interactive", {})
                        text_content = (
                            interactive.get("button_reply", {}).get("title")
                            or interactive.get("list_reply", {}).get("title")
                            or ""
                        )
                    else:
                        text_content = f"[{msg_type} message]"

                    ts_val = msg.get("timestamp")
                    ts = datetime.fromtimestamp(int(ts_val), tz=UTC) if ts_val else None

                    inbound_events.append(
                        InboundMessageEvent(
                            property_id=None,
                            guest_contact_identifier=formatted_sender,
                            content=text_content,
                            external_message_id=msg_id,
                            provider_timestamp=ts,
                            language=None,
                        )
                    )

                # Process delivery status callbacks
                for st in value.get("statuses", []):
                    msg_id = st.get("id")
                    if not msg_id:
                        continue
                    raw_status = st.get("status")
                    ts_val = st.get("timestamp")
                    ts = datetime.fromtimestamp(int(ts_val), tz=UTC) if ts_val else None

                    delivery_status = DeliveryStatus.SENT
                    error_detail = None
                    if raw_status in {"delivered", "read"}:
                        delivery_status = DeliveryStatus.DELIVERED
                    elif raw_status == "sent":
                        delivery_status = DeliveryStatus.SENT
                    elif raw_status == "failed":
                        delivery_status = DeliveryStatus.FAILED
                        errors = st.get("errors", [])
                        if errors:
                            error_detail = json.dumps(errors)

                    status_updates.append(
                        DeliveryStatusUpdate(
                            external_message_id=msg_id,
                            status=delivery_status,
                            provider_timestamp=ts,
                            error_detail=error_detail,
                        )
                    )

        return inbound_events, status_updates


class TwilioWhatsAppAdapter(BaseWhatsAppAdapter):
    """Production adapter for Twilio WhatsApp Messaging API."""

    def __init__(
        self,
        account_sid: str | None = None,
        auth_token: str | None = None,
        from_number: str | None = None,
        base_url: str = "https://api.twilio.com/2010-04-01",
    ) -> None:
        self.mode = settings.whatsapp_mode
        self.account_sid = account_sid if account_sid is not None else settings.twilio_account_sid
        self.auth_token = auth_token if auth_token is not None else settings.twilio_auth_token
        self.from_number = from_number if from_number is not None else settings.twilio_from_number
        self.base_url = base_url.rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    def send_message(self, *, to_phone: str, content: str) -> OutboundDeliveryResult:
        if not self.is_configured:
            logger.error("Twilio WhatsApp credentials not configured.")
            return OutboundDeliveryResult(
                success=False,
                error_detail="Twilio WhatsApp credentials not configured.",
            )

        url = f"{self.base_url}/Accounts/{self.account_sid}/Messages.json"
        to_formatted = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
        from_formatted = f"whatsapp:{self.from_number}" if not (self.from_number or "").startswith("whatsapp:") else self.from_number

        post_data = urllib.parse.urlencode({
            "To": to_formatted,
            "From": from_formatted,
            "Body": content,
        }).encode("utf-8")

        credentials = f"{self.account_sid}:{self.auth_token}"
        auth_header = f"Basic {base64.b64encode(credentials.encode()).decode('ascii')}"

        req = urllib.request.Request(
            url,
            data=post_data,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = json.loads(response.read().decode("utf-8"))
                sid = body.get("sid")
                logger.info("Twilio WhatsApp message dispatched to %s: %s", to_phone, sid)
                return OutboundDeliveryResult(success=True, external_message_id=sid)
        except urllib.error.HTTPError as exc:
            error_msg = exc.read().decode("utf-8", errors="replace")
            logger.error("Twilio WhatsApp HTTP error %s: %s", exc.code, error_msg)
            return OutboundDeliveryResult(
                success=False,
                error_detail=f"Twilio HTTP {exc.code}: {error_msg}",
            )
        except Exception as exc:
            logger.exception("Twilio WhatsApp network failure: %s", exc)
            return OutboundDeliveryResult(
                success=False,
                error_detail=f"Network error: {exc}",
            )

    def verify_signature(self, *, raw_body: bytes, signature: str | None) -> None:
        if not self.auth_token:
            logger.warning("TWILIO_AUTH_TOKEN not set; signature verification bypassed.")
            return
        if not signature:
            raise ApiProblem(
                status=401,
                title="Invalid webhook signature",
                detail="Twilio signature header missing.",
                code="invalid_webhook_signature",
            )

    def parse_webhook_payload(
        self, payload: dict[str, Any]
    ) -> tuple[list[InboundMessageEvent], list[DeliveryStatusUpdate]]:
        inbound_events: list[InboundMessageEvent] = []
        status_updates: list[DeliveryStatusUpdate] = []

        # Twilio Status Callback: MessageSid + MessageStatus
        if "MessageSid" in payload and "MessageStatus" in payload:
            msg_id = payload["MessageSid"]
            status_str = payload["MessageStatus"]
            delivery_status = DeliveryStatus.SENT
            error_detail = payload.get("ErrorMessage")
            if status_str in {"delivered", "read"}:
                delivery_status = DeliveryStatus.DELIVERED
            elif status_str in {"failed", "undelivered"}:
                delivery_status = DeliveryStatus.FAILED

            status_updates.append(
                DeliveryStatusUpdate(
                    external_message_id=msg_id,
                    status=delivery_status,
                    provider_timestamp=datetime.now(UTC),
                    error_detail=error_detail,
                )
            )
        # Twilio Inbound Message: From + Body + MessageSid / SmsSid
        elif "From" in payload and "Body" in payload:
            raw_from = payload["From"]
            clean_from = raw_from.removeprefix("whatsapp:")
            sid = payload.get("MessageSid") or payload.get("SmsSid") or ""
            inbound_events.append(
                InboundMessageEvent(
                    property_id=None,
                    guest_contact_identifier=clean_from,
                    content=payload["Body"],
                    external_message_id=sid,
                    provider_timestamp=datetime.now(UTC),
                    language=None,
                )
            )

        return inbound_events, status_updates


simulator_adapter = WhatsAppSimulatorAdapter()


def get_whatsapp_adapter() -> BaseWhatsAppAdapter:
    """Factory retrieving the configured WhatsApp adapter."""
    mode = settings.whatsapp_mode.lower()
    if mode == "simulator":
        return simulator_adapter
    provider = settings.whatsapp_provider.lower()
    if provider == "twilio":
        return TwilioWhatsAppAdapter()
    return MetaWhatsAppCloudAdapter()
