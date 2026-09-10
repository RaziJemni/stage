from datetime import UTC, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import BookingRecordType, BookingSource, BookingStatus, PropertyStatus
from app.modules.calendar.models import Booking
from app.modules.identity.models import Company
from app.modules.properties.models import Property
from app.modules.supervision.schemas import (
    ChannelMetric,
    PortfolioAnalyticsResponse,
    PropertyOccupancyInsight,
)

CHANNEL_DISPLAY_NAMES: dict[str, str] = {
    BookingSource.MANUAL.value: "Direct / Manual",
    BookingSource.DIRECT.value: "Direct Booking",
    BookingSource.AIRBNB.value: "Airbnb",
    BookingSource.BOOKING_COM.value: "Booking.com",
    BookingSource.OTHER.value: "Other Channel",
}


def get_portfolio_analytics(
    db: Session,
    *,
    company_id: UUID,
    window_days: int = 30,
) -> PortfolioAnalyticsResponse:
    company = db.scalar(select(Company).where(Company.id == company_id))
    tz_str = company.timezone if company and company.timezone else "Africa/Tunis"
    try:
        company_tz = ZoneInfo(tz_str)
    except ZoneInfoNotFoundError:
        company_tz = UTC

    now_local = datetime.now(company_tz)
    start_date = now_local.date()
    end_date = start_date + timedelta(days=window_days)

    window_start_dt = datetime.combine(start_date, time.min, company_tz)
    window_end_dt = datetime.combine(end_date, time.min, company_tz)

    properties = list(
        db.scalars(
            select(Property)
            .where(
                Property.company_id == company_id,
                Property.status == PropertyStatus.ACTIVE,
            )
            .order_by(Property.name.asc())
        )
    )
    total_properties = len(properties)
    if total_properties == 0:
        return PortfolioAnalyticsResponse(
            window_days=window_days,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_properties=0,
            occupancy_rate=0.0,
            total_booked_nights=0,
            total_reservations=0,
            average_length_of_stay=0.0,
            channel_distribution=[],
            property_insights=[],
        )

    bookings = list(
        db.scalars(
            select(Booking)
            .where(
                Booking.company_id == company_id,
                Booking.record_type == BookingRecordType.RESERVATION,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_in < window_end_dt,
                Booking.check_out > window_start_dt,
            )
        )
    )

    property_ids = {p.id for p in properties}
    active_bookings = [b for b in bookings if b.property_id in property_ids]

    total_booked_nights = 0
    property_nights: dict[UUID, int] = {p.id: 0 for p in properties}
    channel_counts: dict[str, int] = {}
    channel_nights: dict[str, int] = {}
    total_stay_nights = 0

    for b in active_bookings:
        b_check_in_date = b.check_in.astimezone(company_tz).date()
        b_check_out_date = b.check_out.astimezone(company_tz).date()
        stay_nights = max(1, (b_check_out_date - b_check_in_date).days)
        total_stay_nights += stay_nights

        eff_start = max(b_check_in_date, start_date)
        eff_end = min(b_check_out_date, end_date)
        overlap_nights = max(0, (eff_end - eff_start).days)

        total_booked_nights += overlap_nights
        property_nights[b.property_id] = property_nights.get(b.property_id, 0) + overlap_nights

        src_key = b.source_type.value if hasattr(b.source_type, "value") else str(b.source_type)
        channel_counts[src_key] = channel_counts.get(src_key, 0) + 1
        channel_nights[src_key] = channel_nights.get(src_key, 0) + overlap_nights

    total_available_nights = total_properties * window_days
    occupancy_rate = (
        round(min(100.0, (total_booked_nights / total_available_nights) * 100), 1)
        if total_available_nights > 0
        else 0.0
    )

    total_reservations = len(active_bookings)
    average_length_of_stay = (
        round(total_stay_nights / total_reservations, 1) if total_reservations > 0 else 0.0
    )

    channel_distribution: list[ChannelMetric] = []
    for src_key, count in sorted(
        channel_counts.items(),
        key=lambda item: channel_nights.get(item[0], 0),
        reverse=True,
    ):
        nights = channel_nights.get(src_key, 0)
        percentage = (
            round((nights / total_booked_nights) * 100, 1) if total_booked_nights > 0 else 0.0
        )
        display_name = CHANNEL_DISPLAY_NAMES.get(src_key, src_key.replace("_", " ").title())
        channel_distribution.append(
            ChannelMetric(
                channel=display_name,
                channel_key=src_key,
                count=count,
                nights=nights,
                percentage=percentage,
            )
        )

    property_insights: list[PropertyOccupancyInsight] = []
    for p in properties:
        p_nights = property_nights.get(p.id, 0)
        p_occupancy = round(min(100.0, (p_nights / window_days) * 100), 1)
        property_insights.append(
            PropertyOccupancyInsight(
                property_id=p.id,
                property_name=p.name,
                booked_nights=p_nights,
                occupancy_rate=p_occupancy,
            )
        )

    return PortfolioAnalyticsResponse(
        window_days=window_days,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        total_properties=total_properties,
        occupancy_rate=occupancy_rate,
        total_booked_nights=total_booked_nights,
        total_reservations=total_reservations,
        average_length_of_stay=average_length_of_stay,
        channel_distribution=channel_distribution,
        property_insights=property_insights,
    )
