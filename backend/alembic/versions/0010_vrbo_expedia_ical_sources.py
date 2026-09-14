"""Add Vrbo and Expedia iCalendar source types.

Revision ID: 0010_vrbo_expedia_ical_sources
Revises: 0009_staff_property_scoping
Create Date: 2026-09-14
"""

from alembic import op


revision = "0010_vrbo_expedia_ical_sources"
down_revision = "0009_staff_property_scoping"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'vrbo'")
    op.execute("ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'expedia'")
    op.execute("ALTER TYPE booking_source ADD VALUE IF NOT EXISTS 'vrbo'")
    op.execute("ALTER TYPE booking_source ADD VALUE IF NOT EXISTS 'expedia'")


def downgrade() -> None:
    # PostgreSQL cannot remove enum values. Rebuild each enum after verifying
    # that the values introduced by this revision are not in use.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM channels WHERE channel_type::text IN ('vrbo', 'expedia')) THEN
                RAISE EXCEPTION 'Cannot downgrade: Vrbo or Expedia channels exist';
            END IF;
            IF EXISTS (SELECT 1 FROM bookings WHERE source_type::text IN ('vrbo', 'expedia')) THEN
                RAISE EXCEPTION 'Cannot downgrade: Vrbo or Expedia bookings exist';
            END IF;
        END $$;
        """
    )
    op.execute("ALTER TYPE channel_type RENAME TO channel_type_with_vrbo_expedia")
    op.execute("CREATE TYPE channel_type AS ENUM ('airbnb', 'booking_com', 'direct', 'other')")
    op.execute(
        "ALTER TABLE channels ALTER COLUMN channel_type TYPE channel_type "
        "USING channel_type::text::channel_type"
    )
    op.execute("DROP TYPE channel_type_with_vrbo_expedia")
    op.execute("ALTER TYPE booking_source RENAME TO booking_source_with_vrbo_expedia")
    op.execute(
        "CREATE TYPE booking_source AS ENUM ('airbnb', 'booking_com', 'direct', 'manual', 'other')"
    )
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN source_type TYPE booking_source "
        "USING source_type::text::booking_source"
    )
    op.execute("DROP TYPE booking_source_with_vrbo_expedia")
