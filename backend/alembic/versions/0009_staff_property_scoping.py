"""add staff property assignments and capability flags

Revision ID: 0009_staff_property_scoping
Revises: 0008_owner_payouts
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_staff_property_scoping"
down_revision = "0008_owner_payouts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("app_users", sa.Column("operations_access", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("app_users", sa.Column("maintenance_access", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table(
        "staff_property_assignments",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "user_id"], ["app_users.company_id", "app_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id", "user_id", "property_id", name="uq_staff_property_assignment"),
    )
    op.create_index("ix_staff_property_assignments_company_id", "staff_property_assignments", ["company_id"])
    op.create_index("ix_staff_property_assignments_user_id", "staff_property_assignments", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_staff_property_assignments_user_id", table_name="staff_property_assignments")
    op.drop_index("ix_staff_property_assignments_company_id", table_name="staff_property_assignments")
    op.drop_table("staff_property_assignments")
    op.drop_column("app_users", "maintenance_access")
    op.drop_column("app_users", "operations_access")
