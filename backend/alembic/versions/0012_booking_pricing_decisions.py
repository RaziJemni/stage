"""Record approved direct-booking pricing decisions.

Revision ID: 0012_booking_pricing_decisions
Revises: 0011_direct_booking_pricing
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0012_booking_pricing_decisions"
down_revision = "0011_direct_booking_pricing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "booking_pricing_decisions",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("booking_id", sa.UUID(), nullable=False),
        sa.Column("approved_by_user_id", sa.UUID(), nullable=False),
        sa.Column("quoted_total", sa.Numeric(10, 3), nullable=False),
        sa.Column("approved_total", sa.Numeric(10, 3), nullable=False),
        sa.Column("override_reason", sa.Text(), nullable=True),
        sa.Column("quote_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id", "booking_id"], ["bookings.company_id", "bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "approved_by_user_id"], ["app_users.company_id", "app_users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("company_id", "booking_id", name="uq_booking_pricing_decision"),
        sa.CheckConstraint("quoted_total >= 0", name="booking_pricing_quoted_total_nonnegative"),
        sa.CheckConstraint("approved_total >= 0", name="booking_pricing_approved_total_nonnegative"),
    )
    op.create_index("ix_booking_pricing_decisions_company", "booking_pricing_decisions", ["company_id"])


def downgrade() -> None:
    op.drop_table("booking_pricing_decisions")
