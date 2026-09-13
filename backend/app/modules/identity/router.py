from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import CompanyStatus, UserRole, UserStatus
from app.integrations.invitations import invitation_delivery
from app.modules.identity.dependencies import (
    CsrfContext,
    CurrentContext,
    ManagerContext,
    ManagerCsrfContext,
)
from app.modules.identity.models import AppUser, AuthSession, Company, UserInvitation
from app.modules.identity.rate_limit import LoginRateLimiter, get_login_rate_limiter
from app.modules.identity.schemas import (
    AuthResponse,
    CompanySummary,
    InvitationAcceptRequest,
    InvitationCreateRequest,
    InvitationResponse,
    LoginRequest,
    RegistrationRequest,
    TeamListResponse,
    TeamMemberResponse,
    TeamMemberStatusRequest,
    UserPreferencesRequest,
    UserSummary,
)
from app.modules.identity.security import (
    DUMMY_PASSWORD_HASH,
    clear_auth_cookies,
    expires_at,
    generate_secret,
    hash_password,
    hash_secret,
    normalize_email,
    permissions_for_role,
    set_auth_cookies,
    verify_password,
)


router = APIRouter(tags=["Foundation"])
team_router = APIRouter(prefix="/team", tags=["Foundation"])


def _auth_response(user: AppUser, company: Company) -> AuthResponse:
    return AuthResponse(
        user=UserSummary.model_validate(user),
        company=CompanySummary.model_validate(company),
        permissions=permissions_for_role(user.role),
    )


def _create_session(db: Session, user: AppUser) -> tuple[str, str]:
    session_token = generate_secret()
    csrf_token = generate_secret()
    db.add(
        AuthSession(
            company_id=user.company_id,
            user_id=user.id,
            token_hash=hash_secret(session_token),
            csrf_hash=hash_secret(csrf_token),
            expires_at=expires_at(settings.session_hours),
        )
    )
    return session_token, csrf_token


def _client_ip(request: Request) -> str:
    return request.client.host if request.client is not None else "unknown"


