import os
from datetime import datetime, timedelta, timezone
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
from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    ChannelType,
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    SenderType,
    TicketPriority,
    TicketStatus,
)
from app.main import create_app
from app.modules.properties.models import Channel, Property


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
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get(settings.csrf_cookie_name)
    assert token
    return {"X-CSRF-Token": token}


def register_fresh_manager(client: TestClient) -> dict:
    unique_email = f"manager-{uuid4()}@example.com"
    payload = {
        "company_name": "Tunisian Luxury Agency",
        "name": "Fresh Manager",
        "email": unique_email,
        "password": "secure-manager-password-123",
        "timezone": "Africa/Tunis",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def invite_and_activate_fresh_staff(
    manager_client: TestClient,
) -> TestClient:
    staff_email = f"staff-{uuid4()}@example.com"
    invite_resp = manager_client.post(
        "/api/v1/team/invitations",
        json={"name": "Fresh Staff", "email": staff_email},
        headers=csrf_headers(manager_client),
    )
    assert invite_resp.status_code == 201, invite_resp.text
    token = parse_qs(urlparse(invite_resp.json()["invitation_url"]).query)["token"][0]

    staff_client = TestClient(manager_client.app)
    accept_resp = staff_client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "staff-secure-password-123"},
    )
    assert accept_resp.status_code == 200, accept_resp.text
    return staff_client


