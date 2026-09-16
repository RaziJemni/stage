from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.modules.identity.dependencies import CurrentContext, ManagerContext
from app.modules.supervision.payout_service import (
    export_owner_statement_csv,
    get_company_owner_statements,
    get_single_owner_statement,
)
from app.modules.supervision.schemas import (
    CompanyStatementsOverviewResponse,
    OwnerMonthlyStatementResponse,
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


@analytics_router.get(
    "/owner-statements",
    response_model=CompanyStatementsOverviewResponse,
    summary="List monthly owner payout statements for company",
)
def list_owner_statements_endpoint(
    context: CurrentContext,
    db: Session = Depends(get_db),
    year: int | None = Query(None, description="Year (e.g. 2026)"),
    month: int | None = Query(None, ge=1, le=12, description="Month (1-12)"),
) -> CompanyStatementsOverviewResponse:
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    return get_company_owner_statements(
        db,
        company_id=context.company.id,
        year=target_year,
        month=target_month,
        currency=context.company.default_currency or "TND",
    )


@analytics_router.get(
    "/owner-statements/{owner_id}",
    response_model=OwnerMonthlyStatementResponse,
    summary="Get single owner monthly statement breakdown",
)
def get_owner_statement_endpoint(
    owner_id: UUID,
    context: CurrentContext,
    db: Session = Depends(get_db),
    year: int | None = Query(None, description="Year (e.g. 2026)"),
    month: int | None = Query(None, ge=1, le=12, description="Month (1-12)"),
) -> OwnerMonthlyStatementResponse:
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    return get_single_owner_statement(
        db,
        company_id=context.company.id,
        owner_id=owner_id,
        year=target_year,
        month=target_month,
        currency=context.company.default_currency or "TND",
    )


@analytics_router.get(
    "/owner-statements/{owner_id}/export",
    summary="Export owner monthly payout statement as CSV",
)
def export_owner_statement_endpoint(
    owner_id: UUID,
    context: CurrentContext,
    db: Session = Depends(get_db),
    year: int | None = Query(None, description="Year (e.g. 2026)"),
    month: int | None = Query(None, ge=1, le=12, description="Month (1-12)"),
) -> Response:
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    statement = get_single_owner_statement(
        db,
        company_id=context.company.id,
        owner_id=owner_id,
        year=target_year,
        month=target_month,
        currency=context.company.default_currency or "TND",
    )
    csv_content = export_owner_statement_csv(statement)
    filename = f"statement_{statement.owner_name.replace(' ', '_')}_{target_year}_{target_month:02d}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
