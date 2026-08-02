from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import PageParams
from app.core.enums import PropertyStatus
from app.modules.properties.models import Property
from app.modules.properties.schemas import PropertyCreateRequest, PropertyUpdateRequest


def list_properties(
    db: Session,
    company_id: UUID,
    params: PageParams,
    city: str | None = None,
    include_archived: bool = False,
) -> tuple[list[Property], int]:
    stmt = select(Property).where(Property.company_id == company_id)

    if not include_archived:
        stmt = stmt.where(Property.status != PropertyStatus.ARCHIVED)

    if city and city.strip() and city.strip().lower() != "all":
        stmt = stmt.where(func.lower(Property.city) == city.strip().lower())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    items = list(
        db.scalars(
            stmt.order_by(Property.created_at.desc())
            .offset(params.offset)
            .limit(params.page_size)
        ).all()
    )

    return items, total


def get_property(db: Session, company_id: UUID, property_id: UUID) -> Property | None:
    return db.execute(
        select(Property).where(
            Property.company_id == company_id, Property.id == property_id
        )
    ).scalar_one_or_none()


def create_property(
    db: Session, company_id: UUID, payload: PropertyCreateRequest
) -> Property:
    data = payload.model_dump()
    property_obj = Property(company_id=company_id, **data)
    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)
    return property_obj


def update_property(
    db: Session, company_id: UUID, property_id: UUID, payload: PropertyUpdateRequest
) -> Property:
    property_obj = get_property(db, company_id, property_id)
    if not property_obj:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )

    if property_obj.status == PropertyStatus.ARCHIVED:
        raise ApiProblem(
            status=409,
            title="Property archived",
            detail="Archived properties cannot be modified.",
            code="property_archived",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property_obj, field, value)

    db.commit()
    db.refresh(property_obj)
    return property_obj


def archive_property(db: Session, company_id: UUID, property_id: UUID) -> Property:
    property_obj = get_property(db, company_id, property_id)
    if not property_obj:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )

    if property_obj.status == PropertyStatus.ARCHIVED:
        raise ApiProblem(
            status=409,
            title="Property archived",
            detail="Property is already archived.",
            code="property_archived",
        )

    property_obj.status = PropertyStatus.ARCHIVED
    property_obj.archived_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(property_obj)
    return property_obj


def unarchive_property(db: Session, company_id: UUID, property_id: UUID) -> Property:
    property_obj = get_property(db, company_id, property_id)
    if not property_obj:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )

    if property_obj.status != PropertyStatus.ARCHIVED:
        raise ApiProblem(
            status=400,
            title="Property not archived",
            detail="Property is not archived.",
            code="property_not_archived",
        )

    property_obj.status = PropertyStatus.ACTIVE
    property_obj.archived_at = None

    db.commit()
    db.refresh(property_obj)
    return property_obj
