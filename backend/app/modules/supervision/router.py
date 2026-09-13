from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.modules.identity.dependencies import CurrentContext, ManagerContext
from app.modules.supervision.schemas import (
    PortfolioAnalyticsResponse,
    WhatsAppIntegrationHealthResponse,
)
from app.modules.supervision.service import get_portfolio_analytics


router = APIRouter(prefix="/integrations", tags=["Supervision"])
analytics_router = APIRouter(prefix="/supervision", tags=["Supervision"])


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
    provider = settings.whatsapp_provider.lower()
    if provider == "meta" and settings.whatsapp_phone_number_id and settings.whatsapp_access_token:
        return WhatsAppIntegrationHealthResponse(
            mode="production",
            health_status="healthy",
            detail="Meta WhatsApp Cloud API configured for production delivery.",
        )
    if provider == "twilio" and settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number:
        return WhatsAppIntegrationHealthResponse(
            mode="production",
            health_status="healthy",
            detail="Twilio WhatsApp API configured for production delivery.",
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


@analytics_router.get(
    "/analytics",
    response_model=PortfolioAnalyticsResponse,
    summary="Return operational portfolio analytics and occupancy insights",
)
def portfolio_analytics_endpoint(
    context: CurrentContext,
    db: Session = Depends(get_db),
    window_days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    property_id: UUID | None = Query(None, description="Optional property ID to filter analytics"),
) -> PortfolioAnalyticsResponse:
    return get_portfolio_analytics(
        db,
        company_id=context.company.id,
        window_days=window_days,
        property_id=property_id,
    )
