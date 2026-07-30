from urllib.parse import urlencode

from app.api.errors import ApiProblem
from app.core.config import settings


class InvitationDelivery:
    def delivery_url(self, token: str) -> str | None:
        if settings.environment == "production":
            raise ApiProblem(
                status=503,
                title="Invitation delivery unavailable",
                detail="A production invitation email adapter has not been configured.",
                code="invitation_delivery_unavailable",
            )
        query = urlencode({"token": token})
        return f"{settings.frontend_base_url.rstrip('/')}/accept-invite?{query}"


invitation_delivery = InvitationDelivery()
