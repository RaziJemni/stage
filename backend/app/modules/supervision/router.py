from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.database import get_db
from app.modules.identity.dependencies import CurrentContext, ManagerContext
from app.modules.identity.models import Company
from app.modules.properties.models import Owner
from app.modules.supervision.payout_service import (
    calculate_owner_statement,
    create_or_get_statement_token,
    dispatch_statement_email,
    export_owner_statement_csv,
    get_company_owner_statements,
    get_single_owner_statement,
    verify_statement_token,
)
from app.modules.supervision.schemas import (
    CompanyStatementsOverviewResponse,
    GetOwnerStatementShareLinkRequest,
    OwnerMonthlyStatementResponse,
    OwnerStatementShareLinkResponse,
    PortfolioAnalyticsResponse,
    SendOwnerStatementRequest,
    SendOwnerStatementResponse,
    WhatsAppIntegrationHealthResponse,
)
from app.modules.supervision.service import get_portfolio_analytics
from app.modules.supervision.statement_html import render_owner_statement_html


router = APIRouter(prefix="/integrations", tags=["Supervision"])
analytics_router = APIRouter(prefix="/supervision", tags=["Supervision"])
public_owner_router = APIRouter(prefix="/public/owner-statements", tags=["Public Owner Portal"])


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


@analytics_router.get(
    "/owner-statements/{owner_id}/html",
    response_class=HTMLResponse,
    summary="Get branded printable HTML owner monthly statement",
)
def get_owner_statement_html_endpoint(
    owner_id: UUID,
    context: CurrentContext,
    db: Session = Depends(get_db),
    year: int | None = Query(None, description="Year (e.g. 2026)"),
    month: int | None = Query(None, ge=1, le=12, description="Month (1-12)"),
) -> HTMLResponse:
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
    rendered_html = render_owner_statement_html(statement, company_name=context.company.name)
    return HTMLResponse(content=rendered_html)


@analytics_router.post(
    "/owner-statements/send",
    response_model=SendOwnerStatementResponse,
    summary="Email monthly statement directly to the owner",
)
def send_owner_statement_email_endpoint(
    payload: SendOwnerStatementRequest,
    context: CurrentContext,
    db: Session = Depends(get_db),
) -> SendOwnerStatementResponse:
    result = dispatch_statement_email(
        db,
        company_id=context.company.id,
        owner_id=payload.owner_id,
        year=payload.year,
        month=payload.month,
        language=payload.language,
    )
    return SendOwnerStatementResponse(**result)


@analytics_router.post(
    "/owner-statements/share-link",
    response_model=OwnerStatementShareLinkResponse,
    summary="Generate a secure shareable link for an owner statement",
)
def get_owner_statement_share_link_endpoint(
    payload: GetOwnerStatementShareLinkRequest,
    context: CurrentContext,
    db: Session = Depends(get_db),
) -> OwnerStatementShareLinkResponse:
    raw_token, token_obj = create_or_get_statement_token(
        db,
        company_id=context.company.id,
        owner_id=payload.owner_id,
        year=payload.year,
        month=payload.month,
    )
    base_url = settings.frontend_base_url.rstrip("/")
    portal_url = f"{base_url}/owner/statements?token={raw_token}"
    return OwnerStatementShareLinkResponse(
        owner_id=payload.owner_id,
        year=payload.year,
        month=payload.month,
        portal_url=portal_url,
        token=raw_token,
        expires_at=token_obj.expires_at.isoformat(),
    )


# -------------------------------------------------------------------------
# Public Owner Portal Endpoints (Token-Secured)
# -------------------------------------------------------------------------


@public_owner_router.get(
    "/data",
    response_model=OwnerMonthlyStatementResponse,
    summary="Fetch owner statement data via secure access token",
)
def get_public_owner_statement_data(
    token: str = Query(..., min_length=16, description="Cryptographic access token"),
    db: Session = Depends(get_db),
) -> OwnerMonthlyStatementResponse:
    token_record = verify_statement_token(db, token)
    owner = db.get(Owner, token_record.owner_id)
    if not owner or owner.company_id != token_record.company_id:
        raise ApiProblem(
            status=404,
            title="Owner not found",
            detail="The owner associated with this token could not be found.",
            code="owner_not_found",
        )
    company = db.get(Company, token_record.company_id)
    currency = company.default_currency if company else "TND"
    return calculate_owner_statement(
        db,
        company_id=token_record.company_id,
        owner=owner,
        year=token_record.year,
        month=token_record.month,
        currency=currency,
    )


@public_owner_router.get(
    "/html",
    response_class=HTMLResponse,
    summary="Fetch branded printable HTML statement via secure access token",
)
def get_public_owner_statement_html(
    token: str = Query(..., min_length=16, description="Cryptographic access token"),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    token_record = verify_statement_token(db, token)
    owner = db.get(Owner, token_record.owner_id)
    if not owner or owner.company_id != token_record.company_id:
        raise ApiProblem(status=404, title="Owner not found", detail="Owner not found.", code="owner_not_found")
    company = db.get(Company, token_record.company_id)
    company_name = company.name if company else "Vayca Operations"
    currency = company.default_currency if company else "TND"
    statement = calculate_owner_statement(
        db,
        company_id=token_record.company_id,
        owner=owner,
        year=token_record.year,
        month=token_record.month,
        currency=currency,
    )
    rendered_html = render_owner_statement_html(statement, company_name=company_name)
    return HTMLResponse(content=rendered_html)


@public_owner_router.get(
    "/export",
    summary="Export owner statement as CSV via secure access token",
)
def export_public_owner_statement_csv(
    token: str = Query(..., min_length=16, description="Cryptographic access token"),
    db: Session = Depends(get_db),
) -> Response:
    token_record = verify_statement_token(db, token)
    owner = db.get(Owner, token_record.owner_id)
    if not owner or owner.company_id != token_record.company_id:
        raise ApiProblem(status=404, title="Owner not found", detail="Owner not found.", code="owner_not_found")
    company = db.get(Company, token_record.company_id)
    currency = company.default_currency if company else "TND"
    statement = calculate_owner_statement(
        db,
        company_id=token_record.company_id,
        owner=owner,
        year=token_record.year,
        month=token_record.month,
        currency=currency,
    )
    csv_content = export_owner_statement_csv(statement)
    filename = f"statement_{statement.owner_name.replace(' ', '_')}_{token_record.year}_{token_record.month:02d}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

