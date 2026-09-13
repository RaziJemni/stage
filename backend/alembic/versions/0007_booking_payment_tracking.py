"""add booking payment tracking and folio fields

Revision ID: 0007_booking_payment_tracking
Revises: 0006_user_preferred_language
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007_booking_payment_tracking"
down_revision = "0006_user_preferred_language"
branch_labels = None
depends_on = None

payment_status_enum = postgresql.ENUM(
    "unpaid", "deposit_received", "paid_in_full",
    name="payment_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        payment_status_enum.create(bind, checkfirst=True)
        status_column_type = payment_status_enum
    else:
        status_column_type = sa.String(20)

    op.add_column("bookings", sa.Column("payment_status", status_column_type, nullable=True))
    op.add_column("bookings", sa.Column("total_amount", sa.Numeric(10, 3), nullable=True))
    op.add_column("bookings", sa.Column("paid_amount", sa.Numeric(10, 3), nullable=True))
    op.add_column("bookings", sa.Column("payment_method", sa.String(50), nullable=True))

    op.create_check_constraint(
        "ck_bookings_total_amount_positive",
        "bookings",
        "total_amount IS NULL OR total_amount >= 0",
    )
    op.create_check_constraint(
        "ck_bookings_paid_amount_positive",
        "bookings",
        "paid_amount IS NULL OR paid_amount >= 0",
    )
    op.create_check_constraint(
        "ck_bookings_payment_method_valid",
        "bookings",
        "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'card', 'check', 'other')",
    )
    op.create_index("ix_bookings_payment_status", "bookings", ["payment_status"])


def downgrade() -> None:
    op.drop_index("ix_bookings_payment_status", table_name="bookings")
    op.drop_constraint("ck_bookings_payment_method_valid", "bookings", type_="check")
    op.drop_constraint("ck_bookings_paid_amount_positive", "bookings", type_="check")
    op.drop_constraint("ck_bookings_total_amount_positive", "bookings", type_="check")

    op.drop_column("bookings", "payment_method")
    op.drop_column("bookings", "paid_amount")
    op.drop_column("bookings", "total_amount")
    op.drop_column("bookings", "payment_status")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        payment_status_enum.drop(bind, checkfirst=True)