def test_manager_can_create_list_update_get_and_archive_property(client: TestClient) -> None:
    register_fresh_manager(client)

    create_payload = {
        "name": "Villa Yasmine",
        "address_line1": "Jasmin Zone",
        "city": "Hammamet",
        "postal_code": "8050",
        "country_code": "TN",
        "timezone": "Africa/Tunis",
        "max_guests": 8,
        "check_in_time": "15:00:00",
        "check_out_time": "11:00:00",
        "wifi_network": "VillaYasmine_5G_Guests",
        "wifi_password": "HammametBeach2026!",
        "parking_info": "Private garage parking",
        "house_rules": "No loud music outside after 22:00",
        "emergency_contact": "+216 98 420 112",
        "external_booking_url": "https://booking.example.com/yasmine",
    }

    create_resp = client.post(
        "/api/v1/properties",
        json=create_payload,
        headers=csrf_headers(client),
    )
    assert create_resp.status_code == 201, create_resp.text
    prop_data = create_resp.json()
    prop_id = prop_data["id"]

    assert prop_data["name"] == "Villa Yasmine"
    assert prop_data["city"] == "Hammamet"
    assert prop_data["max_guests"] == 8
    assert prop_data["status"] == "active"
    assert prop_data["wifi_password"] == "HammametBeach2026!"

    list_resp = client.get("/api/v1/properties")
    assert list_resp.status_code == 200, list_resp.text
    list_json = list_resp.json()
    assert list_json["total"] == 1
    assert list_json["items"][0]["id"] == prop_id

    get_resp = client.get(f"/api/v1/properties/{prop_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == prop_id

    patch_resp = client.patch(
        f"/api/v1/properties/{prop_id}",
        json={
            "name": "Villa Yasmine Resort & Spa",
            "max_guests": 10,
            "wifi_password": None,
        },
        headers=csrf_headers(client),
    )
    assert patch_resp.status_code == 200
    patched_data = patch_resp.json()
    assert patched_data["name"] == "Villa Yasmine Resort & Spa"
    assert patched_data["max_guests"] == 10
    assert patched_data["wifi_password"] is None

    archive_resp = client.post(
        f"/api/v1/properties/{prop_id}/archive",
        headers=csrf_headers(client),
    )
    assert archive_resp.status_code == 200
    assert archive_resp.json()["status"] == "archived"
    assert archive_resp.json()["archived_at"] is not None

    # Verify editing or re-archiving an archived property returns 409 Conflict
    patch_archived = client.patch(
        f"/api/v1/properties/{prop_id}",
        json={"name": "Should Fail"},
        headers=csrf_headers(client),
    )
    assert patch_archived.status_code == 409
    assert patch_archived.json()["code"] == "property_archived"

    rearchive = client.post(
        f"/api/v1/properties/{prop_id}/archive",
        headers=csrf_headers(client),
    )
    assert rearchive.status_code == 409
    assert rearchive.json()["code"] == "property_archived"

    list_active_archived = client.get("/api/v1/properties")
    assert list_active_archived.status_code == 200
    assert list_active_archived.json()["total"] == 0

    list_all = client.get("/api/v1/properties?include_archived=true")
    assert list_all.status_code == 200
    assert list_all.json()["total"] == 1

    # Test unarchiving property back to active
    unarchive_resp = client.post(
        f"/api/v1/properties/{prop_id}/unarchive",
        headers=csrf_headers(client),
    )
    assert unarchive_resp.status_code == 200
    assert unarchive_resp.json()["status"] == "active"
    assert unarchive_resp.json()["archived_at"] is None

    list_active_restored = client.get("/api/v1/properties")
    assert list_active_restored.status_code == 200
    assert list_active_restored.json()["total"] == 1


def test_staff_can_read_property_but_cannot_create_update_or_archive(
    client: TestClient,
) -> None:
    register_fresh_manager(client)
    staff_client = invite_and_activate_fresh_staff(client)

    create_resp = client.post(
        "/api/v1/properties",
        json={"name": "Dar El Bey", "city": "Sidi Bou Said"},
        headers=csrf_headers(client),
    )
    assert create_resp.status_code == 201
    prop_id = create_resp.json()["id"]

    staff_list = staff_client.get("/api/v1/properties")
    assert staff_list.status_code == 200
    assert staff_list.json()["total"] == 1

    staff_get = staff_client.get(f"/api/v1/properties/{prop_id}")
    assert staff_get.status_code == 200
    assert staff_get.json()["name"] == "Dar El Bey"

    staff_create = staff_client.post(
        "/api/v1/properties",
        json={"name": "Unauthorized Staff Villa"},
        headers=csrf_headers(staff_client),
    )
    assert staff_create.status_code == 403
    assert staff_create.json()["code"] == "manager_required"

    staff_patch = staff_client.patch(
        f"/api/v1/properties/{prop_id}",
        json={"name": "Hacked Name"},
        headers=csrf_headers(staff_client),
    )
    assert staff_patch.status_code == 403
    assert staff_patch.json()["code"] == "manager_required"

    staff_archive = staff_client.post(
        f"/api/v1/properties/{prop_id}/archive",
        headers=csrf_headers(staff_client),
    )
    assert staff_archive.status_code == 403
    assert staff_archive.json()["code"] == "manager_required"


def test_cross_company_isolation_for_properties(client: TestClient) -> None:
    register_fresh_manager(client)
    prop_a = client.post(
        "/api/v1/properties",
        json={"name": "Company A Beach House", "city": "Tunis"},
        headers=csrf_headers(client),
    ).json()
    prop_a_id = prop_a["id"]

    other_client = TestClient(client.app)
    register_fresh_manager(other_client)

    get_other = other_client.get(f"/api/v1/properties/{prop_a_id}")
    assert get_other.status_code == 404
    assert get_other.json()["code"] == "property_not_found"

    patch_other = other_client.patch(
        f"/api/v1/properties/{prop_a_id}",
        json={"name": "Hijacked House"},
        headers=csrf_headers(other_client),
    )
    assert patch_other.status_code == 404

    archive_other = other_client.post(
        f"/api/v1/properties/{prop_a_id}/archive",
        headers=csrf_headers(other_client),
    )
    assert archive_other.status_code == 404

    list_other = other_client.get("/api/v1/properties")
    assert list_other.status_code == 200
    assert list_other.json()["total"] == 0


def test_validation_errors_and_unauthenticated_access(client: TestClient) -> None:
    unauth_resp = client.get("/api/v1/properties")
    assert unauth_resp.status_code == 401
    assert unauth_resp.json()["code"] == "authentication_required"

    register_fresh_manager(client)

    empty_name_resp = client.post(
        "/api/v1/properties",
        json={"name": "   "},
        headers=csrf_headers(client),
    )
    assert empty_name_resp.status_code == 422
    assert empty_name_resp.json()["code"] == "request_validation_failed"

    # Test PATCH {"name": null} returns 422
    null_patch_resp = client.patch(
        "/api/v1/properties/00000000-0000-0000-0000-000000000000",
        json={"name": None},
        headers=csrf_headers(client),
    )
    assert null_patch_resp.status_code == 422
    assert null_patch_resp.json()["code"] == "request_validation_failed"

    invalid_guests_resp = client.post(
        "/api/v1/properties",
        json={"name": "Valid Villa", "max_guests": 0},
        headers=csrf_headers(client),
    )
    assert invalid_guests_resp.status_code == 422

    forbidden_extra_resp = client.post(
        "/api/v1/properties",
        json={"name": "Valid Villa", "company_id": "00000000-0000-0000-0000-000000000000"},
        headers=csrf_headers(client),
    )
    assert forbidden_extra_resp.status_code == 422

    no_csrf_resp = client.post(
        "/api/v1/properties",
        json={"name": "Valid Villa"},
    )
    assert no_csrf_resp.status_code == 403
    assert no_csrf_resp.json()["code"] == "csrf_invalid"


def test_archiving_property_preserves_historical_bookings_messages_and_tickets(
    client: TestClient,
) -> None:
    manager_info = register_fresh_manager(client)
    company_id = manager_info["company"]["id"]
    user_id = manager_info["user"]["id"]

    create_resp = client.post(
        "/api/v1/properties",
        json={"name": "Historic Villa Carthage", "city": "Tunis"},
        headers=csrf_headers(client),
    )
    assert create_resp.status_code == 201
    prop_id = create_resp.json()["id"]

    # Insert linked historical records in DB
    now = datetime.now(timezone.utc)
    later = now + timedelta(days=1)
    with SessionLocal() as db:
        db.execute(
            sa.text(
                """
                INSERT INTO channels (id, company_id, property_id, channel_type, is_active)
                VALUES (:id, :company_id, :property_id, 'airbnb', true)
                """
            ),
            {"id": uuid4(), "company_id": company_id, "property_id": prop_id},
        )
        db.execute(
            sa.text(
                """
                INSERT INTO bookings (id, company_id, property_id, source_type, check_in, check_out, status, record_type)
                VALUES (:id, :company_id, :property_id, 'direct', :now, :later, 'confirmed', 'reservation')
                """
            ),
            {
                "id": uuid4(),
                "company_id": company_id,
                "property_id": prop_id,
                "now": now,
                "later": later,
            },
        )
        conv_id = uuid4()
        db.execute(
            sa.text(
                """
                INSERT INTO conversations (id, company_id, property_id, guest_contact_identifier, status, handling_mode)
                VALUES (:id, :company_id, :property_id, '+21699887766', 'open', 'automatic')
                """
            ),
            {"id": conv_id, "company_id": company_id, "property_id": prop_id},
        )
        db.execute(
            sa.text(
                """
                INSERT INTO messages (id, company_id, conversation_id, direction, sender_type, content, delivery_status)
                VALUES (:id, :company_id, :conv_id, 'inbound', 'guest', 'Hello villa!', 'received')
                """
            ),
            {"id": uuid4(), "company_id": company_id, "conv_id": conv_id},
        )
        db.execute(
            sa.text(
                """
                INSERT INTO tickets (id, company_id, property_id, title, description, priority, status, created_by_user_id)
                VALUES (:id, :company_id, :property_id, 'AC Fix', 'Fix AC unit', 'medium', 'open', :user_id)
                """
            ),
            {"id": uuid4(), "company_id": company_id, "property_id": prop_id, "user_id": user_id},
        )
        db.commit()

    # Archive the property via API
    archive_resp = client.post(
        f"/api/v1/properties/{prop_id}/archive",
        headers=csrf_headers(client),
    )
    assert archive_resp.status_code == 200
    assert archive_resp.json()["status"] == "archived"

    # Assert DB historical integrity: property is archived, linked history is preserved intact
    with SessionLocal() as db:
        prop = db.scalar(sa.select(Property).where(Property.id == prop_id))
        assert prop is not None
        assert prop.status.value == "archived"

        channels_count = db.scalar(
            sa.text("SELECT count(*) FROM channels WHERE property_id = :p_id"),
            {"p_id": prop_id},
        )
        bookings_count = db.scalar(
            sa.text("SELECT count(*) FROM bookings WHERE property_id = :p_id"),
            {"p_id": prop_id},
        )
        conversations_count = db.scalar(
            sa.text("SELECT count(*) FROM conversations WHERE property_id = :p_id"),
            {"p_id": prop_id},
        )
        tickets_count = db.scalar(
            sa.text("SELECT count(*) FROM tickets WHERE property_id = :p_id"),
            {"p_id": prop_id},
        )

        assert channels_count == 1
        assert bookings_count == 1
        assert conversations_count == 1
        assert tickets_count == 1
