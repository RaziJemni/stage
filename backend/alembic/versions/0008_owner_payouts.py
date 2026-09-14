"""add owner contact entity, property attribution, and ticket cost

Revision ID: 0008_owner_payouts
Revises: 0007_booking_payment_tracking
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_owner_payouts"
down_revision = "0007_booking_payment_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create owners table
    op.create_table(
        "owners",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(40), nullable=True),
        sa.Column(
            "commission_percentage",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="20.00",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("company_id", "id", name="uq_owners_company_id_id"),
        sa.CheckConstraint(
            "commission_percentage >= 0 AND commission_percentage <= 100",
            name="ck_owners_commission_range",
        ),
    )
    op.create_index("ix_owners_company_id", "owners", ["company_id"])

    # 2. Add owner_id to properties table
    op.add_column("properties", sa.Column("owner_id", sa.UUID(), nullable=True))
    op.create_index("ix_properties_owner_id", "properties", ["owner_id"])
    op.create_foreign_key(
        "fk_properties_company_owner",
        "properties",
        "owners",
        ["company_id", "owner_id"],
        ["company_id", "id"],
        ondelete="SET NULL",
    )

    # 3. Add cost to tickets table
    op.add_column("tickets", sa.Column("cost", sa.Numeric(10, 3), nullable=True))
    op.create_check_constraint(
        "ck_tickets_cost_non_negative",
        "tickets",
        "cost IS NULL OR cost >= 0",
    )


def downgrade() -> None:
    # 3. Drop cost from tickets
    op.drop_constraint("ck_tickets_cost_non_negative", "tickets", type_="check")
    op.drop_column("tickets", "cost")

    # 2. Drop owner_id from properties
    op.drop_constraint("fk_properties_company_owner", "properties", type_="foreignkey")
    op.drop_index("ix_properties_owner_id", table_name="properties")
    op.drop_column("properties", "owner_id")

    # 1. Drop owners table
    op.drop_index("ix_owners_company_id", table_name="owners")
    op.drop_table("owners")
