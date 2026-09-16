from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WhatsAppIntegrationHealthResponse(BaseModel):
    """Safe WhatsApp mode information for the Settings integrations screen."""

    model_config = ConfigDict(extra="forbid")

    integration: Literal["whatsapp"] = "whatsapp"
    mode: Literal["simulator", "test", "production"]
    health_status: Literal["simulator", "test", "unconfigured", "healthy"]
    detail: str


class ChannelMetric(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: str
    channel_key: str
    count: int = Field(ge=0)
    nights: int = Field(ge=0)
    percentage: float = Field(ge=0.0, le=100.0)


class PropertyOccupancyInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    property_id: UUID
    property_name: str
    booked_nights: int = Field(ge=0)
    available_nights: int = Field(ge=0, default=0)
    blocked_nights: int = Field(ge=0, default=0)
    occupancy_rate: float = Field(ge=0.0, le=100.0)


class PortfolioAnalyticsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    window_days: int = Field(gt=0)
    start_date: str
    end_date: str
    property_id: UUID | None = None
    total_properties: int = Field(ge=0)
    occupancy_rate: float = Field(ge=0.0, le=100.0)
    total_booked_nights: int = Field(ge=0)
    total_available_nights: int = Field(ge=0, default=0)
    total_blocked_nights: int = Field(ge=0, default=0)
    total_reservations: int = Field(ge=0)
    average_length_of_stay: float = Field(ge=0.0)
    channel_distribution: list[ChannelMetric]
    property_insights: list[PropertyOccupancyInsight]


class StatementBookingItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    booking_id: UUID
    property_id: UUID
    property_name: str
    guest_name: str | None
    source_type: str
    check_in: str
    check_out: str
    total_amount: Decimal
    paid_amount: Decimal
    payment_status: str | None


class StatementTicketItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: UUID
    property_id: UUID
    property_name: str
    title: str
    category: str | None
    resolved_at: str | None
    cost: Decimal


class OwnerStatementPropertySummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    property_id: UUID
    property_name: str
    bookings_count: int
    gross_revenue: Decimal
    commission_percentage: Decimal
    commission_amount: Decimal
    maintenance_expenses: Decimal
    net_payout: Decimal


class OwnerMonthlyStatementResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    owner_id: UUID
    owner_name: str
    email: str | None = None
    phone: str | None = None
    commission_percentage: Decimal
    year: int
    month: int
    currency: str = "TND"
    properties_count: int
    bookings_count: int
    gross_revenue: Decimal
    commission_amount: Decimal
    maintenance_expenses: Decimal
    net_payout: Decimal
    properties: list[OwnerStatementPropertySummary]
    bookings: list[StatementBookingItem]
    maintenance_tickets: list[StatementTicketItem]


class CompanyStatementsOverviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year: int
    month: int
    currency: str = "TND"
    total_properties: int
    total_owners: int
    total_gross_revenue: Decimal
    total_commission: Decimal
    total_maintenance_expenses: Decimal
    total_net_payout: Decimal
    statements: list[OwnerMonthlyStatementResponse]
