import base64
from datetime import UTC, datetime
import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch
import urllib.error
from uuid import uuid4

import pytest

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.enums import DeliveryStatus
from app.integrations.whatsapp import (
    BaseWhatsAppAdapter,
    DeliveryStatusUpdate,
    InboundMessageEvent,
    MetaWhatsAppCloudAdapter,
    OutboundDeliveryResult,
    TwilioWhatsAppAdapter,
    WhatsAppSimulatorAdapter,
    get_whatsapp_adapter,
    simulator_adapter,
)


def test_simulator_adapter_basics() -> None:
    adapter = WhatsAppSimulatorAdapter()
    assert adapter.mode == "simulator"

    result = adapter.send_message(to_phone="+21699887766", content="Hello guest")
    assert result.success is True
    assert result.external_message_id is None

    # Test signature verification
    secret = settings.whatsapp_simulator_webhook_secret
    raw_body = b'{"test": 123}'
    valid_sig = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

    adapter.verify_signature(raw_body=raw_body, signature=valid_sig)

    with pytest.raises(ApiProblem) as exc_info:
        adapter.verify_signature(raw_body=raw_body, signature="invalid_signature")
    assert exc_info.value.status == 401


def test_meta_adapter_unconfigured_fails_gracefully() -> None:
    adapter = MetaWhatsAppCloudAdapter(phone_number_id=None, access_token=None)
    assert not adapter.is_configured
    result = adapter.send_message(to_phone="+21699887766", content="Hi")
    assert result.success is False
    assert "not configured" in (result.error_detail or "")


