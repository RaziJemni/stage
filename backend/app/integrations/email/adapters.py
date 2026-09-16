import abc
from dataclasses import dataclass
from email.message import EmailMessage
import logging
import smtplib
import socket
from typing import ClassVar

from app.api.errors import ApiProblem
from app.core.config import settings

logger = logging.getLogger("vayca.email")


@dataclass(frozen=True)
class EmailPayload:
    to_email: str
    to_name: str
    subject: str
    html_body: str
    text_body: str


class BaseEmailAdapter(abc.ABC):
    @abc.abstractmethod
    def send(self, payload: EmailPayload) -> bool:
        """Sends a transactional email.

        Returns True on success, or raises ApiProblem on delivery failure.
        """
        pass


class ConsoleEmailAdapter(BaseEmailAdapter):
    """Outputs transactional emails to system logs for local development."""

    def send(self, payload: EmailPayload) -> bool:
        logger.info(
            "ConsoleEmailAdapter: sending email to %s <%s> with subject '%s'",
            payload.to_name,
            payload.to_email,
            payload.subject,
        )
        return True


class InMemoryEmailAdapter(BaseEmailAdapter):
    """Stores dispatched emails in memory for unit and integration testing."""

    sent_emails: ClassVar[list[EmailPayload]] = []

    def send(self, payload: EmailPayload) -> bool:
        self.sent_emails.append(payload)
        logger.debug(
            "InMemoryEmailAdapter: captured email to %s <%s> (total captured: %d)",
            payload.to_name,
            payload.to_email,
            len(self.sent_emails),
        )
        return True

    @classmethod
    def clear(cls) -> None:
        cls.sent_emails.clear()


class SmtpEmailAdapter(BaseEmailAdapter):
    """Production SMTP adapter supporting STARTTLS, SSL, and authentication."""

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        username: str | None = None,
        password: str | None = None,
        use_tls: bool | None = None,
        timeout: int | None = None,
        sender_address: str | None = None,
        sender_name: str | None = None,
    ) -> None:
        self.host = host if host is not None else settings.smtp_host
        self.port = port if port is not None else settings.smtp_port
        self.username = username if username is not None else settings.smtp_username
        self.password = password if password is not None else settings.smtp_password
        self.use_tls = use_tls if use_tls is not None else settings.smtp_use_tls
        self.timeout = timeout if timeout is not None else settings.smtp_timeout_seconds
        self.sender_address = sender_address if sender_address is not None else settings.email_sender_address
        self.sender_name = sender_name if sender_name is not None else settings.email_sender_name

    def build_message(self, payload: EmailPayload) -> EmailMessage:
        msg = EmailMessage()
        msg["Subject"] = payload.subject
        if self.sender_name:
            msg["From"] = f"{self.sender_name} <{self.sender_address}>"
        else:
            msg["From"] = self.sender_address

        if payload.to_name:
            msg["To"] = f"{payload.to_name} <{payload.to_email}>"
        else:
            msg["To"] = payload.to_email

        msg.set_content(payload.text_body)
        msg.add_alternative(payload.html_body, subtype="html")
        return msg

    def send(self, payload: EmailPayload) -> bool:
        if not self.host:
            logger.error("SMTP delivery attempted but SMTP host is not configured.")
            raise ApiProblem(
                status=500,
                title="Email delivery misconfigured",
                detail="SMTP host is not configured.",
                code="email_configuration_error",
            )

        msg = self.build_message(payload)

        try:
            smtp_factory = smtplib.SMTP_SSL if self.port == 465 else smtplib.SMTP
            with smtp_factory(self.host, self.port, timeout=self.timeout) as server:
                if self.use_tls and self.port != 465:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)

            logger.info("Successfully dispatched email to %s via SMTP (%s)", payload.to_email, self.host)
            return True
        except (smtplib.SMTPException, socket.error, TimeoutError, OSError) as exc:
            logger.exception("SMTP email delivery failed for %s: %s", payload.to_email, exc)
            raise ApiProblem(
                status=502,
                title="Email delivery failed",
                detail="Failed to deliver transactional email to provider.",
                code="email_delivery_failed",
            ) from exc


def get_email_adapter() -> BaseEmailAdapter:
    """Factory to retrieve the email adapter configured by settings."""
    provider = settings.email_provider.lower()
    if provider == "smtp":
        return SmtpEmailAdapter()
    if provider == "memory":
        return InMemoryEmailAdapter()
    return ConsoleEmailAdapter()
