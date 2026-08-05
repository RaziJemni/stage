from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.calendar import service
from app.modules.calendar.schemas import (
    BookingResponse,
    CalendarFeedRequest,
    CalendarFeedResponse,
    CalendarSyncQueuedResponse,
    CalendarSyncResponse,
    ManualBookingCreateRequest,
    ManualBookingUpdateRequest,
)
from app.modules.calendar.tasks import sync_calendar_channel
from app.modules.identity.dependencies import CsrfContext, CurrentContext, ManagerCsrfContext


router = APIRouter(tags=["Calendar"])


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
