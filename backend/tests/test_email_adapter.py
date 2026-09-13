from email.message import EmailMessage
import smtplib
import socket
from unittest.mock import MagicMock, patch

import pytest

from app.api.errors import ApiProblem
from app.core.config import settings
from app.integrations.email.adapters import (
    ConsoleEmailAdapter,
    EmailPayload,
    InMemoryEmailAdapter,
    SmtpEmailAdapter,
    get_email_adapter,
)
from app.integrations.email.templates import render_invitation_email
from app.integrations.invitations import invitation_delivery


def test_render_invitation_email_french_and_escaping() -> None:
    subject, html_body, text_body = render_invitation_email(
        recipient_name="<Yassine> & Co",
        company_name="Dar El Jenna <Ventures>",
        inviter_name="Leila <b>Manager</b>",
        invitation_url="https://app.vayca.tn/accept-invite?token=abc-123&test=1",
        language="fr",
    )

    assert "Dar El Jenna <Ventures>" in subject
    assert "https://app.vayca.tn/accept-invite?token=abc-123&amp;test=1" in html_body
    assert "&lt;Yassine&gt; &amp; Co" in html_body
    assert "<b>" not in html_body  # Ensure Leila's tag is escaped to &lt;b&gt;
    assert "&lt;b&gt;Manager&lt;/b&gt;" in html_body
    assert "Accepter l'invitation" in html_body
    assert "72 heures" in html_body

    # Plain text body verification
    assert "Bonjour <Yassine> & Co," in text_body
    assert "https://app.vayca.tn/accept-invite?token=abc-123&test=1" in text_body
    assert "72 heures" in text_body


def test_render_invitation_email_english() -> None:
    subject, html_body, text_body = render_invitation_email(
        recipient_name="Amira Test",
        company_name="Sidi Bou Said Suites",
        inviter_name="Karim Owner",
        invitation_url="https://app.vayca.tn/accept-invite?token=xyz-999",
        language="en",
    )

    assert "Invitation to join Sidi Bou Said Suites on Vayca" in subject
    assert "Hello Amira Test," in html_body
    assert "Accept Invitation" in html_body
    assert "72 hours" in html_body
    assert "Hello Amira Test," in text_body
    assert "https://app.vayca.tn/accept-invite?token=xyz-999" in text_body


def test_render_invitation_email_fallback_language() -> None:
    # Non-supported or empty language defaults to French
    subject, _, _ = render_invitation_email(
        recipient_name="User",
        company_name="Company",
        inviter_name="Manager",
        invitation_url="https://app.vayca.tn/accept-invite?token=123",
        language="it",
    )
    assert "Invitation à rejoindre Company sur Vayca" in subject


def test_in_memory_email_adapter() -> None:
    InMemoryEmailAdapter.clear()
    adapter = InMemoryEmailAdapter()

    payload = EmailPayload(
        to_email="test@example.com",
        to_name="Test User",
        subject="Test Subject",
        html_body="<p>Test</p>",
        text_body="Test",
    )

    success = adapter.send(payload)
    assert success is True
    assert len(InMemoryEmailAdapter.sent_emails) == 1
    assert InMemoryEmailAdapter.sent_emails[0].to_email == "test@example.com"

    InMemoryEmailAdapter.clear()
    assert len(InMemoryEmailAdapter.sent_emails) == 0


def test_console_email_adapter() -> None:
    adapter = ConsoleEmailAdapter()
    payload = EmailPayload(
        to_email="console@example.com",
        to_name="Console User",
        subject="Console Test",
        html_body="<p>Log</p>",
        text_body="Log",
    )
    assert adapter.send(payload) is True


def test_smtp_adapter_missing_host_raises_api_problem() -> None:
    adapter = SmtpEmailAdapter(host=None)
    payload = EmailPayload(
        to_email="err@example.com",
        to_name="Err User",
        subject="Err",
        html_body="<p>Err</p>",
        text_body="Err",
    )
    with pytest.raises(ApiProblem) as exc_info:
        adapter.send(payload)

    assert exc_info.value.status == 500
    assert exc_info.value.code == "email_configuration_error"


def test_smtp_adapter_build_message() -> None:
    adapter = SmtpEmailAdapter(
        host="smtp.example.com",
        sender_address="noreply@vayca.tn",
        sender_name="Vayca Platform",
    )
    payload = EmailPayload(
        to_email="staff@example.com",
        to_name="Staff Member",
        subject="Welcome",
        html_body="<h1>Welcome</h1>",
        text_body="Welcome",
    )
    msg = adapter.build_message(payload)
    assert isinstance(msg, EmailMessage)
    assert msg["Subject"] == "Welcome"
    assert msg["From"] == "Vayca Platform <noreply@vayca.tn>"
    assert msg["To"] == "Staff Member <staff@example.com>"


