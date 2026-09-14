from datetime import datetime, timezone
from decimal import Decimal
import os
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.core.database import SessionLocal
from app.core.enums import BookingRecordType, BookingSource, BookingStatus, TicketStatus
from app.main import create_app
from app.modules.calendar.models import Booking
from app.modules.maintenance.models import Ticket
from app.modules.properties.models import Owner, Property


def alembic_config() -> Config:
    database_url = os.environ["DATABASE_URL"]
    assert (make_url(database_url).database or "").endswith("_test")
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


@pytest.fixture(scope="module", autouse=True)
def migrated_database() -> None:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_data() -> None:
    with SessionLocal() as db:
        db.execute(sa.text("TRUNCATE TABLE companies CASCADE"))
        db.commit()


@pytest.fixture
def client() -> TestClient:
    with TestClient(create_app()) as test_client:
        yield test_client


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get("vayca_csrf")
    assert token
    return {"X-CSRF-Token": token}


def register_manager(client: TestClient, suffix: str = "main") -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "company_name": f"Agency {suffix}",
            "name": f"Manager {suffix}",
            "email": f"manager-{suffix}-{uuid4().hex[:6]}@example.com",
            "password": "CorrectHorseBatteryStaple123!",
            "timezone": "Africa/Tunis",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_owner_crud_and_validation(client: TestClient) -> None:
    register_manager(client, suffix="crud")

    # 1. Create owner
    create_resp = client.post(
        "/api/v1/owners",
        json={
            "name": "Mohamed Ben Salah",
            "email": "mohamed@owner.tn",
            "phone": "+21698111222",
            "commission_percentage": "18.50",
            "notes": "VIP owner with multiple villas in Hammamet",
        },
        headers=csrf_headers(client),
    )
    assert create_resp.status_code == 201, create_resp.text
    owner = create_resp.json()
    owner_id = owner["id"]
    assert owner["name"] == "Mohamed Ben Salah"
    assert float(owner["commission_percentage"]) == 18.5
    assert owner["is_active"] is True
    assert owner["properties_count"] == 0

    # 2. List owners
    list_resp = client.get("/api/v1/owners")
    assert list_resp.status_code == 200
    owners = list_resp.json()
    assert len(owners) == 1
    assert owners[0]["id"] == owner_id

    # 3. Get owner by ID
    get_resp = client.get(f"/api/v1/owners/{owner_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Mohamed Ben Salah"

    # 4. Update owner
    update_resp = client.patch(
        f"/api/v1/owners/{owner_id}",
        json={"commission_percentage": "22.00", "notes": "Updated commission rate"},
        headers=csrf_headers(client),
    )
    assert update_resp.status_code == 200
    assert float(update_resp.json()["commission_percentage"]) == 22.0
    assert update_resp.json()["notes"] == "Updated commission rate"

    # 5. Commission percentage validation (ge=0, le=100)
    invalid_comm = client.post(
        "/api/v1/owners",
        json={"name": "Bad Owner", "commission_percentage": "150.00"},
        headers=csrf_headers(client),
    )
    assert invalid_comm.status_code == 422

    # 6. Deactivate owner
    del_resp = client.delete(f"/api/v1/owners/{owner_id}", headers=csrf_headers(client))
    assert del_resp.status_code == 204

    # Default list excludes inactive
    assert len(client.get("/api/v1/owners").json()) == 0
    # Query with include_inactive=true shows it
    assert len(client.get("/api/v1/owners?include_inactive=true").json()) == 1


def test_property_owner_attribution_and_tenant_isolation(client: TestClient) -> None:
    register_manager(client, suffix="company_a")

    # Create Owner for Company A
    owner_a = client.post(
        "/api/v1/owners",
        json={"name": "Owner A", "commission_percentage": "20.00"},
        headers=csrf_headers(client),
    ).json()

    # Create Property with owner_id
    prop_resp = client.post(
        "/api/v1/properties",
        json={
            "name": "Villa Jasmin",
            "city": "Hammamet",
            "country_code": "TN",
            "timezone": "Africa/Tunis",
            "owner_id": owner_a["id"],
        },
        headers=csrf_headers(client),
    )
    assert prop_resp.status_code == 201, prop_resp.text
    prop_data = prop_resp.json()
    assert prop_data["owner_id"] == owner_a["id"]
    assert prop_data["owner_name"] == "Owner A"

    # Owner's property count is now 1
    owner_detail = client.get(f"/api/v1/owners/{owner_a['id']}").json()
    assert owner_detail["properties_count"] == 1

    # Filter properties by owner_id
    filtered = client.get(f"/api/v1/properties?owner_id={owner_a['id']}").json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["name"] == "Villa Jasmin"

    # Now create Company B and try cross-company link
    client_b = TestClient(create_app())
    register_manager(client_b, suffix="company_b")

    # Attempting to assign Company A's owner to Company B's property must fail
    cross_link = client_b.post(
        "/api/v1/properties",
        json={
            "name": "Villa Sousse",
            "city": "Sousse",
            "owner_id": owner_a["id"],
        },
        headers=csrf_headers(client_b),
    )
    assert cross_link.status_code == 404
    assert cross_link.json()["code"] == "owner_not_found"


def test_monthly_owner_payout_statement_calculation_and_csv_export(client: TestClient) -> None:
    auth_data = register_manager(client, suffix="statement")
    company_id = auth_data["company"]["id"]
    user_id = auth_data["user"]["id"]

    # 1. Create Owner with 20% commission
    owner = client.post(
        "/api/v1/owners",
        json={"name": "Si Moncef", "commission_percentage": "20.00", "email": "moncef@owner.tn"},
        headers=csrf_headers(client),
    ).json()
    owner_id = owner["id"]

    # 2. Create Property linked to this owner
    prop = client.post(
        "/api/v1/properties",
        json={"name": "Dar Sidi Bou Said", "city": "Sidi Bou Said", "owner_id": owner_id},
        headers=csrf_headers(client),
    ).json()
    prop_id = prop["id"]

    # 3. Populate bookings in August 2026 directly in db
    with SessionLocal() as db:
        # Booking 1: Completed Aug 10, total 1200.000 TND (Confirmed)
        b1 = Booking(
            company_id=company_id,
            property_id=prop_id,
            source_type=BookingSource.DIRECT,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CONFIRMED,
            check_in=datetime(2026, 8, 5, 14, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
            guest_name="Guest Alpha",
            total_amount=Decimal("1200.000"),
            paid_amount=Decimal("1200.000"),
            payment_status="paid_in_full",
        )
        # Booking 2: Completed Aug 22, total 800.000 TND (Confirmed)
        b2 = Booking(
            company_id=company_id,
            property_id=prop_id,
            source_type=BookingSource.AIRBNB,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CONFIRMED,
            check_in=datetime(2026, 8, 15, 14, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 22, 10, 0, tzinfo=timezone.utc),
            guest_name="Guest Beta",
            total_amount=Decimal("800.000"),
            paid_amount=Decimal("800.000"),
            payment_status="paid_in_full",
        )
        # Booking 3: Cancelled booking in August -> must be EXCLUDED
        b3_cancelled = Booking(
            company_id=company_id,
            property_id=prop_id,
            source_type=BookingSource.DIRECT,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CANCELLED,
            check_in=datetime(2026, 8, 23, 14, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 28, 10, 0, tzinfo=timezone.utc),
            guest_name="Cancelled Guest",
            total_amount=Decimal("600.000"),
            paid_amount=Decimal("0.000"),
        )
        # Booking 4: Completed in September -> must be EXCLUDED from August statement
        b4_september = Booking(
            company_id=company_id,
            property_id=prop_id,
            source_type=BookingSource.DIRECT,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CONFIRMED,
            check_in=datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 9, 3, 10, 0, tzinfo=timezone.utc),
            guest_name="September Guest",
            total_amount=Decimal("750.000"),
            paid_amount=Decimal("750.000"),
        )
        db.add_all([b1, b2, b3_cancelled, b4_september])

        # 4. Maintenance Tickets
        # Ticket 1: Resolved Aug 14, cost 180.000 TND -> Included
        t1 = Ticket(
            company_id=company_id,
            property_id=prop_id,
            created_by_user_id=user_id,
            title="Pool pump repair",
            description="Replaced faulty capacitor",
            category="plumbing",
            status=TicketStatus.RESOLVED,
            resolved_at=datetime(2026, 8, 14, 16, 0, tzinfo=timezone.utc),
            cost=Decimal("180.000"),
        )
        # Ticket 2: Open ticket with cost 250.000 -> Not resolved, excluded from deduction
        t2_open = Ticket(
            company_id=company_id,
            property_id=prop_id,
            created_by_user_id=user_id,
            title="AC replacement",
            description="Compressor ordered",
            category="hvac",
            status=TicketStatus.OPEN,
            cost=Decimal("250.000"),
        )
        db.add_all([t1, t2_open])
        db.commit()

    # 5. Query company owner statements overview for 2026-08
    overview_resp = client.get("/api/v1/supervision/owner-statements?year=2026&month=8")
    assert overview_resp.status_code == 200
    overview = overview_resp.json()
    assert overview["year"] == 2026
    assert overview["month"] == 8
    assert overview["currency"] == "TND"
    assert overview["total_owners"] == 1
    assert overview["total_properties"] == 1

    # Gross = 1200 + 800 = 2000.000
    # Commission (20%) = 400.000
    # Maintenance = 180.000
    # Net Payout = 2000 - 400 - 180 = 1420.000
    assert float(overview["total_gross_revenue"]) == 2000.0
    assert float(overview["total_commission"]) == 400.0
    assert float(overview["total_maintenance_expenses"]) == 180.0
    assert float(overview["total_net_payout"]) == 1420.0

    # 6. Query single owner detailed statement for 2026-08
    stmt_resp = client.get(f"/api/v1/supervision/owner-statements/{owner_id}?year=2026&month=8")
    assert stmt_resp.status_code == 200
    statement = stmt_resp.json()
    assert statement["owner_name"] == "Si Moncef"
    assert float(statement["commission_percentage"]) == 20.0
    assert float(statement["gross_revenue"]) == 2000.0
    assert float(statement["commission_amount"]) == 400.0
    assert float(statement["maintenance_expenses"]) == 180.0
    assert float(statement["net_payout"]) == 1420.0
    assert len(statement["properties"]) == 1
    assert statement["properties"][0]["property_name"] == "Dar Sidi Bou Said"
    assert len(statement["bookings"]) == 2
    assert len(statement["maintenance_tickets"]) == 1

    # 7. CSV Export
    csv_resp = client.get(f"/api/v1/supervision/owner-statements/{owner_id}/export?year=2026&month=8")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "attachment;" in csv_resp.headers["content-disposition"]
    csv_body = csv_resp.text
    assert "VAYCA - OWNER PAYOUT STATEMENT" in csv_body
    assert "Si Moncef" in csv_body
    assert "2026-08" in csv_body
    assert "2000.000" in csv_body
    assert "400.000" in csv_body
    assert "180.000" in csv_body
    assert "1420.000" in csv_body
    assert "Dar Sidi Bou Said" in csv_body
    assert "Pool pump repair" in csv_body
