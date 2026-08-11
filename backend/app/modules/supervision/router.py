from fastapi import APIRouter

from app.core.config import settings
from app.modules.identity.dependencies import ManagerContext
from app.modules.supervision.schemas import WhatsAppIntegrationHealthResponse


router = APIRouter(prefix="/integrations", tags=["Supervision"])


def _whatsapp_health() -> WhatsAppIntegrationHealthResponse:
    mode = settings.whatsapp_mode
    if mode == "simulator":
        return WhatsAppIntegrationHealthResponse(
            mode="simulator",
            health_status="simulator",
            detail="Local simulator only; no WhatsApp messages are sent.",
        )
    if mode == "test":
        return WhatsAppIntegrationHealthResponse(
            mode="test",
            health_status="test",
            detail="Provider test mode; production delivery is not connected.",
        )
    return WhatsAppIntegrationHealthResponse(
        mode="production",
        health_status="unconfigured",
        detail="Production WhatsApp adapter is not configured.",
    )


@router.get(
    "/whatsapp/health",
    response_model=WhatsAppIntegrationHealthResponse,
    summary="Return safe WhatsApp integration health",
)
def whatsapp_health_endpoint(
    _: ManagerContext,
) -> WhatsAppIntegrationHealthResponse:
    return _whatsapp_health()
