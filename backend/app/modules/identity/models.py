from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.enums import CompanyStatus, UserRole, UserStatus, enum_type


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "companies"
    __table_args__ = (CheckConstraint("char_length(default_currency) = 3", name="companies_currency_length"),)

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[CompanyStatus] = mapped_column(
        enum_type(CompanyStatus, "company_status"),
        default=CompanyStatus.ACTIVE,
        server_default=CompanyStatus.ACTIVE.value,
        nullable=False,
    )
    timezone: Mapped[str] = mapped_column(
        String(64), default="Africa/Tunis", server_default="Africa/Tunis", nullable=False
    )
    default_currency: Mapped[str] = mapped_column(
        String(3), default="TND", server_default="TND", nullable=False
    )


class AppUser(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "app_users"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_app_users_company_id_id"),
        UniqueConstraint("email", name="uq_app_users_email"),
        CheckConstraint("email = lower(btrim(email))", name="email_normalized"),
    )

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        enum_type(UserRole, "user_role"), default=UserRole.STAFF, nullable=False
    )
    status: Mapped[UserStatus] = mapped_column(
        enum_type(UserStatus, "user_status"),
        default=UserStatus.INVITED,
        server_default=UserStatus.INVITED.value,
        nullable=False,
    )
    preferred_language: Mapped[str] = mapped_column(
        String(10), default="fr", server_default="fr", nullable=False
    )
    operations_access: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    maintenance_access: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StaffPropertyAssignment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "staff_property_assignments"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id", "property_id", name="uq_staff_property_assignment"),
        ForeignKeyConstraint(["company_id", "user_id"], ["app_users.company_id", "app_users.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"),
    )

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    property_id: Mapped[UUID] = mapped_column(nullable=False, index=True)


class AuthSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["app_users.company_id", "app_users.id"],
            ondelete="CASCADE",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class UserInvitation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_invitations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["app_users.company_id", "app_users.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["company_id", "created_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            ondelete="CASCADE",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