@patch("urllib.request.urlopen")
def test_meta_adapter_send_message_success(mock_urlopen: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({
        "messaging_product": "whatsapp",
        "contacts": [{"input": "21699887766", "wa_id": "21699887766"}],
        "messages": [{"id": "wamid.HBgLMTE="}],
    }).encode("utf-8")
    mock_response.__enter__.return_value = mock_response
    mock_urlopen.return_value = mock_response

    adapter = MetaWhatsAppCloudAdapter(
        phone_number_id="123456789",
        access_token="test_meta_token",
    )
    result = adapter.send_message(to_phone="+21699887766", content="Welcome to Dar El Jenna")

    assert result.success is True
    assert result.external_message_id == "wamid.HBgLMTE="

    # Verify request payload
    req = mock_urlopen.call_args[0][0]
    assert req.full_url == "https://graph.facebook.com/v20.0/123456789/messages"
    assert req.headers["Authorization"] == "Bearer test_meta_token"
    assert req.headers["Content-type"] == "application/json"
    data = json.loads(req.data.decode("utf-8"))
    assert data["to"] == "21699887766"
    assert data["text"]["body"] == "Welcome to Dar El Jenna"


@patch("urllib.request.urlopen")
def test_meta_adapter_send_message_http_error(mock_urlopen: MagicMock) -> None:
    mock_urlopen.side_effect = urllib.error.HTTPError(
        url="https://graph.facebook.com/v20.0/123456789/messages",
        code=400,
        msg="Bad Request",
        hdrs=MagicMock(),
        fp=MagicMock(read=lambda: b'{"error":{"message":"Invalid phone number"}}'),
    )

    adapter = MetaWhatsAppCloudAdapter(
        phone_number_id="123456789",
        access_token="test_meta_token",
    )
    result = adapter.send_message(to_phone="+21600000000", content="Test")
    assert result.success is False
    assert "Invalid phone number" in (result.error_detail or "")


def test_meta_adapter_verify_challenge() -> None:
    adapter = MetaWhatsAppCloudAdapter(webhook_verify_token="my_secret_token")
    # Valid challenge
    challenge = adapter.verify_challenge(
        mode="subscribe",
        token="my_secret_token",
        challenge="1158201444",
    )
    assert challenge == "1158201444"

    # Invalid token or mode
    assert adapter.verify_challenge(mode="subscribe", token="wrong_token", challenge="123") is None
    assert adapter.verify_challenge(mode="unsubscribe", token="my_secret_token", challenge="123") is None


def test_meta_adapter_verify_signature() -> None:
    adapter = MetaWhatsAppCloudAdapter(api_secret="meta_app_secret_123")
    raw_body = b'{"object":"whatsapp_business_account"}'
    computed_hash = hmac.new(b"meta_app_secret_123", raw_body, hashlib.sha256).hexdigest()
    valid_header = f"sha256={computed_hash}"

    # Valid
    adapter.verify_signature(raw_body=raw_body, signature=valid_header)

    # Invalid
    with pytest.raises(ApiProblem) as exc_info:
        adapter.verify_signature(raw_body=raw_body, signature="sha256=invalid")
    assert exc_info.value.status == 401

    with pytest.raises(ApiProblem) as exc_info:
        adapter.verify_signature(raw_body=raw_body, signature=None)
    assert exc_info.value.status == 401


def test_meta_adapter_parse_webhook_payload() -> None:
    adapter = MetaWhatsAppCloudAdapter()
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "BIZ_ID",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "21699887766",
                                    "id": "wamid.INBOUND123",
                                    "timestamp": "1700000000",
                                    "type": "text",
                                    "text": {"body": "Is parking available?"},
                                }
                            ],
                            "statuses": [
                                {
                                    "id": "wamid.OUTBOUND999",
                                    "status": "delivered",
                                    "timestamp": "1700000010",
                                    "recipient_id": "21699887766",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    inbound, statuses = adapter.parse_webhook_payload(payload)

    assert len(inbound) == 1
    assert inbound[0].guest_contact_identifier == "+21699887766"
    assert inbound[0].content == "Is parking available?"
    assert inbound[0].external_message_id == "wamid.INBOUND123"
    assert inbound[0].provider_timestamp == datetime.fromtimestamp(1700000000, tz=UTC)

    assert len(statuses) == 1
    assert statuses[0].external_message_id == "wamid.OUTBOUND999"
    assert statuses[0].status == DeliveryStatus.DELIVERED


def test_twilio_adapter_unconfigured() -> None:
    adapter = TwilioWhatsAppAdapter(account_sid=None, auth_token=None, from_number=None)
    assert not adapter.is_configured
    result = adapter.send_message(to_phone="+21699887766", content="Hello")
    assert result.success is False


@patch("urllib.request.urlopen")
def test_twilio_adapter_send_message_success(mock_urlopen: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({
        "sid": "SM1234567890abcdef",
        "status": "queued",
    }).encode("utf-8")
    mock_response.__enter__.return_value = mock_response
    mock_urlopen.return_value = mock_response

    adapter = TwilioWhatsAppAdapter(
        account_sid="ACtest123",
        auth_token="auth_secret_xyz",
        from_number="+14155238886",
    )
    result = adapter.send_message(to_phone="+21699887766", content="Hello from Twilio")

    assert result.success is True
    assert result.external_message_id == "SM1234567890abcdef"

    req = mock_urlopen.call_args[0][0]
    assert req.full_url == "https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json"
    expected_auth = base64.b64encode(b"ACtest123:auth_secret_xyz").decode("ascii")
    assert req.headers["Authorization"] == f"Basic {expected_auth}"


def test_twilio_adapter_parse_webhook() -> None:
    adapter = TwilioWhatsAppAdapter()
    # Inbound
    inbound_form = {
        "From": "whatsapp:+21699887766",
        "Body": "Can I have extra towels?",
        "MessageSid": "SM_INBOUND_1",
    }
    inbound, statuses = adapter.parse_webhook_payload(inbound_form)
    assert len(inbound) == 1
    assert inbound[0].guest_contact_identifier == "+21699887766"
    assert inbound[0].content == "Can I have extra towels?"
    assert inbound[0].external_message_id == "SM_INBOUND_1"

    # Status callback
    status_form = {
        "MessageSid": "SM_OUTBOUND_1",
        "MessageStatus": "delivered",
    }
    inbound, statuses = adapter.parse_webhook_payload(status_form)
    assert len(statuses) == 1
    assert statuses[0].external_message_id == "SM_OUTBOUND_1"
    assert statuses[0].status == DeliveryStatus.DELIVERED


def test_get_whatsapp_adapter_factory() -> None:
    with patch.object(settings, "whatsapp_mode", "simulator"):
        assert isinstance(get_whatsapp_adapter(), WhatsAppSimulatorAdapter)

    with patch.object(settings, "whatsapp_mode", "production"):
        with patch.object(settings, "whatsapp_provider", "meta"):
            assert isinstance(get_whatsapp_adapter(), MetaWhatsAppCloudAdapter)
        with patch.object(settings, "whatsapp_provider", "twilio"):
            assert isinstance(get_whatsapp_adapter(), TwilioWhatsAppAdapter)
