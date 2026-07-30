"""add authentication sessions and invitations

Revision ID: 0002_authentication_sessions
Revises: 0001_initial_schema
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_authentication_sessions"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def uuid_column(name: str = "id") -> sa.Column:
    return sa.Column(
        name,
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"),
        nullable=False,
    )


def timestamp_columns() -> tuple[sa.Column, sa.Column]:
    return (
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def upgrade() -> None:
    op.execute("UPDATE app_users SET email = lower(btrim(email))")
    op.create_check_constraint(
        op.f("ck_app_users_email_normalized"),
        "app_users",
        "email = lower(btrim(email))",
    )

    op.create_table(
        "auth_sessions",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("csrf_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_auth_sessions_company_id_companies"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["app_users.company_id", "app_users.id"],
            name=op.f("fk_auth_sessions_company_id_user_id_app_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_auth_sessions_token_hash")),
    )
    op.create_index(op.f("ix_auth_sessions_company_id"), "auth_sessions", ["company_id"])
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"])
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"])
    op.create_index(op.f("ix_auth_sessions_revoked_at"), "auth_sessions", ["revoked_at"])

    op.create_table(
        "user_invitations",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_user_invitations_company_id_companies"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["app_users.company_id", "app_users.id"],
            name=op.f("fk_user_invitations_company_id_user_id_app_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "created_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name=op.f("fk_user_invitations_company_id_created_by_user_id_app_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_invitations")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_invitations_token_hash")),
    )
    op.create_index(
        op.f("ix_user_invitations_company_id"), "user_invitations", ["company_id"]
    )
    op.create_index(op.f("ix_user_invitations_user_id"), "user_invitations", ["user_id"])
    op.create_index(
        op.f("ix_user_invitations_expires_at"), "user_invitations", ["expires_at"]
    )


def downgrade() -> None:
    op.drop_table("user_invitations")
    op.drop_table("auth_sessions")
    op.drop_constraint(op.f("ck_app_users_email_normalized"), "app_users", type_="check")
