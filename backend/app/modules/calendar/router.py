from datetime import datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.core.enums import BookingSource, BookingStatus, ConflictStatus
from app.modules.calendar import receipt_service, service
from app.modules.calendar.schemas import (
    AvailabilityCheckResponse,
    BookingCalendarResponse,
    BookingConflictResponse,
    BookingReceiptDataResponse,
    BookingResponse,
    CalendarFeedHealthResponse,
    CalendarFeedRequest,
    CalendarFeedResponse,
    CalendarSyncQueuedResponse,
    CalendarSyncResponse,
    ConflictAcknowledgeRequest,
    ConflictBookingResponse,
    ManualBookingCreateRequest,
    ManualBookingUpdateRequest,
)
from app.modules.calendar.tasks import sync_calendar_channel
from app.modules.identity.dependencies import CsrfContext, CurrentContext, ManagerCsrfContext


router = APIRouter(tags=["Calendar"])


def _validate_calendar_range(range_start: datetime, range_end: datetime) -> None:
    if (
        range_start.tzinfo is None
        or range_start.utcoffset() is None
        or range_end.tzinfo is None
        or range_end.utcoffset() is None
    ):
        raise ApiProblem(
            status=422,
            title="Invalid calendar range",
            detail="Calendar range timestamps must include a timezone.",
            code="calendar_range_timezone_required",
        )
    if range_end <= range_start:
        raise ApiProblem(
            status=422,
            title="Invalid calendar range",
            detail="Calendar range end must be after its start.",
            code="calendar_range_invalid",
        )
    if range_end - range_start > timedelta(days=31):
        raise ApiProblem(
            status=422,
            title="Calendar range too large",
            detail="Calendar ranges cannot exceed 31 days.",
            code="calendar_range_too_large",
        )


def _feed_health_response(channel, latest_run, health) -> CalendarFeedHealthResponse:
    return CalendarFeedHealthResponse(
        id=channel.id,
        property_id=channel.property_id,
        channel_type=channel.channel_type,
        is_active=channel.is_active,
        health_status=health,
        last_successful_sync_at=channel.last_successful_sync_at,
        last_sync_at=(
            (latest_run.completed_at or latest_run.started_at)
            if latest_run
            else None
        ),
        last_sync_status=latest_run.status if latest_run else None,
        last_error_summary=channel.last_error_summary,
    )


def _conflict_response(conflict, bookings) -> BookingConflictResponse:
    return BookingConflictResponse(
        id=conflict.id,
        property_id=conflict.property_id,
        status=conflict.status,
        detected_at=conflict.detected_at,
        acknowledged_at=conflict.acknowledged_at,
        acknowledged_by_user_id=conflict.acknowledged_by_user_id,
        resolution_note=conflict.resolution_note,
        resolved_at=conflict.resolved_at,
        resolved_by_user_id=conflict.resolved_by_user_id,
        bookings=[
            ConflictBookingResponse.model_validate(booking) for booking in bookings
        ],
    )


@router.get("/booking-conflicts", response_model=Page[BookingConflictResponse])
def list_booking_conflicts_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    property_id: Annotated[UUID | None, Query()] = None,
    conflict_status: Annotated[
        ConflictStatus | None, Query(alias="status")
    ] = None,
) -> Page[BookingConflictResponse]:
    items, total = service.list_booking_conflicts(
        db,
        company_id=context.company.id,
        params=page_params,
        property_id=property_id,
        status=conflict_status,
    )
    return Page.create(
        items=[_conflict_response(conflict, bookings) for conflict, bookings in items],
        params=page_params,
        total=total,
    )


