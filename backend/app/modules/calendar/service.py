from datetime import datetime
from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.enums import BookingSource, BookingStatus, PropertyStatus
from app.modules.calendar.models import Booking
from app.modules.calendar.schemas import ManualBookingCreateRequest, ManualBookingUpdateRequest
from app.modules.properties.models import Property


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
