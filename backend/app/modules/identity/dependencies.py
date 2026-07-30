from dataclasses import dataclass
from datetime import datetime, timezone
from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import CompanyStatus, UserRole, UserStatus
from app.modules.identity.models import AppUser, AuthSession, Company
from app.modules.identity.security import hash_secret


@dataclass(frozen=True)
class AuthenticatedContext:
    session: AuthSession
    user: AppUser
    company: Company


def get_current_context(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> AuthenticatedContext:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise _authentication_required()

    row = db.execute(
        select(AuthSession, AppUser, Company)
        .join(
            AppUser,
            (AppUser.id == AuthSession.user_id)
            & (AppUser.company_id == AuthSession.company_id),
        )
        .join(Company, Company.id == AuthSession.company_id)
        .where(AuthSession.token_hash == hash_secret(token))
    ).one_or_none()
    if row is None:
        raise _authentication_required()

    session, user, company = row
    now = datetime.now(timezone.utc)
    if session.revoked_at is not None or session.expires_at <= now:
        raise _authentication_required()
    if user.status is not UserStatus.ACTIVE or company.status is not CompanyStatus.ACTIVE:
        raise _authentication_required()
    return AuthenticatedContext(session=session, user=user, company=company)


def require_manager(
    context: Annotated[AuthenticatedContext, Depends(get_current_context)],
) -> AuthenticatedContext:
    if context.user.role is not UserRole.MANAGER:
        raise ApiProblem(
            status=403,
            title="Manager access required",
            detail="This operation is available only to company managers.",
            code="manager_required",
        )
    return context


def require_csrf(
    context: Annotated[AuthenticatedContext, Depends(get_current_context)],
    csrf_token: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> AuthenticatedContext:
    if not csrf_token or not compare_digest(
        hash_secret(csrf_token), context.session.csrf_hash
    ):
        raise ApiProblem(
            status=403,
            title="Request verification failed",
            detail="The request verification token is missing or invalid.",
            code="csrf_invalid",
        )
    return context


def require_manager_csrf(
    context: Annotated[AuthenticatedContext, Depends(require_csrf)],
) -> AuthenticatedContext:
    return require_manager(context)


def _authentication_required() -> ApiProblem:
    return ApiProblem(
        status=401,
        title="Authentication required",
        detail="Sign in to access this resource.",
        code="authentication_required",
    )


CurrentContext = Annotated[AuthenticatedContext, Depends(get_current_context)]
ManagerContext = Annotated[AuthenticatedContext, Depends(require_manager)]
CsrfContext = Annotated[AuthenticatedContext, Depends(require_csrf)]
ManagerCsrfContext = Annotated[AuthenticatedContext, Depends(require_manager_csrf)]
