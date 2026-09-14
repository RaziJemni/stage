import os
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import IntegrityError


EXPECTED_TABLES = {
    "alembic_version",
    "app_users",
    "auth_sessions",
    "booking_pricing_decisions",
    "booking_conflict_bookings",
    "booking_conflicts",
    "bookings",
    "calendar_sync_runs",
    "channels",
    "companies",
    "contractors",
    "conversations",
    "messages",
    "owners",
    "properties",
    "property_pricing_profiles",
    "seasonal_pricing_rules",
    "staff_property_assignments",
    "ticket_assignments",
    "ticket_status_history",
    "ticket_suggestions",
    "tickets",
    "user_invitations",
}

EXPECTED_PARTIAL_INDEXES = {
    "uq_bookings_channel_external_event",
    "uq_channels_external_listing",
    "uq_conversations_open_identity",
    "uq_messages_external_id",
    "uq_ticket_assignments_active",
}


def require_test_database_url() -> str:
    database_url = os.environ["DATABASE_URL"]
    database_name = make_url(database_url).database or ""
    if not database_name.endswith("_test"):
        pytest.fail("Database schema tests require a database name ending in '_test'.")
    return database_url


def alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option(
        "sqlalchemy.url", require_test_database_url().replace("%", "%%")
    )
    return config


@pytest.fixture
def migrated_engine() -> Engine:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    engine = sa.create_engine(require_test_database_url())
    try:
        yield engine
    finally:
        engine.dispose()
        command.downgrade(config, "base")


def test_migration_creates_expected_tables_and_indexes(migrated_engine: Engine) -> None:
    inspector = sa.inspect(migrated_engine)
    assert set(inspector.get_table_names()) == EXPECTED_TABLES

    with migrated_engine.connect() as connection:
        index_names = set(
            connection.execute(
                sa.text(
                    "SELECT indexname FROM pg_indexes "
                    "WHERE schemaname = 'public' AND indexdef LIKE '% WHERE %'"
                )
            ).scalars()
        )
    assert index_names == EXPECTED_PARTIAL_INDEXES


def test_booking_conflict_acknowledgement_is_tenant_scoped(
    migrated_engine: Engine,
) -> None:
    inspector = sa.inspect(migrated_engine)
    columns = {column["name"] for column in inspector.get_columns("booking_conflicts")}
    assert {"acknowledged_at", "acknowledged_by_user_id"}.issubset(columns)

    foreign_keys = inspector.get_foreign_keys("booking_conflicts")
    assert any(
        foreign_key["name"] == "fk_booking_conflicts_company_acknowledged_by_user"
        and foreign_key["constrained_columns"]
        == ["company_id", "acknowledged_by_user_id"]
        and foreign_key["referred_table"] == "app_users"
        and foreign_key["referred_columns"] == ["company_id", "id"]
        for foreign_key in foreign_keys
    )


def test_staff_property_assignments_are_company_scoped(migrated_engine: Engine) -> None:
    inspector = sa.inspect(migrated_engine)
    columns = {column["name"] for column in inspector.get_columns("app_users")}
    assert {"operations_access", "maintenance_access"}.issubset(columns)
    foreign_keys = inspector.get_foreign_keys("staff_property_assignments")
    assert any(
        foreign_key["constrained_columns"] == ["company_id", "property_id"]
        and foreign_key["referred_table"] == "properties"
        for foreign_key in foreign_keys
    )


def test_downgrade_removes_application_tables() -> None:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    command.downgrade(config, "base")

    engine = sa.create_engine(require_test_database_url())
    try:
        remaining_tables = set(sa.inspect(engine).get_table_names())
    finally:
        engine.dispose()
        command.upgrade(config, "head")

    assert remaining_tables <= {"alembic_version"}


def test_cross_company_booking_is_rejected(migrated_engine: Engine) -> None:
    with migrated_engine.connect() as connection:
        transaction = connection.begin()
        connection.execute(
            sa.text(
                "INSERT INTO companies (id, name) VALUES "
                "('00000000-0000-0000-0000-000000000001', 'Tenant A'), "
                "('00000000-0000-0000-0000-000000000002', 'Tenant B')"
            )
        )
        connection.execute(
            sa.text(
                "INSERT INTO properties (id, company_id, name) VALUES "
                "('10000000-0000-0000-0000-000000000001', "
                "'00000000-0000-0000-0000-000000000001', 'Tenant A Property')"
            )
        )

        with pytest.raises(IntegrityError):
            connection.execute(
                sa.text(
                    "INSERT INTO bookings "
                    "(company_id, property_id, source_type, check_in, check_out, record_type) "
                    "VALUES "
                    "('00000000-0000-0000-0000-000000000002', "
                    "'10000000-0000-0000-0000-000000000001', "
                    "'manual', '2026-08-01T15:00:00Z', "
                    "'2026-08-03T11:00:00Z', 'reservation')"
                )
            )
        transaction.rollback()


def test_invalid_booking_date_range_is_rejected(migrated_engine: Engine) -> None:
    with migrated_engine.connect() as connection:
        transaction = connection.begin()
        connection.execute(
            sa.text(
                "INSERT INTO companies (id, name) VALUES "
                "('00000000-0000-0000-0000-000000000001', 'Tenant A')"
            )
        )
        connection.execute(
            sa.text(
                "INSERT INTO properties (id, company_id, name) VALUES "
                "('10000000-0000-0000-0000-000000000001', "
                "'00000000-0000-0000-0000-000000000001', 'Tenant A Property')"
            )
        )

        with pytest.raises(IntegrityError):
            connection.execute(
                sa.text(
                    "INSERT INTO bookings "
                    "(company_id, property_id, source_type, check_in, check_out, record_type) "
                    "VALUES "
                    "('00000000-0000-0000-0000-000000000001', "
                    "'10000000-0000-0000-0000-000000000001', "
                    "'manual', '2026-08-03T11:00:00Z', "
                    "'2026-08-01T15:00:00Z', 'reservation')"
                )
            )
        transaction.rollback()
