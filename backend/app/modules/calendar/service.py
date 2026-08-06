from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from ipaddress import ip_address
from socket import getaddrinfo
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID
from zoneinfo import ZoneInfo

from icalendar import Calendar
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    ChannelType,
    PropertyStatus,
    SyncStatus,
)
from app.modules.calendar.models import Booking, CalendarSyncRun
from app.modules.calendar.schemas import (
    CalendarFeedRequest,
    ManualBookingCreateRequest,
    ManualBookingUpdateRequest,
)
from app.modules.properties.models import Channel, Property


ACTIVE_BOOKING_STATUSES = (BookingStatus.TENTATIVE, BookingStatus.CONFIRMED)


def create_manual_booking(
    db: Session, *, company_id: UUID, payload: ManualBookingCreateRequest
) -> Booking:
    _get_active_property(db, company_id=company_id, property_id=payload.property_id)
    booking = Booking(
        company_id=company_id,
        property_id=payload.property_id,
        source_type=payload.source_type,
        record_type=payload.record_type,
        status=payload.status,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guest_name=payload.guest_name,
        guest_contact=payload.guest_contact,
        notes=payload.notes,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def update_manual_booking(
    db: Session,
    *,
    company_id: UUID,
    booking_id: UUID,
    payload: ManualBookingUpdateRequest,
) -> Booking:
    booking = _get_manual_booking(db, company_id=company_id, booking_id=booking_id)
    if booking.status is BookingStatus.CANCELLED:
        raise ApiProblem(
            status=409,
            title="Booking cancelled",
            detail="Cancelled bookings cannot be edited.",
            code="booking_cancelled",
        )

    updates = payload.model_dump(exclude_unset=True)
    check_in = updates.get("check_in", booking.check_in)
    check_out = updates.get("check_out", booking.check_out)
    if check_out <= check_in:
        raise ApiProblem(
            status=422,
            title="Invalid booking dates",
            detail="Check-out must be after check-in.",
            code="booking_date_range_invalid",
        )
    for field, value in updates.items():
        setattr(booking, field, value)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_manual_booking(
    db: Session, *, company_id: UUID, booking_id: UUID
) -> Booking:
    booking = _get_manual_booking(db, company_id=company_id, booking_id=booking_id)
    if booking.status is BookingStatus.CANCELLED:
        raise ApiProblem(
            status=409,
            title="Booking cancelled",
            detail="This booking is already cancelled.",
            code="booking_cancelled",
        )
    booking.status = BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)
    return booking


def is_available(
    db: Session,
    *,
    company_id: UUID,
    property_id: UUID,
    check_in: datetime,
    check_out: datetime,
) -> bool:
    _get_active_property(db, company_id=company_id, property_id=property_id)
    if check_out <= check_in:
        raise ApiProblem(
            status=422,
            title="Invalid availability range",
            detail="Check-out must be after check-in.",
            code="availability_date_range_invalid",
        )
    overlapping_booking_exists = db.scalar(
        select(
            exists().where(
                Booking.company_id == company_id,
                Booking.property_id == property_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
        )
    )
    return not bool(overlapping_booking_exists)


class CalendarImportError(Exception):
    pass


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise CalendarImportError("Calendar feed redirects are not supported")


@dataclass(frozen=True)
class ImportedEvent:
    external_event_id: str
    check_in: datetime
    check_out: datetime
    status: BookingStatus
    record_type: BookingRecordType
    guest_name: str | None
    external_updated_at: datetime | None
    raw_payload: dict[str, str]


def configure_calendar_feed(
    db: Session, *, company_id: UUID, property_id: UUID, payload: CalendarFeedRequest
) -> Channel:
    property_obj = db.scalar(
        select(Property).where(Property.company_id == company_id, Property.id == property_id)
    )
    if property_obj is None:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )
    if property_obj.status is PropertyStatus.ARCHIVED:
        raise ApiProblem(
            status=409,
            title="Property archived",
            detail="Archived properties cannot receive calendar feeds.",
            code="property_archived",
        )

    external_listing_id = payload.external_listing_id.strip() if payload.external_listing_id else None
    statement = select(Channel).where(
        Channel.company_id == company_id,
        Channel.property_id == property_id,
        Channel.channel_type == payload.channel_type,
    )
    statement = statement.where(
        Channel.external_listing_id == external_listing_id
        if external_listing_id is not None
        else Channel.external_listing_id.is_(None)
    )
    channel = db.scalar(statement)
    if channel is None:
        channel = Channel(
            company_id=company_id,
            property_id=property_id,
            channel_type=payload.channel_type,
            external_listing_id=external_listing_id,
            calendar_url=str(payload.calendar_url),
        )
        db.add(channel)
    else:
        channel.calendar_url = str(payload.calendar_url)
        channel.is_active = True
        channel.last_error_summary = None

    db.commit()
    db.refresh(channel)
    return channel


