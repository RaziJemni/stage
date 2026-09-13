from collections import defaultdict
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
from sqlalchemy import and_, exists, func, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import PageParams
from app.core.config import settings
from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    CalendarFeedHealthStatus,
    ChannelType,
    ConflictStatus,
    PaymentMethod,
    PaymentStatus,
    PropertyStatus,
    SyncStatus,
)
from app.modules.calendar.models import (
    Booking,
    BookingConflict,
    BookingConflictBooking,
    CalendarSyncRun,
)
from app.modules.calendar.schemas import (
    CalendarFeedRequest,
    ConflictAcknowledgeRequest,
    ManualBookingCreateRequest,
    ManualBookingUpdateRequest,
)
from app.modules.properties.models import Channel, Property


ACTIVE_BOOKING_STATUSES = (BookingStatus.TENTATIVE, BookingStatus.CONFIRMED)
ACTIVE_CONFLICT_STATUSES = (ConflictStatus.OPEN, ConflictStatus.ACKNOWLEDGED)


def reconcile_booking_conflicts(
    db: Session, *, company_id: UUID, property_id: UUID
) -> None:
    """Reconcile active pairwise overlaps for one property.

    Callers must hold the property row lock for the duration of the transaction.
    That lock serializes manual changes and feed imports and makes the existing
    association table sufficient to prevent duplicate active pair records.
    """
    active_bookings = list(
        db.scalars(
            select(Booking)
            .where(
                Booking.company_id == company_id,
                Booking.property_id == property_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            )
            .order_by(Booking.check_in, Booking.id)
        ).all()
    )

    active_pairs: dict[frozenset[UUID], tuple[Booking, Booking]] = {}
    for index, first in enumerate(active_bookings):
        for second in active_bookings[index + 1 :]:
            if first.check_in < second.check_out and first.check_out > second.check_in:
                pair = tuple(sorted((first, second), key=lambda booking: booking.id))
                active_pairs[frozenset((first.id, second.id))] = pair

    existing_rows = db.execute(
        select(BookingConflict, BookingConflictBooking)
        .join(
            BookingConflictBooking,
            and_(
                BookingConflictBooking.company_id == BookingConflict.company_id,
                BookingConflictBooking.conflict_id == BookingConflict.id,
            ),
        )
        .where(
            BookingConflict.company_id == company_id,
            BookingConflict.property_id == property_id,
        )
    ).all()
    conflict_bookings: dict[UUID, set[UUID]] = defaultdict(set)
    conflicts: dict[UUID, BookingConflict] = {}
    for conflict, association in existing_rows:
        conflicts[conflict.id] = conflict
        conflict_bookings[conflict.id].add(association.booking_id)

    active_conflicts_by_pair: dict[frozenset[UUID], list[BookingConflict]] = defaultdict(list)
    for conflict in conflicts.values():
        if conflict.status in ACTIVE_CONFLICT_STATUSES:
            booking_ids = conflict_bookings[conflict.id]
            if len(booking_ids) == 2:
                active_conflicts_by_pair[frozenset(booking_ids)].append(conflict)

    now = datetime.now(timezone.utc)
    for pair_key, (first, second) in active_pairs.items():
        active_conflicts = active_conflicts_by_pair.get(pair_key, [])
        if active_conflicts:
            # A duplicate should not be possible under the property lock, but
            # resolve any legacy duplicates while preserving their history.
            for duplicate in active_conflicts[1:]:
                duplicate.status = ConflictStatus.RESOLVED
                duplicate.resolved_at = now
                duplicate.resolved_by_user_id = None
            continue

        conflict = BookingConflict(
            company_id=company_id,
            property_id=property_id,
            status=ConflictStatus.OPEN,
            detected_at=now,
        )
        db.add(conflict)
        db.flush()
        db.add(
            BookingConflictBooking(
                company_id=company_id,
                conflict_id=conflict.id,
                booking_id=first.id,
            )
        )
        db.flush()
        db.add(
            BookingConflictBooking(
                company_id=company_id,
                conflict_id=conflict.id,
                booking_id=second.id,
            )
        )
        db.flush()

    current_pair_keys = set(active_pairs)
    for pair_key, active_conflicts in active_conflicts_by_pair.items():
        if pair_key in current_pair_keys:
            continue
        for conflict in active_conflicts:
            conflict.status = ConflictStatus.RESOLVED
            conflict.resolved_at = now
            conflict.resolved_by_user_id = None

    db.flush()


