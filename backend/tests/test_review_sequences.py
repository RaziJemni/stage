from datetime import UTC, datetime, timedelta
import os
from pathlib import Path
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy import select
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
    ConversationStatus,
    DeliveryStatus,
    HandlingMode,
    MessageDirection,
    PropertyStatus,
    SenderType,
    TicketPriority,
    TicketStatus,
)
from app.main import create_app
from app.modules.calendar.models import Booking
from app.modules.maintenance.models import Ticket
from app.modules.messaging.models import Conversation, Message
from app.modules.properties.models import Property


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
            "company_name": "Review Agency",
            "name": "Review Manager",
            "email": f"manager-{uuid4()}@example.com",
            "password": "secure-manager-password-123",
            "timezone": "Africa/Tunis",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_trigger_review_requests_requires_authentication(client: TestClient) -> None:
    res = client.post("/api/v1/communication/review-requests/trigger")
    assert res.status_code == 401


def test_trigger_review_requests_sends_to_completed_stay(client: TestClient) -> None:
    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    check_in = now - timedelta(days=4)
    check_out = now - timedelta(hours=3)

    with SessionLocal() as db:
        prop = Property(
            company_id=company_id,
            name="Villa Carthage",
            status=PropertyStatus.ACTIVE,
        )
        db.add(prop)
        db.commit()
        db.refresh(prop)

        booking = Booking(
            company_id=company_id,
            property_id=prop.id,
            guest_name="Sarah Connor",
            guest_contact="+21620111222",
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.DIRECT,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        booking_id = booking.id

    # Trigger review request sequence
    res = client.post(
        "/api/v1/communication/review-requests/trigger",
        headers=csrf_headers(client),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["processed_count"] == 1
    assert data["sent_count"] == 1
    assert data["skipped_count"] == 0
    assert data["evaluations"][0]["status"] == "sent"
    assert data["evaluations"][0]["guest_name"] == "Sarah Connor"

    # Verify database message and payload
    with SessionLocal() as db:
        msg = db.scalar(
            select(Message).where(
                Message.company_id == company_id,
                Message.external_message_id == f"review-request-{booking_id}",
            )
        )
        assert msg is not None
        assert msg.sender_type == SenderType.SYSTEM
        assert msg.direction == MessageDirection.OUTBOUND
        assert msg.automatically_sent is True
        assert msg.delivery_status == DeliveryStatus.QUEUED
        assert "Sarah Connor" in msg.content
        assert "Villa Carthage" in msg.content

        updated_booking = db.scalar(select(Booking).where(Booking.id == booking_id))
        assert updated_booking.raw_payload["review_request"]["status"] == "sent"

    # Verify idempotency: re-triggering does NOT re-send
    res2 = client.post(
        "/api/v1/communication/review-requests/trigger",
        headers=csrf_headers(client),
    )
    assert res2.status_code == 200
    assert res2.json()["processed_count"] == 0


def test_review_request_safety_suppression_on_urgent_ticket(client: TestClient) -> None:
    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    check_in = now - timedelta(days=3)
    check_out = now - timedelta(hours=2)

    with SessionLocal() as db:
        prop = Property(
            company_id=company_id,
            name="Villa Djerba",
            status=PropertyStatus.ACTIVE,
        )
        db.add(prop)
        db.commit()
        db.refresh(prop)

        booking = Booking(
            company_id=company_id,
            property_id=prop.id,
            guest_name="Unhappy Guest",
            guest_contact="+21620333444",
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.AIRBNB,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Urgent ticket occurred during the stay
        ticket = Ticket(
            company_id=company_id,
            property_id=prop.id,
            title="Flooded bathroom",
            description="Water pipe burst causing flood",
            priority=TicketPriority.URGENT,
            status=TicketStatus.IN_PROGRESS,
            created_by_user_id=UUID(manager["user"]["id"]),
            created_at=check_in + timedelta(hours=12),
        )
        db.add(ticket)
        db.commit()

    res = client.post(
        "/api/v1/communication/review-requests/trigger",
        headers=csrf_headers(client),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["processed_count"] == 1
    assert data["sent_count"] == 0
    assert data["skipped_count"] == 1
    assert data["evaluations"][0]["status"] == "skipped"
    assert data["evaluations"][0]["skip_reason"] == "urgent_maintenance_incident"

    # Confirm no review message was sent to the guest
    with SessionLocal() as db:
        messages = list(db.scalars(select(Message).where(Message.company_id == company_id)))
        assert len(messages) == 0


def test_review_request_safety_suppression_on_complaint_escalation(client: TestClient) -> None:
    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    check_in = now - timedelta(days=2)
    check_out = now - timedelta(hours=1)
    guest_contact = "+21699000111"

    with SessionLocal() as db:
        prop = Property(company_id=company_id, name="Dar Hammamet", status=PropertyStatus.ACTIVE)
        db.add(prop)
        db.commit()
        db.refresh(prop)

        booking = Booking(
            company_id=company_id,
            property_id=prop.id,
            guest_name="Complaining Guest",
            guest_contact=guest_contact,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.BOOKING_COM,
        )
        db.add(booking)

        # Pre-existing conversation with complaint escalation
        conv = Conversation(
            company_id=company_id,
            property_id=prop.id,
            guest_contact_identifier=guest_contact,
            escalation_reason="complaint_or_conflict",
            status=ConversationStatus.OPEN,
            handling_mode=HandlingMode.MANUAL,
        )
        db.add(conv)
        db.commit()

    res = client.post(
        "/api/v1/communication/review-requests/trigger",
        headers=csrf_headers(client),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["processed_count"] == 1
    assert data["sent_count"] == 0
    assert data["skipped_count"] == 1
    assert data["evaluations"][0]["status"] == "skipped"
    assert data["evaluations"][0]["skip_reason"] == "guest_escalated_complaint"


def test_review_request_multilingual_selection(client: TestClient) -> None:
    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    check_in = now - timedelta(days=3)
    check_out = now - timedelta(hours=2)

    with SessionLocal() as db:
        prop = Property(company_id=company_id, name="Sidi Bou Said Villa", status=PropertyStatus.ACTIVE)
        db.add(prop)
        db.commit()
        db.refresh(prop)

        # German guest booking & conversation
        booking_de = Booking(
            company_id=company_id,
            property_id=prop.id,
            guest_name="Hans Gruber",
            guest_contact="+491701234567",
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.DIRECT,
        )
        conv_de = Conversation(
            company_id=company_id,
            property_id=prop.id,
            guest_contact_identifier="+491701234567",
            status=ConversationStatus.OPEN,
        )
        db.add_all([booking_de, conv_de])
        db.flush()

        msg_de = Message(
            company_id=company_id,
            conversation_id=conv_de.id,
            direction=MessageDirection.INBOUND,
            sender_type=SenderType.GUEST,
            content="Guten Tag!",
            language="de",
        )
        db.add(msg_de)
        db.commit()

    res = client.post(
        "/api/v1/communication/review-requests/trigger",
        headers=csrf_headers(client),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["sent_count"] == 1
    assert data["evaluations"][0]["language"] == "de"

    with SessionLocal() as db:
        sent_msg = db.scalar(
            select(Message).where(
                Message.company_id == company_id,
                Message.direction == MessageDirection.OUTBOUND,
            )
        )
        assert "vielen Dank" in sent_msg.content


def test_list_review_requests_endpoint(client: TestClient) -> None:
    manager = register_manager(client)
    company_id = UUID(manager["company"]["id"])

    now = datetime.now(UTC)
    with SessionLocal() as db:
        prop = Property(company_id=company_id, name="Villa Jasmine", status=PropertyStatus.ACTIVE)
        db.add(prop)
        db.commit()
        db.refresh(prop)

        booking = Booking(
            company_id=company_id,
            property_id=prop.id,
            guest_name="Marie Curie",
            guest_contact="+33612345678",
            check_in=now - timedelta(days=2),
            check_out=now - timedelta(hours=1),
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.DIRECT,
        )
        db.add(booking)
        db.commit()

    # Trigger sequence
    client.post("/api/v1/communication/review-requests/trigger", headers=csrf_headers(client))

    # List reviews
    res = client.get("/api/v1/communication/review-requests")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["guest_name"] == "Marie Curie"
    assert items[0]["status"] == "sent"


def test_review_requests_tenant_isolation(client: TestClient) -> None:
    manager1 = register_manager(client)
    company1_id = UUID(manager1["company"]["id"])

    now = datetime.now(UTC)
    with SessionLocal() as db:
        prop = Property(company_id=company1_id, name="Company 1 Villa", status=PropertyStatus.ACTIVE)
        db.add(prop)
        db.commit()
        db.refresh(prop)

        booking = Booking(
            company_id=company1_id,
            property_id=prop.id,
            guest_name="Guest One",
            guest_contact="+21611111111",
            check_in=now - timedelta(days=3),
            check_out=now - timedelta(hours=1),
            status=BookingStatus.CONFIRMED,
            record_type=BookingRecordType.RESERVATION,
            source_type=BookingSource.DIRECT,
        )
        db.add(booking)
        db.commit()

    # Register manager 2 and list review requests
    with TestClient(client.app) as client2:
        register_manager(client2)
        res = client2.get("/api/v1/communication/review-requests")
        assert res.status_code == 200
        assert len(res.json()) == 0

        # Trigger for company 2 has nothing to process
        trigger_res = client2.post(
            "/api/v1/communication/review-requests/trigger",
            headers=csrf_headers(client2),
        )
        assert trigger_res.status_code == 200
        assert trigger_res.json()["processed_count"] == 0