def get_channel(db: Session, *, company_id: UUID, channel_id: UUID) -> Channel:
    channel = db.scalar(
        select(Channel).where(Channel.company_id == company_id, Channel.id == channel_id)
    )
    if channel is None:
        raise ApiProblem(
            status=404,
            title="Calendar feed not found",
            detail="Calendar feed does not exist or does not belong to your company.",
            code="calendar_feed_not_found",
        )
    return channel


def list_sync_runs(db: Session, *, company_id: UUID, channel_id: UUID) -> list[CalendarSyncRun]:
    get_channel(db, company_id=company_id, channel_id=channel_id)
    return list(
        db.scalars(
            select(CalendarSyncRun)
            .where(CalendarSyncRun.company_id == company_id, CalendarSyncRun.channel_id == channel_id)
            .order_by(CalendarSyncRun.started_at.desc())
        )
    )


def sync_channel(
    db: Session,
    *,
    company_id: UUID,
    channel_id: UUID,
    fetcher: Callable[[str], bytes] | None = None,
) -> CalendarSyncRun:
    channel = get_channel(db, company_id=company_id, channel_id=channel_id)
    if not channel.is_active or not channel.calendar_url:
        raise CalendarImportError("Calendar feed is inactive or unconfigured")

    sync_run = CalendarSyncRun(company_id=company_id, channel_id=channel_id, status=SyncStatus.RUNNING)
    db.add(sync_run)
    db.commit()
    db.refresh(sync_run)

    try:
        events = parse_calendar_events(
            (fetcher or fetch_calendar_bytes)(channel.calendar_url),
            timezone_name=_property_timezone(db, company_id, channel.property_id),
        )
        for event in events:
            outcome = _upsert_event(db, channel=channel, event=event)
            if outcome == "created":
                sync_run.created_count += 1
            elif outcome == "updated":
                sync_run.updated_count += 1
            elif outcome == "cancelled":
                sync_run.cancelled_count += 1
            else:
                sync_run.rejected_count += 1

        completed_at = datetime.now(timezone.utc)
        sync_run.status = SyncStatus.SUCCEEDED
        sync_run.completed_at = completed_at
        channel.last_successful_sync_at = completed_at
        channel.last_error_summary = None
        db.commit()
    except Exception as exc:
        db.rollback()
        sync_run = db.get(CalendarSyncRun, sync_run.id)
        channel = db.get(Channel, channel.id)
        assert sync_run is not None and channel is not None
        sync_run.status = SyncStatus.FAILED
        sync_run.completed_at = datetime.now(timezone.utc)
        sync_run.error_summary = _safe_error_summary(exc)
        channel.last_error_summary = sync_run.error_summary
        db.commit()

    db.refresh(sync_run)
    return sync_run


