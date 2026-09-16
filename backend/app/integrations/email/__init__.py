from app.integrations.email.adapters import (
    BaseEmailAdapter,
    ConsoleEmailAdapter,
    EmailPayload,
    InMemoryEmailAdapter,
    SmtpEmailAdapter,
    get_email_adapter,
)
from app.integrations.email.templates import (
    render_invitation_email,
    render_owner_statement_email,
)

__all__ = [
    "BaseEmailAdapter",
    "ConsoleEmailAdapter",
    "EmailPayload",
    "InMemoryEmailAdapter",
    "SmtpEmailAdapter",
    "get_email_adapter",
    "render_invitation_email",
    "render_owner_statement_email",
]
