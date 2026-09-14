from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import PageParams
from app.core.enums import PropertyStatus
from app.modules.properties.models import Owner, Property
from app.modules.properties.schemas import (
    OwnerCreateRequest,
    OwnerResponse,
    OwnerUpdateRequest,
    PropertyCreateRequest,
    PropertyResponse,
    PropertyUpdateRequest,
)


def list_properties(
    db: Session,
    company_id: UUID,
    params: PageParams,
    city: str | None = None,
    include_archived: bool = False,
    owner_id: UUID | None = None,
) -> tuple[list[PropertyResponse], int]:
    stmt = (
        select(Property, Owner.name.label("owner_name"))
        .outerjoin(Owner, Property.owner_id == Owner.id)
        .where(Property.company_id == company_id)
    )

    if not include_archived:
        stmt = stmt.where(Property.status != PropertyStatus.ARCHIVED)

    if city and city.strip() and city.strip().lower() != "all":
        stmt = stmt.where(func.lower(Property.city) == city.strip().lower())

    if owner_id is not None:
        stmt = stmt.where(Property.owner_id == owner_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    rows = db.execute(
        stmt.order_by(Property.created_at.desc())
        .offset(params.offset)
        .limit(params.page_size)
    ).all()

    items: list[PropertyResponse] = []
    for prop, o_name in rows:
        resp = PropertyResponse.model_validate(prop)
        resp.owner_name = o_name
        items.append(resp)

    return items, total


def get_property(db: Session, company_id: UUID, property_id: UUID) -> Property | None:
    return db.execute(
        select(Property).where(
            Property.company_id == company_id, Property.id == property_id
        )
    ).scalar_one_or_none()


def get_property_response(
    db: Session, company_id: UUID, property_id: UUID
) -> PropertyResponse | None:
    row = db.execute(
        select(Property, Owner.name.label("owner_name"))
        .outerjoin(Owner, Property.owner_id == Owner.id)
        .where(Property.company_id == company_id, Property.id == property_id)
    ).first()
    if not row:
        return None
    prop, o_name = row
    resp = PropertyResponse.model_validate(prop)
    resp.owner_name = o_name
    return resp


def create_property(
    db: Session, company_id: UUID, payload: PropertyCreateRequest
) -> Property:
    if payload.owner_id is not None:
        owner = db.scalar(
            select(Owner).where(
                Owner.company_id == company_id,
                Owner.id == payload.owner_id,
            )
        )
        if not owner:
            raise ApiProblem(
                status=404,
                title="Owner not found",
                detail="The specified owner does not exist or does not belong to your company.",
                code="owner_not_found",
            )
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
    if "owner_id" in update_data and update_data["owner_id"] is not None:
        owner = db.scalar(
            select(Owner).where(
                Owner.company_id == company_id,
                Owner.id == update_data["owner_id"],
            )
        )
        if not owner:
            raise ApiProblem(
                status=404,
                title="Owner not found",
                detail="The specified owner does not exist or does not belong to your company.",
                code="owner_not_found",
            )
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


def create_owner(
    db: Session, company_id: UUID, payload: OwnerCreateRequest
) -> OwnerResponse:
    owner = Owner(company_id=company_id, **payload.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return OwnerResponse.model_validate(owner)


def update_owner(
    db: Session, company_id: UUID, owner_id: UUID, payload: OwnerUpdateRequest
) -> OwnerResponse:
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
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)
    db.commit()
    db.refresh(owner)
    count = db.scalar(
        select(func.count(Property.id)).where(
            Property.company_id == company_id,
            Property.owner_id == owner.id,
            Property.status != PropertyStatus.ARCHIVED,
        )
    ) or 0
    resp = OwnerResponse.model_validate(owner)
    resp.properties_count = count
    return resp


def get_owner_response(
    db: Session, company_id: UUID, owner_id: UUID
) -> OwnerResponse | None:
    owner = db.scalar(
        select(Owner).where(Owner.company_id == company_id, Owner.id == owner_id)
    )
    if not owner:
        return None
    count = db.scalar(
        select(func.count(Property.id)).where(
            Property.company_id == company_id,
            Property.owner_id == owner.id,
            Property.status != PropertyStatus.ARCHIVED,
        )
    ) or 0
    resp = OwnerResponse.model_validate(owner)
    resp.properties_count = count
    return resp


def list_owners(
    db: Session, company_id: UUID, include_inactive: bool = False
) -> list[OwnerResponse]:
    stmt = (
        select(Owner, func.count(Property.id).label("prop_count"))
        .outerjoin(
            Property,
            (Property.owner_id == Owner.id)
            & (Property.company_id == company_id)
            & (Property.status != PropertyStatus.ARCHIVED),
        )
        .where(Owner.company_id == company_id)
        .group_by(Owner.id)
        .order_by(Owner.name.asc())
    )
    if not include_inactive:
        stmt = stmt.where(Owner.is_active.is_(True))

    results = db.execute(stmt).all()
    items: list[OwnerResponse] = []
    for owner, count in results:
        resp = OwnerResponse.model_validate(owner)
        resp.properties_count = count or 0
        items.append(resp)
    return items


def delete_owner(db: Session, company_id: UUID, owner_id: UUID) -> None:
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
    owner.is_active = False
    db.commit()

