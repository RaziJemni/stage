import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.database import SessionLocal
from app.main import create_app
from app.modules.calendar import service


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
    token = client.cookies.get(settings.csrf_cookie_name)
    assert token
    return {"X-CSRF-Token": token}


def register_manager(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "company_name": "Hammamet Operations",
            "name": "Manager User",
            "email": f"manager-{uuid4()}@example.com",
            "password": "secure-manager-password-123",
            "timezone": "Africa/Tunis",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def activate_staff(manager_client: TestClient) -> TestClient:
    invitation = manager_client.post(
        "/api/v1/team/invitations",
        json={"name": "Staff User", "email": f"staff-{uuid4()}@example.com"},
        headers=csrf_headers(manager_client),
    )
    assert invitation.status_code == 201, invitation.text
    token = parse_qs(urlparse(invitation.json()["invitation_url"]).query)["token"][0]
    staff_client = TestClient(manager_client.app)
    accepted = staff_client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "secure-staff-password-123"},
    )
    assert accepted.status_code == 200, accepted.text
    return staff_client


def create_property(client: TestClient, name: str = "Villa Yasmine") -> dict:
    response = client.post(
        "/api/v1/properties",
        json={"name": name, "city": "Hammamet"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()


def booking_payload(property_id: str, **overrides: str) -> dict:
    payload = {
        "property_id": property_id,
        "source_type": "direct",
        "record_type": "reservation",
        "status": "confirmed",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T10:00:00Z",
        "guest_name": "Sami Guest",
        "guest_contact": "+21620000000",
        "notes": "Direct WhatsApp reservation",
    }
    payload.update(overrides)
    return payload


def test_manager_and_staff_create_update_and_cancel_direct_bookings(
    client: TestClient,
) -> None:
    register_manager(client)
    property_data = create_property(client)
    staff_client = activate_staff(client)

    created = staff_client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"]),
        headers=csrf_headers(staff_client),
    )
    assert created.status_code == 201, created.text
    booking = created.json()
    assert booking["source_type"] == "direct"
    assert booking["record_type"] == "reservation"
    assert booking["status"] == "confirmed"

    updated = client.patch(
        f"/api/v1/bookings/{booking['id']}",
        json={
            "check_in": "2026-08-11T14:00:00Z",
            "check_out": "2026-08-13T10:00:00Z",
            "status": "tentative",
            "notes": "Guest is confirming transport.",
        },
        headers=csrf_headers(client),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "tentative"
    assert updated.json()["check_out"] == "2026-08-13T10:00:00Z"

    cancelled = staff_client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        headers=csrf_headers(staff_client),
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    edit_cancelled = client.patch(
        f"/api/v1/bookings/{booking['id']}",
        json={"notes": "Should fail"},
        headers=csrf_headers(client),
    )
    assert edit_cancelled.status_code == 409
    assert edit_cancelled.json()["code"] == "booking_cancelled"


def test_booking_dates_and_authentication_are_validated(client: TestClient) -> None:
    unauthenticated = client.post(
        "/api/v1/bookings",
        json=booking_payload(str(uuid4())),
    )
    assert unauthenticated.status_code == 401

    register_manager(client)
    property_data = create_property(client)

    missing_csrf = client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"]),
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["code"] == "csrf_invalid"

    invalid_range = client.post(
        "/api/v1/bookings",
        json=booking_payload(
            property_data["id"],
            check_in="2026-08-12T10:00:00Z",
            check_out="2026-08-12T10:00:00Z",
        ),
        headers=csrf_headers(client),
    )
    assert invalid_range.status_code == 422
    assert invalid_range.json()["code"] == "request_validation_failed"

    naive_timestamp = client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"], check_in="2026-08-10T14:00:00"),
        headers=csrf_headers(client),
    )
    assert naive_timestamp.status_code == 422


def test_cross_company_property_and_booking_access_is_rejected(client: TestClient) -> None:
    register_manager(client)
    property_data = create_property(client)
    created = client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"]),
        headers=csrf_headers(client),
    )
    assert created.status_code == 201

    other_client = TestClient(client.app)
    register_manager(other_client)

    create_other = other_client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"]),
        headers=csrf_headers(other_client),
    )
    assert create_other.status_code == 404
    assert create_other.json()["code"] == "property_not_found"

    cancel_other = other_client.post(
        f"/api/v1/bookings/{created.json()['id']}/cancel",
        headers=csrf_headers(other_client),
    )
    assert cancel_other.status_code == 404
    assert cancel_other.json()["code"] == "booking_not_found"


def test_availability_uses_active_bookings_and_excludes_cancelled_records(
    client: TestClient,
) -> None:
    manager = register_manager(client)
    property_data = create_property(client)
    company_id = manager["company"]["id"]

    confirmed = client.post(
        "/api/v1/bookings",
        json=booking_payload(property_data["id"]),
        headers=csrf_headers(client),
    )
    assert confirmed.status_code == 201

    blocked_period = client.post(
        "/api/v1/bookings",
        json=booking_payload(
            property_data["id"],
            source_type="manual",
            record_type="blocked_period",
            check_in="2026-08-20T00:00:00Z",
            check_out="2026-08-22T00:00:00Z",
        ),
        headers=csrf_headers(client),
    )
    assert blocked_period.status_code == 201

    with SessionLocal() as db:
        assert not service.is_available(
            db,
            company_id=company_id,
            property_id=property_data["id"],
            check_in=datetime(2026, 8, 11, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 13, 0, tzinfo=timezone.utc),
        )
        assert service.is_available(
            db,
            company_id=company_id,
            property_id=property_data["id"],
            check_in=datetime(2026, 8, 12, 10, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 13, 10, tzinfo=timezone.utc),
        )
        assert not service.is_available(
            db,
            company_id=company_id,
            property_id=property_data["id"],
            check_in=datetime(2026, 8, 21, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 21, 12, tzinfo=timezone.utc),
        )

    cancelled = client.post(
        f"/api/v1/bookings/{confirmed.json()['id']}/cancel",
        headers=csrf_headers(client),
    )
    assert cancelled.status_code == 200

    with SessionLocal() as db:
        assert service.is_available(
            db,
            company_id=company_id,
            property_id=property_data["id"],
            check_in=datetime(2026, 8, 11, 0, tzinfo=timezone.utc),
            check_out=datetime(2026, 8, 12, 0, tzinfo=timezone.utc),
        )
        with pytest.raises(ApiProblem) as invalid_range:
            service.is_available(
                db,
                company_id=company_id,
                property_id=property_data["id"],
                check_in=datetime(2026, 8, 15, 0, tzinfo=timezone.utc),
                check_out=datetime(2026, 8, 15, 0, tzinfo=timezone.utc),
            )
        assert invalid_range.value.code == "availability_date_range_invalid"