def list_booking_conflicts(
    db: Session,
    *,
    company_id: UUID,
    params: PageParams,
    property_id: UUID | None = None,
    status: ConflictStatus | None = None,
) -> tuple[list[tuple[BookingConflict, list[Booking]]], int]:
    statement = select(BookingConflict).where(BookingConflict.company_id == company_id)
    if property_id is not None:
        statement = statement.where(BookingConflict.property_id == property_id)
    if status is None:
        statement = statement.where(BookingConflict.status.in_(ACTIVE_CONFLICT_STATUSES))
    else:
        statement = statement.where(BookingConflict.status == status)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    conflicts = list(
        db.scalars(
            statement.order_by(BookingConflict.detected_at.desc(), BookingConflict.id.desc())
            .offset(params.offset)
            .limit(params.page_size)
        ).all()
    )
    return _attach_conflict_bookings(db, company_id=company_id, conflicts=conflicts), total


def get_booking_conflict(
    db: Session, *, company_id: UUID, conflict_id: UUID
) -> tuple[BookingConflict, list[Booking]]:
    conflict = db.scalar(
        select(BookingConflict).where(
            BookingConflict.company_id == company_id,
            BookingConflict.id == conflict_id,
        )
    )
    if conflict is None:
        raise _conflict_not_found()
    details = _attach_conflict_bookings(db, company_id=company_id, conflicts=[conflict])
    return details[0]


def acknowledge_booking_conflict(
    db: Session,
    *,
    company_id: UUID,
    conflict_id: UUID,
    user_id: UUID,
    payload: ConflictAcknowledgeRequest,
) -> tuple[BookingConflict, list[Booking]]:
    conflict = db.scalar(
        select(BookingConflict)
        .where(
            BookingConflict.company_id == company_id,
            BookingConflict.id == conflict_id,
        )
        .with_for_update()
    )
    if conflict is None:
        raise _conflict_not_found()
    if conflict.status is ConflictStatus.ACKNOWLEDGED:
        raise ApiProblem(
            status=409,
            title="Conflict already acknowledged",
            detail="This booking conflict has already been acknowledged.",
            code="conflict_already_acknowledged",
        )
    if conflict.status is not ConflictStatus.OPEN:
        raise ApiProblem(
            status=409,
            title="Conflict resolved",
            detail="Resolved booking conflicts cannot be acknowledged.",
            code="conflict_resolved",
        )

    conflict.status = ConflictStatus.ACKNOWLEDGED
    conflict.acknowledged_at = datetime.now(timezone.utc)
    conflict.acknowledged_by_user_id = user_id
    conflict.resolution_note = payload.resolution_note
    db.commit()
    db.refresh(conflict)
    return get_booking_conflict(db, company_id=company_id, conflict_id=conflict.id)


def _attach_conflict_bookings(
    db: Session,
    *,
    company_id: UUID,
    conflicts: list[BookingConflict],
) -> list[tuple[BookingConflict, list[Booking]]]:
    if not conflicts:
        return []
    conflict_ids = [conflict.id for conflict in conflicts]
    rows = db.execute(
        select(BookingConflictBooking.conflict_id, Booking)
        .join(
            Booking,
            and_(
                Booking.company_id == BookingConflictBooking.company_id,
                Booking.id == BookingConflictBooking.booking_id,
            ),
        )
        .where(
            BookingConflictBooking.company_id == company_id,
            BookingConflictBooking.conflict_id.in_(conflict_ids),
        )
        .order_by(Booking.check_in, Booking.id)
    ).all()
    bookings_by_conflict: dict[UUID, list[Booking]] = defaultdict(list)
    for conflict_id, booking in rows:
        bookings_by_conflict[conflict_id].append(booking)
    return [
        (conflict, bookings_by_conflict.get(conflict.id, [])) for conflict in conflicts
    ]


