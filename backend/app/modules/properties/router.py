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
from app.modules.properties import service
from app.modules.properties.schemas import (
    PropertyCreateRequest,
    PropertyResponse,
    PropertyUpdateRequest,
)

router = APIRouter(prefix="/properties", tags=["Properties"])


@router.get("", response_model=Page[PropertyResponse])
def list_properties_endpoint(
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
    page_params: Annotated[PageParams, Depends(get_page_params)],
    city: Annotated[str | None, Query(description="Filter by city name")] = None,
    include_archived: Annotated[
        bool, Query(description="Whether to include archived properties")
    ] = False,
) -> Page[PropertyResponse]:
    items, total = service.list_properties(
        db,
        company_id=context.company.id,
        params=page_params,
        city=city,
        include_archived=include_archived,
    )
    return Page.create(items=items, params=page_params, total=total)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property_endpoint(
    context: ManagerCsrfContext,
    payload: PropertyCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    return service.create_property(db, company_id=context.company.id, payload=payload)


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property_endpoint(
    property_id: UUID,
    context: CurrentContext,
    db: Annotated[Session, Depends(get_db)],
) -> PropertyResponse:
    property_obj = service.get_property(
        db, company_id=context.company.id, property_id=property_id
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
    return service.update_property(
        db, company_id=context.company.id, property_id=property_id, payload=payload
    )


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
