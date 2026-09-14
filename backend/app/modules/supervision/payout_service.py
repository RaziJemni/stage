import csv
from datetime import datetime, timezone
from decimal import Decimal
import io
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.enums import BookingRecordType, BookingStatus, TicketStatus
from app.modules.calendar.models import Booking
from app.modules.maintenance.models import Ticket
from app.modules.properties.models import Owner, Property
from app.modules.supervision.schemas import (
    CompanyStatementsOverviewResponse,
    OwnerMonthlyStatementResponse,
    OwnerStatementPropertySummary,
    StatementBookingItem,
    StatementTicketItem,
)


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    if month < 1 or month > 12:
        raise ApiProblem(
            status=422,
            title="Invalid month",
            detail="Month must be an integer between 1 and 12.",
            code="invalid_month",
        )
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end


def calculate_owner_statement(
    db: Session,
    *,
    company_id: UUID,
    owner: Owner,
    year: int,
    month: int,
    currency: str = "TND",
) -> OwnerMonthlyStatementResponse:
    month_start, month_end = _month_bounds(year, month)

    properties = list(
        db.scalars(
            select(Property)
            .where(Property.company_id == company_id, Property.owner_id == owner.id)
            .order_by(Property.name.asc())
        ).all()
    )

    property_summaries: list[OwnerStatementPropertySummary] = []
    all_booking_items: list[StatementBookingItem] = []
    all_ticket_items: list[StatementTicketItem] = []

    for prop in properties:
        # 1. Bookings completed in this month (checkout in month range)
        bookings = list(
            db.scalars(
                select(Booking)
                .where(
                    Booking.company_id == company_id,
                    Booking.property_id == prop.id,
                    Booking.record_type == BookingRecordType.RESERVATION,
                    Booking.status != BookingStatus.CANCELLED,
                    Booking.check_out >= month_start,
                    Booking.check_out < month_end,
                )
                .order_by(Booking.check_in.asc())
            ).all()
        )

        prop_gross = Decimal("0.000")
        for b in bookings:
            t_amt = Decimal(str(b.total_amount)) if b.total_amount is not None else Decimal("0.000")
            p_amt = Decimal(str(b.paid_amount)) if b.paid_amount is not None else Decimal("0.000")
            prop_gross += t_amt
            all_booking_items.append(
                StatementBookingItem(
                    booking_id=b.id,
                    property_id=prop.id,
                    property_name=prop.name,
                    guest_name=b.guest_name,
                    source_type=b.source_type.value if hasattr(b.source_type, "value") else str(b.source_type),
                    check_in=b.check_in.isoformat(),
                    check_out=b.check_out.isoformat(),
                    total_amount=t_amt,
                    paid_amount=p_amt,
                    payment_status=b.payment_status.value if (b.payment_status and hasattr(b.payment_status, "value")) else (str(b.payment_status) if b.payment_status else None),
                )
            )

        # 2. Resolved tickets during this month
        tickets = list(
            db.scalars(
                select(Ticket)
                .where(
                    Ticket.company_id == company_id,
                    Ticket.property_id == prop.id,
                    Ticket.status == TicketStatus.RESOLVED,
                    Ticket.resolved_at >= month_start,
                    Ticket.resolved_at < month_end,
                )
                .order_by(Ticket.resolved_at.asc())
            ).all()
        )

        prop_maint = Decimal("0.000")
        for t in tickets:
            c_amt = Decimal(str(t.cost)) if t.cost is not None else Decimal("0.000")
            prop_maint += c_amt
            all_ticket_items.append(
                StatementTicketItem(
                    ticket_id=t.id,
                    property_id=prop.id,
                    property_name=prop.name,
                    title=t.title,
                    category=t.category,
                    resolved_at=t.resolved_at.isoformat() if t.resolved_at else None,
                    cost=c_amt,
                )
            )

        comm_rate = Decimal(str(owner.commission_percentage))
        prop_comm = (prop_gross * comm_rate / Decimal("100")).quantize(Decimal("0.001"))
        prop_net = (prop_gross - prop_comm - prop_maint).quantize(Decimal("0.001"))

        property_summaries.append(
            OwnerStatementPropertySummary(
                property_id=prop.id,
                property_name=prop.name,
                bookings_count=len(bookings),
                gross_revenue=prop_gross.quantize(Decimal("0.001")),
                commission_percentage=comm_rate,
                commission_amount=prop_comm,
                maintenance_expenses=prop_maint.quantize(Decimal("0.001")),
                net_payout=prop_net,
            )
        )

    total_gross = sum((p.gross_revenue for p in property_summaries), Decimal("0.000")).quantize(Decimal("0.001"))
    total_comm = sum((p.commission_amount for p in property_summaries), Decimal("0.000")).quantize(Decimal("0.001"))
    total_maint = sum((p.maintenance_expenses for p in property_summaries), Decimal("0.000")).quantize(Decimal("0.001"))
    total_net = (total_gross - total_comm - total_maint).quantize(Decimal("0.001"))

    return OwnerMonthlyStatementResponse(
        owner_id=owner.id,
        owner_name=owner.name,
        email=owner.email,
        phone=owner.phone,
        commission_percentage=Decimal(str(owner.commission_percentage)),
        year=year,
        month=month,
        currency=currency,
        properties_count=len(properties),
        bookings_count=len(all_booking_items),
        gross_revenue=total_gross,
        commission_amount=total_comm,
        maintenance_expenses=total_maint,
        net_payout=total_net,
        properties=property_summaries,
        bookings=all_booking_items,
        maintenance_tickets=all_ticket_items,
    )