def _conflict_not_found() -> ApiProblem:
    return ApiProblem(
        status=404,
        title="Booking conflict not found",
        detail="Booking conflict does not exist or does not belong to your company.",
        code="booking_conflict_not_found",
    )


def list_bookings(
    db: Session,
    *,
    company_id: UUID,
    params: PageParams,
    range_start: datetime,
    range_end: datetime,
    property_id: UUID | None = None,
    source_type: BookingSource | None = None,
    status: BookingStatus | None = None,
) -> tuple[list[Booking], int]:
    statement = select(Booking).where(
        Booking.company_id == company_id,
        Booking.check_in < range_end,
        Booking.check_out > range_start,
    )
    if property_id is not None:
        statement = statement.where(Booking.property_id == property_id)
    if source_type is not None:
        statement = statement.where(Booking.source_type == source_type)
    if status is None:
        statement = statement.where(Booking.status.in_(ACTIVE_BOOKING_STATUSES))
    else:
        statement = statement.where(Booking.status == status)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    bookings = list(
        db.scalars(
            statement.order_by(Booking.check_in, Booking.id)
            .offset(params.offset)
            .limit(params.page_size)
        ).all()
    )
    return bookings, total


def get_booking(db: Session, *, company_id: UUID, booking_id: UUID) -> Booking:
    booking = db.scalar(
        select(Booking).where(
            Booking.company_id == company_id,
            Booking.id == booking_id,
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


def list_calendar_feed_health(
    db: Session,
    *,
    company_id: UUID,
    params: PageParams,
    property_id: UUID | None = None,
) -> tuple[list[tuple[Channel, CalendarSyncRun | None, CalendarFeedHealthStatus]], int]:
    statement = select(Channel).where(Channel.company_id == company_id)
    if property_id is not None:
        statement = statement.where(Channel.property_id == property_id)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    channels = list(
        db.scalars(
            statement.order_by(Channel.property_id, Channel.channel_type, Channel.id)
            .offset(params.offset)
            .limit(params.page_size)
        ).all()
    )

    now = datetime.now(timezone.utc)
    stale_after = timedelta(seconds=settings.calendar_sync_interval_seconds * 2)
    result: list[tuple[Channel, CalendarSyncRun | None, CalendarFeedHealthStatus]] = []
    for channel in channels:
        latest_run = db.scalar(
            select(CalendarSyncRun)
            .where(
                CalendarSyncRun.company_id == company_id,
                CalendarSyncRun.channel_id == channel.id,
            )
            .order_by(CalendarSyncRun.started_at.desc(), CalendarSyncRun.id.desc())
            .limit(1)
        )
        if not channel.is_active:
            health = CalendarFeedHealthStatus.INACTIVE
        elif latest_run is None:
            health = CalendarFeedHealthStatus.PENDING
        elif latest_run.status is SyncStatus.RUNNING:
            health = CalendarFeedHealthStatus.RUNNING
        elif latest_run.status is SyncStatus.PARTIAL:
            health = CalendarFeedHealthStatus.PARTIAL
        elif latest_run.status is SyncStatus.FAILED:
            health = CalendarFeedHealthStatus.FAILED
        elif (
            channel.last_successful_sync_at is None
            or now - channel.last_successful_sync_at >= stale_after
        ):
            health = CalendarFeedHealthStatus.STALE
        else:
            health = CalendarFeedHealthStatus.HEALTHY
        result.append((channel, latest_run, health))
    return result, total


def create_manual_booking(
    db: Session, *, company_id: UUID, payload: ManualBookingCreateRequest
) -> Booking:
    _get_active_property(
        db,
        company_id=company_id,
        property_id=payload.property_id,
        for_update=True,
    )
    is_reservation = payload.record_type == BookingRecordType.RESERVATION
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
        payment_status=payload.payment_status if is_reservation else None,
        total_amount=payload.total_amount if is_reservation else None,
        paid_amount=payload.paid_amount if is_reservation else None,
        payment_method=payload.payment_method.value if (is_reservation and payload.payment_method) else None,
    )
    db.add(booking)
    db.flush()
    reconcile_booking_conflicts(
        db, company_id=company_id, property_id=payload.property_id
    )
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
    booking = _get_manual_booking(
        db, company_id=company_id, booking_id=booking_id, for_update=False
    )
    _lock_property(db, company_id=company_id, property_id=booking.property_id)
    booking = _get_manual_booking(
        db, company_id=company_id, booking_id=booking_id, for_update=True
    )
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

    if booking.record_type == BookingRecordType.BLOCKED_PERIOD:
        updates.pop("payment_status", None)
        updates.pop("total_amount", None)
        updates.pop("paid_amount", None)
        updates.pop("payment_method", None)
    else:
        if "payment_method" in updates and payload.payment_method is not None:
            updates["payment_method"] = payload.payment_method.value
        target_total = updates.get("total_amount", booking.total_amount)
        target_paid = updates.get("paid_amount", booking.paid_amount)
        if target_paid is not None and target_total is not None and target_paid > target_total:
            raise ApiProblem(
                status=422,
                title="Invalid payment amounts",
                detail="Paid amount cannot exceed total amount.",
                code="payment_amount_invalid",
            )
        if (
            updates.get("payment_status") == PaymentStatus.PAID_IN_FULL
            and target_total is not None
            and "paid_amount" not in updates
        ):
            updates["paid_amount"] = target_total

    for field, value in updates.items():
        setattr(booking, field, value)
    db.flush()
    reconcile_booking_conflicts(
        db, company_id=company_id, property_id=booking.property_id
    )
    db.commit()
    db.refresh(booking)
    return booking


def cancel_manual_booking(
    db: Session, *, company_id: UUID, booking_id: UUID
) -> Booking:
    booking = _get_manual_booking(
        db, company_id=company_id, booking_id=booking_id, for_update=False
    )
    if booking.status is BookingStatus.CANCELLED:
        raise ApiProblem(
            status=409,
            title="Booking cancelled",
            detail="This booking is already cancelled.",
            code="booking_cancelled",
        )
    _lock_property(db, company_id=company_id, property_id=booking.property_id)
    booking = _get_manual_booking(
        db, company_id=company_id, booking_id=booking_id, for_update=True
    )
    if booking.status is BookingStatus.CANCELLED:
        raise ApiProblem(
            status=409,
            title="Booking cancelled",
            detail="This booking is already cancelled.",
            code="booking_cancelled",
        )
    booking.status = BookingStatus.CANCELLED
    db.flush()
    reconcile_booking_conflicts(
        db, company_id=company_id, property_id=booking.property_id
    )
    db.commit()
    db.refresh(booking)
    return booking


def check_availability(
    db: Session,
    *,
    company_id: UUID,
    property_id: UUID,
    check_in: datetime,
    check_out: datetime,
    exclude_booking_id: UUID | None = None,
) -> tuple[bool, list[Booking]]:
    _get_active_property(db, company_id=company_id, property_id=property_id)
    if check_out <= check_in:
        raise ApiProblem(
            status=422,
            title="Invalid availability range",
            detail="Check-out must be after check-in.",
            code="availability_date_range_invalid",
        )
    query = (
        select(Booking)
        .where(
            Booking.company_id == company_id,
            Booking.property_id == property_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        .order_by(Booking.check_in.asc())
    )
    if exclude_booking_id is not None:
        query = query.where(Booking.id != exclude_booking_id)

    conflicting_bookings = list(db.scalars(query).all())
    return (len(conflicting_bookings) == 0, conflicting_bookings)


def is_available(
    db: Session,
    *,
    company_id: UUID,
    property_id: UUID,
    check_in: datetime,
    check_out: datetime,
) -> bool:
    available, _ = check_availability(
        db,
        company_id=company_id,
        property_id=property_id,
        check_in=check_in,
        check_out=check_out,
    )
    return available



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


@dataclass(frozen=True)
class ParsedCalendar:
    events: list[ImportedEvent]
    rejected_count: int


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
        parsed_calendar = parse_calendar_events(
            (fetcher or fetch_calendar_bytes)(channel.calendar_url),
            timezone_name=_property_timezone(db, company_id, channel.property_id),
        )
        _lock_property(db, company_id=company_id, property_id=channel.property_id)
        for event in parsed_calendar.events:
            outcome = _upsert_event(db, channel=channel, event=event)
            if outcome == "created":
                sync_run.created_count += 1
            elif outcome == "updated":
                sync_run.updated_count += 1
            elif outcome == "cancelled":
                sync_run.cancelled_count += 1
            else:
                sync_run.rejected_count += 1

        sync_run.rejected_count += parsed_calendar.rejected_count
        if parsed_calendar.rejected_count == 0:
            sync_run.cancelled_count += _cancel_missing_events(
                db,
                channel=channel,
                external_event_ids={event.external_event_id for event in parsed_calendar.events},
            )

        completed_at = datetime.now(timezone.utc)
        sync_run.status = SyncStatus.PARTIAL if parsed_calendar.rejected_count else SyncStatus.SUCCEEDED
        sync_run.completed_at = completed_at
        if sync_run.status is SyncStatus.SUCCEEDED:
            channel.last_successful_sync_at = completed_at
            channel.last_error_summary = None
        else:
            sync_run.error_summary = (
                f"{parsed_calendar.rejected_count} calendar event(s) were rejected; "
                "missing-event cancellation was skipped."
            )
            channel.last_error_summary = sync_run.error_summary
        db.flush()
        reconcile_booking_conflicts(
            db, company_id=company_id, property_id=channel.property_id
        )
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


def parse_calendar_events(content: bytes, *, timezone_name: str) -> ParsedCalendar:
    try:
        calendar = Calendar.from_ical(content)
    except Exception as exc:
        raise CalendarImportError("Calendar feed is not valid iCalendar content") from exc
    if calendar.name != "VCALENDAR":
        raise CalendarImportError("Calendar feed is not valid iCalendar content")

    events: list[ImportedEvent] = []
    rejected_count = 0
    for component in calendar.walk("VEVENT"):
        uid = _as_text(component.get("UID"))
        start = _component_datetime(component.get("DTSTART"), timezone_name)
        end = _component_datetime(component.get("DTEND"), timezone_name)
        if _is_same_day_all_day_event(component) and start is not None and end == start:
            end = start + timedelta(days=1)
        if not uid or start is None or end is None or end <= start:
            rejected_count += 1
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
    return ParsedCalendar(events=events, rejected_count=rejected_count)


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


def _cancel_missing_events(
    db: Session, *, channel: Channel, external_event_ids: set[str]
) -> int:
    statement = select(Booking).where(
        Booking.company_id == channel.company_id,
        Booking.channel_id == channel.id,
        Booking.external_event_id.is_not(None),
        Booking.status.in_((BookingStatus.TENTATIVE, BookingStatus.CONFIRMED)),
    )
    if external_event_ids:
        statement = statement.where(Booking.external_event_id.not_in(external_event_ids))
    missing_bookings = list(db.scalars(statement))
    for booking in missing_bookings:
        booking.status = BookingStatus.CANCELLED
    return len(missing_bookings)


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


def _get_active_property(
    db: Session,
    *,
    company_id: UUID,
    property_id: UUID,
    for_update: bool = False,
) -> Property:
    statement = select(Property).where(
        Property.company_id == company_id,
        Property.id == property_id,
    )
    if for_update:
        statement = statement.with_for_update()
    property_obj = db.scalar(statement)
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


def _lock_property(db: Session, *, company_id: UUID, property_id: UUID) -> Property:
    property_obj = db.scalar(
        select(Property)
        .where(Property.company_id == company_id, Property.id == property_id)
        .with_for_update()
    )
    if property_obj is None:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )
    return property_obj


def _get_manual_booking(
    db: Session,
    *,
    company_id: UUID,
    booking_id: UUID,
    for_update: bool,
) -> Booking:
    statement = select(Booking).where(
        Booking.company_id == company_id,
        Booking.id == booking_id,
        Booking.source_type.in_((BookingSource.DIRECT, BookingSource.MANUAL)),
    )
    if for_update:
        statement = statement.with_for_update()
    booking = db.scalar(statement)
    if booking is None:
        raise ApiProblem(
            status=404,
            title="Booking not found",
            detail="Booking does not exist or does not belong to your company.",
            code="booking_not_found",
        )
    return booking
