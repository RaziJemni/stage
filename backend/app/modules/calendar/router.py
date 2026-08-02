from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.calendar import service
from app.modules.calendar.schemas import (
    BookingResponse,
    ManualBookingCreateRequest,
    ManualBookingUpdateRequest,
)
from app.modules.identity.dependencies import CsrfContext


router = APIRouter(prefix="/bookings", tags=["Calendar"])


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_manual_booking_endpoint(
    context: CsrfContext,
    payload: ManualBookingCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return service.create_manual_booking(db, company_id=context.company.id, payload=payload)


@router.patch("/{booking_id}", response_model=BookingResponse)
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


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
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
