import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import create_app


def alembic_config() -> Config:
    database_url = os.environ["DATABASE_URL"]
    assert (make_url(database_url).database or "").endswith("_test")
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


@pytest.fixture(scope="module", autouse=True)
def migrated_supervision_database() -> None:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_supervision_data() -> None:
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
            "company_name": "Supervision Agency",
            "name": "Supervision Manager",
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
        json={"name": "Supervision Staff", "email": f"staff-{uuid4()}@example.com"},
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


def test_whatsapp_health_requires_manager(client: TestClient) -> None:
    assert client.get("/api/v1/integrations/whatsapp/health").status_code == 401

    register_manager(client)
    staff_client = activate_staff(client)
    response = staff_client.get("/api/v1/integrations/whatsapp/health")
    assert response.status_code == 403
    assert response.json()["code"] == "manager_required"


@pytest.mark.parametrize(
    ("mode", "health_status", "detail"),
    [
        ("simulator", "simulator", "Local simulator only; no WhatsApp messages are sent."),
        ("test", "test", "Provider test mode; production delivery is not connected."),
        ("production", "unconfigured", "Production WhatsApp adapter is not configured."),
    ],
)
def test_whatsapp_health_maps_mode_without_exposing_secrets(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    mode: str,
    health_status: str,
    detail: str,
) -> None:
    monkeypatch.setattr(settings, "whatsapp_mode", mode)
    register_manager(client)

    response = client.get("/api/v1/integrations/whatsapp/health")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload == {
        "integration": "whatsapp",
        "mode": mode,
        "health_status": health_status,
        "detail": detail,
    }
    assert "whatsapp_simulator_webhook_secret" not in response.text
    assert settings.whatsapp_simulator_webhook_secret not in response.text


def test_analytics_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/supervision/analytics")
    assert response.status_code == 401


def test_analytics_empty_portfolio(client: TestClient) -> None:
    register_manager(client)
    response = client.get("/api/v1/supervision/analytics")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total_properties"] == 0
    assert data["occupancy_rate"] == 0.0
    assert data["total_booked_nights"] == 0
    assert data["total_reservations"] == 0
    assert data["average_length_of_stay"] == 0.0
    assert data["channel_distribution"] == []
    assert data["property_insights"] == []


def test_analytics_calculates_occupancy_and_channel_distribution(client: TestClient) -> None:
    from datetime import UTC, datetime, timedelta
    from uuid import UUID
    from app.core.enums import BookingRecordType, BookingSource, BookingStatus, PropertyStatus
    from app.modules.calendar.models import Booking
    from app.modules.properties.models import Property

    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    day1 = now + timedelta(days=1)
    day6 = now + timedelta(days=6)  # 5 nights
    day10 = now + timedelta(days=10)
    day14 = now + timedelta(days=14)  # 4 nights
    day15 = now + timedelta(days=15)
    day20 = now + timedelta(days=20)  # 5 nights (cancelled)

    with SessionLocal() as db:
        prop1 = Property(
            company_id=company_id,
            name="Villa Azure",
            status=PropertyStatus.ACTIVE,
        )
        prop2 = Property(
            company_id=company_id,
            name="Dar Jasmin",
            status=PropertyStatus.ACTIVE,
        )
        db.add_all([prop1, prop2])
        db.commit()
        db.refresh(prop1)
        db.refresh(prop2)

        # Booking 1: Direct, 5 nights on prop1
        b1 = Booking(
            company_id=company_id,
            property_id=prop1.id,
            source_type=BookingSource.DIRECT,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CONFIRMED,
            check_in=day1,
            check_out=day6,
            guest_name="Direct Guest",
        )
        # Booking 2: Airbnb, 4 nights on prop1
        b2 = Booking(
            company_id=company_id,
            property_id=prop1.id,
            source_type=BookingSource.AIRBNB,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CONFIRMED,
            check_in=day10,
            check_out=day14,
            guest_name="Airbnb Guest",
        )
        # Booking 3: Cancelled on prop2 (must NOT count towards occupancy)
        b3 = Booking(
            company_id=company_id,
            property_id=prop2.id,
            source_type=BookingSource.BOOKING_COM,
            record_type=BookingRecordType.RESERVATION,
            status=BookingStatus.CANCELLED,
            check_in=day15,
            check_out=day20,
            guest_name="Cancelled Guest",
        )
        db.add_all([b1, b2, b3])
        db.commit()

    response = client.get("/api/v1/supervision/analytics?window_days=30")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["window_days"] == 30
    assert data["total_properties"] == 2
    assert data["total_booked_nights"] == 9  # 5 + 4
    assert data["total_reservations"] == 2
    assert data["average_length_of_stay"] == 4.5  # (5 + 4) / 2
    # 2 properties * 30 days = 60 room-nights. 9 / 60 = 15.0%
    assert data["occupancy_rate"] == 15.0

    channels = {c["channel_key"]: c for c in data["channel_distribution"]}
    assert "direct" in channels
    assert channels["direct"]["count"] == 1
    assert channels["direct"]["nights"] == 5
    assert channels["direct"]["percentage"] == round((5 / 9) * 100, 1)

    assert "airbnb" in channels
    assert channels["airbnb"]["count"] == 1
    assert channels["airbnb"]["nights"] == 4
    assert channels["airbnb"]["percentage"] == round((4 / 9) * 100, 1)

    insights = {p["property_name"]: p for p in data["property_insights"]}
    assert "Villa Azure" in insights
    assert insights["Villa Azure"]["booked_nights"] == 9
    assert insights["Villa Azure"]["occupancy_rate"] == 30.0

    assert "Dar Jasmin" in insights
    assert insights["Dar Jasmin"]["booked_nights"] == 0
    assert insights["Dar Jasmin"]["occupancy_rate"] == 0.0


def test_analytics_tenant_isolation(client: TestClient) -> None:
    from uuid import UUID
    from app.core.enums import PropertyStatus
    from app.modules.properties.models import Property

    manager1 = register_manager(client)
    company1_id = UUID(manager1["company"]["id"])

    with SessionLocal() as db:
        prop = Property(company_id=company1_id, name="Company 1 Villa", status=PropertyStatus.ACTIVE)
        db.add(prop)
        db.commit()

    with TestClient(client.app) as other_client:
        register_manager(other_client)
        res = other_client.get("/api/v1/supervision/analytics")
        assert res.status_code == 200
        assert res.json()["total_properties"] == 0
        assert res.json()["total_booked_nights"] == 0

