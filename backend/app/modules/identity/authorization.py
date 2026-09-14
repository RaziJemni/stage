from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.enums import UserRole
from app.modules.identity.dependencies import AuthenticatedContext
from app.modules.identity.models import StaffPropertyAssignment


def require_capability(context: AuthenticatedContext, capability: str) -> None:
    if context.user.role is UserRole.MANAGER:
        return
    allowed = context.user.operations_access if capability == "operations" else context.user.maintenance_access
    if not allowed:
        raise ApiProblem(status=403, title="Capability required", detail="Your staff role does not include this operational area.", code="capability_required")


def assigned_property_ids(db: Session, context: AuthenticatedContext) -> set[UUID] | None:
    if context.user.role is UserRole.MANAGER:
        return None
    property_ids = set(db.scalars(select(StaffPropertyAssignment.property_id).where(
        StaffPropertyAssignment.company_id == context.company.id,
        StaffPropertyAssignment.user_id == context.user.id,
    )))
    return property_ids or None


def require_property_access(db: Session, context: AuthenticatedContext, property_id: UUID, capability: str) -> None:
    require_capability(context, capability)
    scoped_ids = assigned_property_ids(db, context)
    if scoped_ids is not None and property_id not in scoped_ids:
        raise ApiProblem(status=404, title="Property not found", detail="Property does not exist or is not available to your account.", code="property_not_found")