def _validate_timezone(timezone_name: str) -> None:
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ApiProblem(
            status=422,
            title="Invalid timezone",
            detail="Use a valid IANA timezone such as Africa/Tunis.",
            code="timezone_invalid",
        ) from exc


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegistrationRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    email = normalize_email(str(payload.email))
    _validate_timezone(payload.timezone)
    if db.scalar(select(AppUser.id).where(AppUser.email == email)) is not None:
        raise ApiProblem(
            status=409,
            title="Account already exists",
            detail="An account already uses this email address.",
            code="email_already_registered",
        )

    company = Company(
        name=payload.company_name,
        status=CompanyStatus.ACTIVE,
        timezone=payload.timezone,
    )
    db.add(company)
    db.flush()
    user = AppUser(
        company_id=company.id,
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    try:
        db.flush()
        session_token, csrf_token = _create_session(db, user)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ApiProblem(
            status=409,
            title="Account already exists",
            detail="An account already uses this email address.",
            code="email_already_registered",
        ) from exc
    set_auth_cookies(response, session_token, csrf_token)
    return _auth_response(user, company)


@router.post("/auth/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    limiter: Annotated[LoginRateLimiter, Depends(get_login_rate_limiter)],
) -> AuthResponse:
    email = normalize_email(str(payload.email))
    client_ip = _client_ip(request)
    limiter.ensure_allowed(email, client_ip)
    user = db.scalar(select(AppUser).where(AppUser.email == email))
    stored_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_valid = verify_password(payload.password, stored_hash)
    if user is None or not password_valid:
        limiter.record_failure(email, client_ip)
        raise ApiProblem(
            status=401,
            title="Sign in failed",
            detail="The email address or password is incorrect.",
            code="invalid_credentials",
        )
    if user.status is UserStatus.INACTIVE:
        raise ApiProblem(
            status=403,
            title="Account inactive",
            detail="Contact your company manager to restore access.",
            code="account_inactive",
        )
    if user.status is UserStatus.INVITED:
        raise ApiProblem(
            status=403,
            title="Invitation not accepted",
            detail="Use your invitation link to activate this account.",
            code="invitation_pending",
        )
    company = db.get(Company, user.company_id)
    if company is None or company.status is not CompanyStatus.ACTIVE:
        raise ApiProblem(
            status=403,
            title="Company unavailable",
            detail="This company workspace is not active.",
            code="company_inactive",
        )

    user.last_login_at = datetime.now(timezone.utc)
    session_token, csrf_token = _create_session(db, user)
    db.commit()
    limiter.clear(email, client_ip)
    set_auth_cookies(response, session_token, csrf_token)
    return _auth_response(user, company)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(context: CsrfContext, response: Response, db: Annotated[Session, Depends(get_db)]) -> None:
    context.session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    clear_auth_cookies(response)


@router.get("/auth/me", response_model=AuthResponse)
def me(context: CurrentContext) -> AuthResponse:
    return _auth_response(context.user, context.company)


@router.patch("/auth/preferences", response_model=AuthResponse)
def update_preferences(
    payload: UserPreferencesRequest,
    context: CsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    context.user.preferred_language = payload.preferred_language
    db.commit()
    return _auth_response(context.user, context.company)


@router.post("/auth/invitations/accept", response_model=AuthResponse)
def accept_invitation(
    payload: InvitationAcceptRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    invitation = db.scalar(
        select(UserInvitation)
        .where(UserInvitation.token_hash == hash_secret(payload.token))
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if (
        invitation is None
        or invitation.accepted_at is not None
        or invitation.expires_at <= now
    ):
        raise ApiProblem(
            status=400,
            title="Invitation invalid",
            detail="This invitation is invalid, expired, or already used.",
            code="invitation_invalid",
        )
    user = db.scalar(
        select(AppUser).where(
            AppUser.id == invitation.user_id,
            AppUser.company_id == invitation.company_id,
        )
    )
    company = db.get(Company, invitation.company_id)
    if (
        user is None
        or company is None
        or company.status is not CompanyStatus.ACTIVE
        or user.status is not UserStatus.INVITED
    ):
        raise ApiProblem(
            status=400,
            title="Invitation invalid",
            detail="This invitation is invalid, expired, or already used.",
            code="invitation_invalid",
        )

    user.password_hash = hash_password(payload.password)
    user.status = UserStatus.ACTIVE
    user.last_login_at = now
    invitation.accepted_at = now
    db.execute(
        update(UserInvitation)
        .where(
            UserInvitation.company_id == invitation.company_id,
            UserInvitation.user_id == user.id,
            UserInvitation.id != invitation.id,
            UserInvitation.accepted_at.is_(None),
        )
        .values(expires_at=now)
    )
    session_token, csrf_token = _create_session(db, user)
    db.commit()
    set_auth_cookies(response, session_token, csrf_token)
    return _auth_response(user, company)


@team_router.get("", response_model=TeamListResponse)
def list_team(context: ManagerContext, db: Annotated[Session, Depends(get_db)]) -> TeamListResponse:
    users = db.scalars(
        select(AppUser)
        .where(AppUser.company_id == context.company.id)
        .order_by(AppUser.name, AppUser.email)
    ).all()
    items: list[TeamMemberResponse] = []
    for user in users:
        invitation_expires_at = db.scalar(
            select(UserInvitation.expires_at)
            .where(
                UserInvitation.company_id == context.company.id,
                UserInvitation.user_id == user.id,
                UserInvitation.accepted_at.is_(None),
            )
            .order_by(UserInvitation.created_at.desc())
            .limit(1)
        )
        items.append(
            TeamMemberResponse(
                **UserSummary.model_validate(user).model_dump(),
                last_login_at=user.last_login_at,
                invitation_expires_at=invitation_expires_at,
            )
        )
    return TeamListResponse(items=items)


@team_router.post(
    "/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED
)
def invite_staff(
    payload: InvitationCreateRequest,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> InvitationResponse:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(AppUser).where(AppUser.email == email))
    if user is not None and user.company_id != context.company.id:
        raise ApiProblem(
            status=409,
            title="Email unavailable",
            detail="This email address cannot be invited to the workspace.",
            code="email_unavailable",
        )
    if user is not None and user.status is not UserStatus.INVITED:
        raise ApiProblem(
            status=409,
            title="Team member already exists",
            detail="This email already belongs to an active or inactive team member.",
            code="team_member_exists",
        )
    if user is None:
        user = AppUser(
            company_id=context.company.id,
            name=payload.name,
            email=email,
            password_hash=hash_password(generate_secret()),
            role=UserRole.STAFF,
            status=UserStatus.INVITED,
        )
        db.add(user)
        db.flush()
    else:
        user.name = payload.name
        db.execute(
            update(UserInvitation)
            .where(UserInvitation.user_id == user.id, UserInvitation.accepted_at.is_(None))
            .values(expires_at=datetime.now(timezone.utc))
        )

    token = generate_secret()
    invitation = UserInvitation(
        company_id=context.company.id,
        user_id=user.id,
        created_by_user_id=context.user.id,
        token_hash=hash_secret(token),
        expires_at=expires_at(settings.invitation_hours),
    )
    db.add(invitation)
    invitation_url = invitation_delivery.deliver_invitation(
        recipient_email=email,
        recipient_name=payload.name,
        company_name=context.company.name,
        inviter_name=context.user.name,
        token=token,
        language=context.user.preferred_language or "fr",
    )
    db.commit()
    member = TeamMemberResponse(
        **UserSummary.model_validate(user).model_dump(),
        last_login_at=user.last_login_at,
        invitation_expires_at=invitation.expires_at,
    )
    return InvitationResponse(member=member, invitation_url=invitation_url)


@team_router.patch("/{user_id}/status", response_model=TeamMemberResponse)
def update_team_member_status(
    user_id: UUID,
    payload: TeamMemberStatusRequest,
    context: ManagerCsrfContext,
    db: Annotated[Session, Depends(get_db)],
) -> TeamMemberResponse:
    target = db.scalar(
        select(AppUser).where(
            AppUser.id == user_id,
            AppUser.company_id == context.company.id,
        )
    )
    if target is None:
        raise ApiProblem(
            status=404,
            title="Team member not found",
            detail="The requested team member does not exist.",
            code="team_member_not_found",
        )
    if target.id == context.user.id:
        raise ApiProblem(
            status=409,
            title="Self-deactivation blocked",
            detail="Managers cannot change their own active status.",
            code="self_status_change_blocked",
        )
    requested_status = UserStatus(payload.status)
    if target.role is UserRole.MANAGER and requested_status is UserStatus.INACTIVE:
        active_manager_count = db.scalar(
            select(func.count())
            .select_from(AppUser)
            .where(
                AppUser.company_id == context.company.id,
                AppUser.role == UserRole.MANAGER,
                AppUser.status == UserStatus.ACTIVE,
            )
        )
        if active_manager_count is not None and active_manager_count <= 1:
            raise ApiProblem(
                status=409,
                title="Last manager cannot be deactivated",
                detail="The workspace must retain at least one active manager.",
                code="last_manager_required",
            )
    if target.status is UserStatus.INVITED:
        raise ApiProblem(
            status=409,
            title="Invitation still pending",
            detail="An invited user must accept or receive a replacement invitation.",
            code="invitation_pending",
        )

    target.status = requested_status
    if requested_status is UserStatus.INACTIVE:
        db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == target.id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
    db.commit()
    return TeamMemberResponse(
        **UserSummary.model_validate(target).model_dump(),
        last_login_at=target.last_login_at,
    )