def fetch_calendar_bytes(calendar_url: str) -> bytes:
    parsed = urlparse(calendar_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise CalendarImportError("Calendar URL must be an absolute HTTP or HTTPS URL")
    _require_public_host(parsed.hostname)
    request = Request(calendar_url, headers={"Accept": "text/calendar", "User-Agent": "VaycaCalendarImporter/1.0"})
    try:
        with build_opener(_RejectRedirects).open(request, timeout=10) as response:
            if response.status != 200:
                raise CalendarImportError("Calendar feed did not return a successful response")
            content = response.read(settings.calendar_feed_max_bytes + 1)
    except HTTPError as exc:
        raise CalendarImportError("Calendar feed request failed") from exc
    except URLError as exc:
        raise CalendarImportError("Calendar feed is unavailable") from exc
    if len(content) > settings.calendar_feed_max_bytes:
        raise CalendarImportError("Calendar feed exceeds the configured size limit")
    return content


def parse_calendar_events(content: bytes, *, timezone_name: str) -> list[ImportedEvent]:
    try:
        calendar = Calendar.from_ical(content)
    except Exception as exc:
        raise CalendarImportError("Calendar feed is not valid iCalendar content") from exc
    if calendar.name != "VCALENDAR":
        raise CalendarImportError("Calendar feed is not valid iCalendar content")

    events: list[ImportedEvent] = []
    for component in calendar.walk("VEVENT"):
        uid = _as_text(component.get("UID"))
        start = _component_datetime(component.get("DTSTART"), timezone_name)
        end = _component_datetime(component.get("DTEND"), timezone_name)
        if _is_same_day_all_day_event(component) and start is not None and end == start:
            end = start + timedelta(days=1)
        if not uid or start is None or end is None or end <= start:
            continue
        summary = _as_text(component.get("SUMMARY"))
        event_status = BookingStatus.CANCELLED if _as_text(component.get("STATUS")).upper() == "CANCELLED" else BookingStatus.CONFIRMED
        events.append(
            ImportedEvent(
                external_event_id=uid,
                check_in=start,
                check_out=end,
                status=event_status,
                record_type=_record_type(summary),
                guest_name=summary or None,
                external_updated_at=_component_datetime(component.get("LAST-MODIFIED"), timezone_name),
                raw_payload={"uid": uid, "summary": summary, "status": _as_text(component.get("STATUS"))},
            )
        )
    return events


def _upsert_event(db: Session, *, channel: Channel, event: ImportedEvent) -> str:
    booking = db.scalar(
        select(Booking).where(
            Booking.company_id == channel.company_id,
            Booking.channel_id == channel.id,
            Booking.external_event_id == event.external_event_id,
        )
    )
    if booking is None:
        db.add(Booking(
            company_id=channel.company_id, property_id=channel.property_id, channel_id=channel.id,
            source_type=_booking_source(channel.channel_type), external_event_id=event.external_event_id,
            guest_name=event.guest_name, check_in=event.check_in, check_out=event.check_out,
            status=event.status, record_type=event.record_type, external_updated_at=event.external_updated_at,
            raw_payload=event.raw_payload,
        ))
        return "created"
    values = (event.guest_name, event.check_in, event.check_out, event.status, event.record_type, event.external_updated_at, event.raw_payload)
    existing = (booking.guest_name, booking.check_in, booking.check_out, booking.status, booking.record_type, booking.external_updated_at, booking.raw_payload)
    if values == existing:
        return "unchanged"
    booking.guest_name, booking.check_in, booking.check_out = event.guest_name, event.check_in, event.check_out
    booking.status, booking.record_type, booking.external_updated_at, booking.raw_payload = event.status, event.record_type, event.external_updated_at, event.raw_payload
    return "cancelled" if event.status is BookingStatus.CANCELLED else "updated"


def _property_timezone(db: Session, company_id: UUID, property_id: UUID) -> str:
    return db.scalar(select(Property.timezone).where(Property.company_id == company_id, Property.id == property_id)) or "UTC"


def _component_datetime(value: object, timezone_name: str) -> datetime | None:
    if value is None or not hasattr(value, "dt"):
        return None
    parsed = value.dt
    if isinstance(parsed, datetime):
        return (parsed.replace(tzinfo=ZoneInfo(timezone_name)) if parsed.tzinfo is None else parsed).astimezone(timezone.utc)
    if isinstance(parsed, date):
        return datetime.combine(parsed, time.min, ZoneInfo(timezone_name)).astimezone(timezone.utc)
    return None


def _is_same_day_all_day_event(component: object) -> bool:
    start = component.get("DTSTART")
    end = component.get("DTEND")
    return bool(
        start
        and end
        and isinstance(start.dt, date)
        and not isinstance(start.dt, datetime)
        and isinstance(end.dt, date)
        and not isinstance(end.dt, datetime)
    )


def _record_type(summary: str) -> BookingRecordType:
    return BookingRecordType.BLOCKED_PERIOD if any(word in summary.lower() for word in ("block", "unavailable", "closed")) else BookingRecordType.RESERVATION


def _booking_source(channel_type: ChannelType) -> BookingSource:
    return {ChannelType.AIRBNB: BookingSource.AIRBNB, ChannelType.BOOKING_COM: BookingSource.BOOKING_COM}.get(channel_type, BookingSource.OTHER)


def _as_text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _safe_error_summary(exc: Exception) -> str:
    message = str(exc).strip() or "Calendar import failed"
    return message[:500]


def _require_public_host(hostname: str) -> None:
    try:
        addresses = {result[4][0] for result in getaddrinfo(hostname, None)}
    except OSError as exc:
        raise CalendarImportError("Calendar host cannot be resolved") from exc
    for address in addresses:
        parsed_address = ip_address(address)
        if not parsed_address.is_global:
            raise CalendarImportError("Calendar URL must not target a private or local network")


def _get_active_property(db: Session, *, company_id: UUID, property_id: UUID) -> Property:
    property_obj = db.scalar(
        select(Property).where(
            Property.company_id == company_id,
            Property.id == property_id,
        )
    )
    if property_obj is None:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )
    if property_obj.status is PropertyStatus.ARCHIVED:
        raise ApiProblem(
            status=409,
            title="Property archived",
            detail="Archived properties cannot receive new bookings or availability checks.",
            code="property_archived",
        )
    return property_obj


def _get_manual_booking(db: Session, *, company_id: UUID, booking_id: UUID) -> Booking:
    booking = db.scalar(
        select(Booking).where(
            Booking.company_id == company_id,
            Booking.id == booking_id,
            Booking.source_type.in_((BookingSource.DIRECT, BookingSource.MANUAL)),
        )
    )
    if booking is None:
        raise ApiProblem(
            status=404,
            title="Booking not found",
            detail="Booking does not exist or does not belong to your company.",
            code="booking_not_found",
        )
    return booking
