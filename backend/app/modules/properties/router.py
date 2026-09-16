from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.api.pagination import Page, PageParams, get_page_params
from app.core.database import get_db
from app.modules.identity.dependencies import (
    CurrentContext,
    ManagerCsrfContext,
)
from app.modules.identity.authorization import assigned_property_ids, require_capability
from app.modules.properties import service
from app.modules.properties.schemas import (
    OwnerCreateRequest,
    OwnerResponse,
    OwnerUpdateRequest,
    PropertyCreateRequest,
    PropertyResponse,
    PropertyUpdateRequest,
)

router = APIRouter(prefix="/properties", tags=["Properties"])
owner_router = APIRouter(prefix="/owners", tags=["Owners"])


@router.get("", response_model=Page[PropertyResponse])
def list_properties_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    city: Annotated[str | None, Query(description="Filter by city name")] = None,
    include_archived: Annotated[
        bool, Query(description="Whether to include archived properties")
    ] = False,
    owner_id: Annotated[
        UUID | None, Query(description="Filter properties by owner ID")
    ] = None,
) -> Page[PropertyResponse]:
    require_capability(context, "operations")
    items, total = service.list_properties(
        db,
        company_id=context.company.id,
        params=page_params,
        city=city,
        include_archived=include_archived,
        owner_id=owner_id,
        property_ids=assigned_property_ids(db, context),
    )
    return Page.create(items=items, params=page_params, total=total)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property_endpoint(
    context: ManagerCsrfContext,
    payload: PropertyCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    prop = service.create_property(db, company_id=context.company.id, payload=payload)
    return service.get_property_response(db, company_id=context.company.id, property_id=prop.id) or PropertyResponse.model_validate(prop)


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property_endpoint(
    property_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    require_capability(context, "operations")
    property_obj = service.get_property_response(
        db, company_id=context.company.id, property_id=property_id, property_ids=assigned_property_ids(db, context)
    )
    if not property_obj:
        raise ApiProblem(
            status=404,
            title="Property not found",
            detail="Property does not exist or does not belong to your company.",
            code="property_not_found",
        )
    return property_obj


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property_endpoint(
    property_id: UUID,
    context: ManagerCsrfContext,
    payload: PropertyUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    prop = service.update_property(
        db, company_id=context.company.id, property_id=property_id, payload=payload
    )
    return service.get_property_response(db, company_id=context.company.id, property_id=prop.id) or PropertyResponse.model_validate(prop)


@router.post("/{property_id}/archive", response_model=PropertyResponse)
def archive_property_endpoint(
    property_id: UUID,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    return service.archive_property(
        db, company_id=context.company.id, property_id=property_id
    )


@router.post("/{property_id}/unarchive", response_model=PropertyResponse)
def unarchive_property_endpoint(
    property_id: UUID,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    return service.unarchive_property(
        db, company_id=context.company.id, property_id=property_id
    )


# --- Owner Endpoints ---


@owner_router.get("", response_model=list[OwnerResponse])
def list_owners_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    include_inactive: Annotated[bool, Query(description="Include inactive owners")] = False,
) -> list[OwnerResponse]:
    return service.list_owners(db, company_id=context.company.id, include_inactive=include_inactive)


@owner_router.post("", response_model=OwnerResponse, status_code=status.HTTP_201_CREATED)
def create_owner_endpoint(
    context: ManagerCsrfContext,
    payload: OwnerCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> OwnerResponse:
    return service.create_owner(db, company_id=context.company.id, payload=payload)


@owner_router.get("/{owner_id}", response_model=OwnerResponse)
def get_owner_endpoint(
    owner_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> OwnerResponse:
    owner = service.get_owner_response(db, company_id=context.company.id, owner_id=owner_id)
    if not owner:
        raise ApiProblem(
            status=404,
            title="Owner not found",
            detail="Owner does not exist or does not belong to your company.",
            code="owner_not_found",
        )
    return owner


@owner_router.patch("/{owner_id}", response_model=OwnerResponse)
def update_owner_endpoint(
    owner_id: UUID,
    context: ManagerCsrfContext,
    payload: OwnerUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> OwnerResponse:
    return service.update_owner(db, company_id=context.company.id, owner_id=owner_id, payload=payload)


@owner_router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_owner_endpoint(
    owner_id: UUID,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service.delete_owner(db, company_id=context.company.id, owner_id=owner_id)