def get_company_owner_statements(
    db: Session,
    *,
    company_id: UUID,
    year: int,
    month: int,
    currency: str = "TND",
) -> CompanyStatementsOverviewResponse:
    owners = list(
        db.scalars(
            select(Owner)
            .where(Owner.company_id == company_id)
            .order_by(Owner.name.asc())
        ).all()
    )

    statements = [
        calculate_owner_statement(
            db,
            company_id=company_id,
            owner=owner,
            year=year,
            month=month,
            currency=currency,
        )
        for owner in owners
    ]

    total_props = sum(s.properties_count for s in statements)
    total_gross = sum((s.gross_revenue for s in statements), Decimal("0.000")).quantize(Decimal("0.001"))
    total_comm = sum((s.commission_amount for s in statements), Decimal("0.000")).quantize(Decimal("0.001"))
    total_maint = sum((s.maintenance_expenses for s in statements), Decimal("0.000")).quantize(Decimal("0.001"))
    total_net = sum((s.net_payout for s in statements), Decimal("0.000")).quantize(Decimal("0.001"))

    return CompanyStatementsOverviewResponse(
        year=year,
        month=month,
        currency=currency,
        total_properties=total_props,
        total_owners=len(owners),
        total_gross_revenue=total_gross,
        total_commission=total_comm,
        total_maintenance_expenses=total_maint,
        total_net_payout=total_net,
        statements=statements,
    )


def get_single_owner_statement(
    db: Session,
    *,
    company_id: UUID,
    owner_id: UUID,
    year: int,
    month: int,
    currency: str = "TND",
) -> OwnerMonthlyStatementResponse:
    owner = db.scalar(
        select(Owner).where(Owner.company_id == company_id, Owner.id == owner_id)
    )
    if not owner:
        raise ApiProblem(
            status=404,
            title="Owner not found",
            detail="Owner does not exist or does not belong to your company.",
            code="owner_not_found",
        )
    return calculate_owner_statement(
        db,
        company_id=company_id,
        owner=owner,
        year=year,
        month=month,
        currency=currency,
    )


def export_owner_statement_csv(statement: OwnerMonthlyStatementResponse) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Header Information
    writer.writerow(["VAYCA - OWNER PAYOUT STATEMENT"])
    writer.writerow(["Owner Name", statement.owner_name])
    writer.writerow(["Contact Email", statement.email or "-"])
    writer.writerow(["Contact Phone", statement.phone or "-"])
    writer.writerow(["Statement Period", f"{statement.year}-{statement.month:02d}"])
    writer.writerow(["Commission Rate", f"{statement.commission_percentage}%"])
    writer.writerow(["Currency", statement.currency])
    writer.writerow([])

    # 2. Executive Financial Summary
    writer.writerow(["FINANCIAL SUMMARY"])
    writer.writerow(["Total Gross Booking Revenue", f"{statement.gross_revenue:.3f} {statement.currency}"])
    writer.writerow(["Agency Commission Deduction", f"{statement.commission_amount:.3f} {statement.currency}"])
    writer.writerow(["Maintenance Expenses Deducted", f"{statement.maintenance_expenses:.3f} {statement.currency}"])
    writer.writerow(["Net Payout Due", f"{statement.net_payout:.3f} {statement.currency}"])
    writer.writerow([])

    # 3. Property Breakdown
    writer.writerow(["PROPERTY BREAKDOWN"])
    writer.writerow([
        "Property Name",
        "Completed Stays",
        f"Gross Revenue ({statement.currency})",
        "Commission Rate",
        f"Commission Amount ({statement.currency})",
        f"Maintenance Costs ({statement.currency})",
        f"Net Payout ({statement.currency})",
    ])
    for prop in statement.properties:
        writer.writerow([
            prop.property_name,
            prop.bookings_count,
            f"{prop.gross_revenue:.3f}",
            f"{prop.commission_percentage}%",
            f"{prop.commission_amount:.3f}",
            f"{prop.maintenance_expenses:.3f}",
            f"{prop.net_payout:.3f}",
        ])
    writer.writerow([])

    # 4. Itemized Bookings
    writer.writerow(["COMPLETED BOOKINGS"])
    writer.writerow([
        "Property",
        "Guest Name",
        "Channel / Source",
        "Check-in",
        "Check-out",
        f"Total Amount ({statement.currency})",
        f"Paid Amount ({statement.currency})",
        "Payment Status",
    ])
    for b in statement.bookings:
        writer.writerow([
            b.property_name,
            b.guest_name or "Guest",
            b.source_type,
            b.check_in[:10],
            b.check_out[:10],
            f"{b.total_amount:.3f}",
            f"{b.paid_amount:.3f}",
            b.payment_status or "-",
        ])
    writer.writerow([])

    # 5. Maintenance Expenses
    writer.writerow(["MAINTENANCE EXPENSES"])
    writer.writerow([
        "Property",
        "Ticket Title",
        "Category",
        "Resolved Date",
        f"Cost ({statement.currency})",
    ])
    for t in statement.maintenance_tickets:
        writer.writerow([
            t.property_name,
            t.title,
            t.category or "General",
            t.resolved_at[:10] if t.resolved_at else "-",
            f"{t.cost:.3f}",
        ])

    return output.getvalue()