@patch("smtplib.SMTP")
def test_smtp_adapter_send_success(mock_smtp_cls: MagicMock) -> None:
    mock_server = MagicMock()
    mock_smtp_cls.return_value.__enter__.return_value = mock_server

    adapter = SmtpEmailAdapter(
        host="smtp.example.com",
        port=587,
        username="smtp_user",
        password="smtp_password",
        use_tls=True,
    )
    payload = EmailPayload(
        to_email="recipient@example.com",
        to_name="Recipient",
        subject="Hello",
        html_body="<p>Hello</p>",
        text_body="Hello",
    )
    result = adapter.send(payload)
    assert result is True

    mock_smtp_cls.assert_called_once_with("smtp.example.com", 587, timeout=settings.smtp_timeout_seconds)
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("smtp_user", "smtp_password")
    mock_server.send_message.assert_called_once()


@patch("smtplib.SMTP_SSL")
def test_smtp_adapter_ssl_port_465(mock_smtp_ssl_cls: MagicMock) -> None:
    mock_server = MagicMock()
    mock_smtp_ssl_cls.return_value.__enter__.return_value = mock_server

    adapter = SmtpEmailAdapter(
        host="smtp.example.com",
        port=465,
        username="user",
        password="pw",
    )
    payload = EmailPayload(
        to_email="recipient@example.com",
        to_name="Recipient",
        subject="Hello SSL",
        html_body="<p>SSL</p>",
        text_body="SSL",
    )
    assert adapter.send(payload) is True
    mock_smtp_ssl_cls.assert_called_once_with("smtp.example.com", 465, timeout=settings.smtp_timeout_seconds)
    mock_server.login.assert_called_once_with("user", "pw")
    mock_server.send_message.assert_called_once()


@patch("smtplib.SMTP")
def test_smtp_adapter_send_failure_raises_502(mock_smtp_cls: MagicMock) -> None:
    mock_server = MagicMock()
    mock_smtp_cls.return_value.__enter__.return_value = mock_server
    mock_server.send_message.side_effect = smtplib.SMTPException("Relay access denied")

    adapter = SmtpEmailAdapter(host="smtp.example.com", port=587)
    payload = EmailPayload(
        to_email="recipient@example.com",
        to_name="Recipient",
        subject="Fail",
        html_body="<p>Fail</p>",
        text_body="Fail",
    )

    with pytest.raises(ApiProblem) as exc_info:
        adapter.send(payload)

    assert exc_info.value.status == 502
    assert exc_info.value.code == "email_delivery_failed"


def test_get_email_adapter_factory() -> None:
    with patch.object(settings, "email_provider", "smtp"):
        assert isinstance(get_email_adapter(), SmtpEmailAdapter)
    with patch.object(settings, "email_provider", "memory"):
        assert isinstance(get_email_adapter(), InMemoryEmailAdapter)
    with patch.object(settings, "email_provider", "console"):
        assert isinstance(get_email_adapter(), ConsoleEmailAdapter)


def test_invitation_delivery_dev_mode_returns_url() -> None:
    with patch.object(settings, "environment", "development"):
        with patch.object(settings, "email_provider", "console"):
            url = invitation_delivery.deliver_invitation(
                recipient_email="dev@example.com",
                recipient_name="Dev Member",
                company_name="Dev Corp",
                inviter_name="Admin",
                token="token-abc-123",
            )
            assert url is not None
            assert "/accept-invite?token=token-abc-123" in url


def test_invitation_delivery_production_without_adapter_raises_503() -> None:
    with patch.object(settings, "environment", "production"):
        with patch.object(settings, "email_provider", "console"):
            with pytest.raises(ApiProblem) as exc_info:
                invitation_delivery.deliver_invitation(
                    recipient_email="prod@example.com",
                    recipient_name="Prod Member",
                    company_name="Prod Corp",
                    inviter_name="Admin",
                    token="token-abc-123",
                )
            assert exc_info.value.status == 503
            assert exc_info.value.code == "invitation_delivery_unavailable"


def test_invitation_delivery_production_with_smtp_hides_url() -> None:
    with patch.object(settings, "environment", "production"):
        with patch.object(settings, "email_provider", "smtp"):
            with patch("app.integrations.email.adapters.SmtpEmailAdapter.send", return_value=True):
                url = invitation_delivery.deliver_invitation(
                    recipient_email="prod@example.com",
                    recipient_name="Prod Member",
                    company_name="Prod Corp",
                    inviter_name="Admin",
                    token="token-abc-123",
                )
                assert url is None
