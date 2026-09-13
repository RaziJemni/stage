from urllib.parse import urlencode

from app.api.errors import ApiProblem
from app.core.config import settings
from app.integrations.email import EmailPayload, get_email_adapter, render_invitation_email


class InvitationDelivery:
    def build_invitation_url(self, token: str) -> str:
        query = urlencode({"token": token})
        return f"{settings.frontend_base_url.rstrip('/')}/accept-invite?{query}"

    def delivery_url(self, token: str) -> str | None:
        if settings.environment == "production" and settings.email_provider not in {"smtp", "memory"}:
            raise ApiProblem(
                status=503,
                title="Invitation delivery unavailable",
                detail="A production invitation email adapter has not been configured.",
                code="invitation_delivery_unavailable",
            )
        return self.build_invitation_url(token)

    def deliver_invitation(
        self,
        recipient_email: str,
        recipient_name: str,
        company_name: str,
        inviter_name: str,
        token: str,
        language: str = "fr",
    ) -> str | None:
        if settings.environment == "production" and settings.email_provider == "console":
            raise ApiProblem(
                status=503,
                title="Invitation delivery unavailable",
                detail="A production invitation email adapter has not been configured.",
                code="invitation_delivery_unavailable",
            )

        invitation_url = self.build_invitation_url(token)
        subject, html_body, text_body = render_invitation_email(
            recipient_name=recipient_name,
            company_name=company_name,
            inviter_name=inviter_name,
            invitation_url=invitation_url,
            language=language,
        )

        payload = EmailPayload(
            to_email=recipient_email,
            to_name=recipient_name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )
        adapter = get_email_adapter()
        adapter.send(payload)

        if settings.environment == "production" and settings.email_provider == "smtp":
            return None

        return invitation_url


invitation_delivery = InvitationDelivery()
