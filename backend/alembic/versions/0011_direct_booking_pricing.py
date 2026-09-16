"""Add direct-booking pricing profiles and seasonal rules.

Revision ID: 0011_direct_booking_pricing
Revises: 0010_vrbo_expedia_ical_sources
"""
from alembic import op
import sqlalchemy as sa

revision = "0011_direct_booking_pricing"
down_revision = "0010_vrbo_expedia_ical_sources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("property_pricing_profiles", sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False), sa.Column("company_id", sa.UUID(), nullable=False), sa.Column("property_id", sa.UUID(), nullable=False), sa.Column("base_nightly_rate", sa.Numeric(10, 3), nullable=False), sa.Column("weekend_adjustment_percent", sa.Numeric(5, 2), server_default="0", nullable=False), sa.Column("minimum_nights", sa.Integer(), server_default="1", nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"), sa.UniqueConstraint("company_id", "property_id", name="uq_property_pricing_profile"), sa.CheckConstraint("base_nightly_rate >= 0", name="pricing_base_rate_nonnegative"), sa.CheckConstraint("weekend_adjustment_percent >= -100", name="pricing_weekend_adjustment_valid"), sa.CheckConstraint("minimum_nights >= 1", name="pricing_minimum_nights_positive"))
    op.create_table("seasonal_pricing_rules", sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False), sa.Column("company_id", sa.UUID(), nullable=False), sa.Column("property_id", sa.UUID(), nullable=False), sa.Column("name", sa.String(100), nullable=False), sa.Column("start_date", sa.Date(), nullable=False), sa.Column("end_date", sa.Date(), nullable=False), sa.Column("nightly_rate", sa.Numeric(10, 3), nullable=False), sa.Column("minimum_nights", sa.Integer()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], ondelete="CASCADE"), sa.CheckConstraint("end_date >= start_date", name="seasonal_pricing_date_range"), sa.CheckConstraint("nightly_rate >= 0", name="seasonal_pricing_rate_nonnegative"), sa.CheckConstraint("minimum_nights IS NULL OR minimum_nights >= 1", name="seasonal_pricing_minimum_nights_positive"))
    op.create_index("ix_pricing_profiles_company", "property_pricing_profiles", ["company_id"])
    op.create_index("ix_seasonal_pricing_rules_company", "seasonal_pricing_rules", ["company_id"])


def downgrade() -> None:
    op.drop_table("seasonal_pricing_rules")
    op.drop_table("property_pricing_profiles")