@router.get(
    "/booking-conflicts/{conflict_id}", response_model=BookingConflictResponse
)
def get_booking_conflict_endpoint(
    conflict_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> BookingConflictResponse:
    conflict, bookings = service.get_booking_conflict(
        db, company_id=context.company.id, conflict_id=conflict_id
    )
    return _conflict_response(conflict, bookings)


@router.post(
    "/booking-conflicts/{conflict_id}/acknowledge",
    response_model=BookingConflictResponse,
)
def acknowledge_booking_conflict_endpoint(
    conflict_id: UUID,
    payload: ConflictAcknowledgeRequest,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> BookingConflictResponse:
    conflict, bookings = service.acknowledge_booking_conflict(
        db,
        company_id=context.company.id,
        conflict_id=conflict_id,
        user_id=context.user.id,
        payload=payload,
    )
    return _conflict_response(conflict, bookings)


@router.get("/bookings", response_model=Page[BookingCalendarResponse])
def list_bookings_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    range_start: Annotated[datetime, Query()],
    range_end: Annotated[datetime, Query()],
    property_id: Annotated[UUID | None, Query()] = None,
    source_type: Annotated[BookingSource | None, Query()] = None,
    booking_status: Annotated[BookingStatus | None, Query(alias="status")] = None,
) -> Page[BookingCalendarResponse]:
    _validate_calendar_range(range_start, range_end)
    items, total = service.list_bookings(
        db,
        company_id=context.company.id,
        params=page_params,
        range_start=range_start,
        range_end=range_end,
        property_id=property_id,
        source_type=source_type,
        status=booking_status,
    )
    return Page.create(
        items=[BookingCalendarResponse.model_validate(item) for item in items],
        params=page_params,
        total=total,
    )


@router.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking_endpoint(
    booking_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return service.get_booking(db, company_id=context.company.id, booking_id=booking_id)


@router.get("/bookings/{booking_id}/receipt/data", response_model=BookingReceiptDataResponse)
def get_booking_receipt_data_endpoint(
    booking_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> BookingReceiptDataResponse:
    return receipt_service.get_booking_receipt_data(
        db, company_id=context.company.id, booking_id=booking_id
    )


@router.get("/bookings/{booking_id}/receipt", response_class=HTMLResponse)
def get_booking_receipt_html_endpoint(
    booking_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    lang: Annotated[str, Query(description="Locale for receipt (fr or en)")] = "fr",
) -> HTMLResponse:
    receipt_data = receipt_service.get_booking_receipt_data(
        db, company_id=context.company.id, booking_id=booking_id
    )
    html_content = receipt_service.render_booking_receipt_html(receipt_data, locale=lang)
    return HTMLResponse(content=html_content, status_code=status.HTTP_200_OK)


@router.get("/calendar-feeds", response_model=Page[CalendarFeedHealthResponse])
def list_calendar_feeds_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    property_id: Annotated[UUID | None, Query()] = None,
) -> Page[CalendarFeedHealthResponse]:
    items, total = service.list_calendar_feed_health(
        db,
        company_id=context.company.id,
        params=page_params,
        property_id=property_id,
    )
    return Page.create(
        items=[
            _feed_health_response(channel, latest_run, health)
            for channel, latest_run, health in items
        ],
        params=page_params,
        total=total,
    )


@router.post(
    "/properties/{property_id}/calendar-feeds",
    response_model=CalendarFeedResponse,
    status_code=status.HTTP_201_CREATED,
)
def configure_calendar_feed_endpoint(
    property_id: UUID,
    payload: CalendarFeedRequest,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> CalendarFeedResponse:
    return service.configure_calendar_feed(
        db,
        company_id=context.company.id,
        property_id=property_id,
        payload=payload,
    )


@router.post(
    "/calendar-feeds/{channel_id}/sync",
    response_model=CalendarSyncQueuedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_calendar_sync_endpoint(
    channel_id: UUID,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> CalendarSyncQueuedResponse:
    channel = service.get_channel(db, company_id=context.company.id, channel_id=channel_id)
    sync_calendar_channel.delay(str(context.company.id), str(channel.id))
    return CalendarSyncQueuedResponse(channel_id=channel.id, status="queued")


@router.get(
    "/calendar-feeds/{channel_id}/sync-runs",
    response_model=list[CalendarSyncResponse],
)
def list_calendar_sync_runs_endpoint(
    channel_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> list[CalendarSyncResponse]:
    return service.list_sync_runs(db, company_id=context.company.id, channel_id=channel_id)


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_manual_booking_endpoint(
    context: CsrfContext,
    payload: ManualBookingCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return service.create_manual_booking(db, company_id=context.company.id, payload=payload)


@router.patch("/bookings/{booking_id}", response_model=BookingResponse)
def update_manual_booking_endpoint(
    booking_id: UUID,
    context: CsrfContext,
    payload: ManualBookingUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return service.update_manual_booking(
        db,
        company_id=context.company.id,
        booking_id=booking_id,
        payload=payload,
    )


@router.post("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_manual_booking_endpoint(
    booking_id: UUID,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return service.cancel_manual_booking(
        db,
        company_id=context.company.id,
        booking_id=booking_id,
    )


@router.get(
    "/properties/{property_id}/availability",
    response_model=AvailabilityCheckResponse,
)
def check_property_availability_endpoint(
    property_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    check_in: Annotated[datetime, Query()],
    check_out: Annotated[datetime, Query()],
    exclude_booking_id: Annotated[UUID | None, Query()] = None,
) -> AvailabilityCheckResponse:
    if (
        check_in.tzinfo is None
        or check_in.utcoffset() is None
        or check_out.tzinfo is None
        or check_out.utcoffset() is None
    ):
        raise ApiProblem(
            status=422,
            title="Invalid availability range",
            detail="Check-in and check-out timestamps must include a timezone.",
            code="availability_timezone_required",
        )
    available, conflicting_bookings = service.check_availability(
        db,
        company_id=context.company.id,
        property_id=property_id,
        check_in=check_in,
        check_out=check_out,
        exclude_booking_id=exclude_booking_id,
    )
    return AvailabilityCheckResponse(
        is_available=available,
        conflicting_bookings=[
            ConflictBookingResponse.model_validate(b) for b in conflicting_bookings
        ],
    )

