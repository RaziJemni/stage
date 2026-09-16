"""add booking conflict acknowledgement metadata

Revision ID: 0003_conflict_ack
Revises: 0002_authentication_sessions
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0003_conflict_ack"
down_revision: Union[str, None] = "0002_authentication_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "booking_conflicts",
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "booking_conflicts",
        sa.Column(
            "acknowledged_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_booking_conflicts_company_acknowledged_by_user",
        "booking_conflicts",
        "app_users",
        ["company_id", "acknowledged_by_user_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_booking_conflicts_company_acknowledged_by_user",
        "booking_conflicts",
        type_="foreignkey",
    )
    op.drop_column("booking_conflicts", "acknowledged_by_user_id")
    op.drop_column("booking_conflicts", "acknowledged_at")
