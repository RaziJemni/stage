"""Cross-module MVP scenario covering the documented demonstration path.

This test intentionally uses the public API wherever a manager or staff member
would do so.  Chatbot processing is invoked directly after the simulator
acknowledgement because the test profile has no Celery worker; this preserves
the same persisted-message contract without an external provider.
"""

import hashlib
import hmac
import json
import os
from pathlib import Path
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import create_app
from app.modules.chatbot.service import process_inbound_message


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


def register_manager(client: TestClient, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "company_name": "MVP Demonstration Agency",
            "name": "Demo Manager",
            "email": email,
            "password": "demo-validation-password-123",
            "timezone": "Africa/Tunis",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def signed_simulator_event(payload: dict) -> tuple[bytes, dict[str, str]]:
    raw_body = json.dumps(payload, separators=(",", ":")).encode()
    signature = hmac.new(
        settings.whatsapp_simulator_webhook_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return raw_body, {
        "Content-Type": "application/json",
        "X-Vayca-Simulator-Signature": signature,
    }


def post_simulator_event(client: TestClient, payload: dict) -> dict:
    raw_body, headers = signed_simulator_event(payload)
    response = client.post(
        "/api/v1/integrations/whatsapp/simulator/inbound",
        content=raw_body,
        headers=headers,
    )
    assert response.status_code == 202, response.text
    return response.json()


def test_mvp_operational_flow_is_persistent_tenant_scoped_and_recoverable(
    client: TestClient,
) -> None:
    manager = register_manager(client, f"mvp-manager-{uuid4()}@example.com")
    company_id = UUID(manager["company"]["id"])
    property_response = client.post(
        "/api/v1/properties",
        json={
            "name": "Villa Demonstration",
            "city": "Hammamet",
            "timezone": "Africa/Tunis",
            "check_in_time": "15:00:00",
            "check_out_time": "11:00:00",
            "wifi_password": "synthetic-demo-wifi",
            "parking_info": "Synthetic parking instructions.",
        },
        headers=csrf_headers(client),
    )
    assert property_response.status_code == 201, property_response.text
    property_data = property_response.json()

    booking_payload = {
        "property_id": property_data["id"],
        "source_type": "direct",
        "record_type": "reservation",
        "status": "confirmed",
        "check_in": "2026-10-10T14:00:00Z",
        "check_out": "2026-10-12T10:00:00Z",
        "guest_name": "Synthetic Guest",
        "guest_contact": "+21620000000",
    }
    first_booking = client.post(
        "/api/v1/bookings", json=booking_payload, headers=csrf_headers(client)
    )
    assert first_booking.status_code == 201, first_booking.text
    overlapping_booking = client.post(
        "/api/v1/bookings",
        json={
            **booking_payload,
            "check_in": "2026-10-11T14:00:00Z",
            "check_out": "2026-10-13T10:00:00Z",
            "guest_name": "Second Synthetic Guest",
        },
        headers=csrf_headers(client),
    )
    assert overlapping_booking.status_code == 201, overlapping_booking.text

    conflicts = client.get("/api/v1/booking-conflicts?status=open")
    assert conflicts.status_code == 200
    assert conflicts.json()["total"] == 1
    conflict_id = conflicts.json()["items"][0]["id"]
    acknowledged = client.post(
        f"/api/v1/booking-conflicts/{conflict_id}/acknowledge",
        json={"resolution_note": "Synthetic demonstration conflict acknowledged."},
        headers=csrf_headers(client),
    )
    assert acknowledged.status_code == 200, acknowledged.text
    assert acknowledged.json()["status"] == "acknowledged"

    safe_event = {
        "property_id": property_data["id"],
        "guest_contact_identifier": "+21621111111",
        "content": "What is the Wi-Fi password?",
        "external_message_id": "mvp-safe-question-001",
        "language": "en",
    }
    safe_inbound = post_simulator_event(client, safe_event)
    duplicate_safe_inbound = post_simulator_event(client, safe_event)
    assert safe_inbound["created"] is True
    assert duplicate_safe_inbound["created"] is False
    assert duplicate_safe_inbound["message_id"] == safe_inbound["message_id"]

    with SessionLocal() as db:
        reply = process_inbound_message(
            db,
            company_id=company_id,
            inbound_message_id=UUID(safe_inbound["message_id"]),
        )
    assert reply is not None
    assert reply.content == "Wi-Fi: synthetic-demo-wifi"
    assert reply.delivery_status.value == "queued"
    assert reply.automatically_sent is True

    risky_inbound = post_simulator_event(
        client,
        {
            "property_id": property_data["id"],
            "guest_contact_identifier": "+21622222222",
            "content": "I need a refund now.",
            "external_message_id": "mvp-refund-001",
            "language": "en",
        },
    )
    manual_conversations = client.get("/api/v1/conversations?handling_mode=manual")
    assert manual_conversations.status_code == 200
    manual_conversation = next(
        item
        for item in manual_conversations.json()["items"]
        if item["id"] == risky_inbound["conversation_id"]
    )
    assert manual_conversation["escalation_reason"] == "payment_or_refund"
    assert manual_conversation["unread_message_count"] == 1

    marked_read = client.post(
        f"/api/v1/conversations/{risky_inbound['conversation_id']}/read",
        headers=csrf_headers(client),
    )
    assert marked_read.status_code == 200
    assert marked_read.json()["unread_message_count"] == 0
    staff_reply = client.post(
        f"/api/v1/conversations/{risky_inbound['conversation_id']}/messages",
        json={"content": "A staff member will review your request."},
        headers=csrf_headers(client),
    )
    assert staff_reply.status_code == 201, staff_reply.text
    assert staff_reply.json()["sender_type"] == "staff"
    assert staff_reply.json()["delivery_status"] == "queued"

    ticket = client.post(
        "/api/v1/tickets",
        json={
            "property_id": property_data["id"],
            "booking_id": first_booking.json()["id"],
            "conversation_id": risky_inbound["conversation_id"],
            "title": "Synthetic plumbing issue",
            "description": "Guest reports a synthetic plumbing issue for the demonstration.",
            "category": "plumbing",
            "priority": "urgent",
        },
        headers=csrf_headers(client),
    )
    assert ticket.status_code == 201, ticket.text
    contractor = client.post(
        "/api/v1/contractors",
        json={"name": "Synthetic Contractor", "specialty": "plumbing"},
        headers=csrf_headers(client),
    )
    assert contractor.status_code == 201, contractor.text
    assignment = client.post(
        f"/api/v1/tickets/{ticket.json()['id']}/assignments",
        json={"contractor_id": contractor.json()["id"]},
        headers=csrf_headers(client),
    )
    assert assignment.status_code == 201, assignment.text

    guest_update = client.post(
        f"/api/v1/tickets/{ticket.json()['id']}/guest-update",
        json={"content": "Update: A plumber has been assigned to inspect the synthetic issue."},
        headers=csrf_headers(client),
    )
    assert guest_update.status_code == 201, guest_update.text
    assert guest_update.json()["delivery_status"] == "queued"
    assert guest_update.json()["conversation_id"] == risky_inbound["conversation_id"]

    for status, note in (
        ("in_progress", "Synthetic contractor started work."),
        ("resolved", "Synthetic repair verified."),
    ):
        transition = client.patch(
            f"/api/v1/tickets/{ticket.json()['id']}/status",
            json={"status": status, "note": note},
            headers=csrf_headers(client),
        )
        assert transition.status_code == 200, transition.text
    history = client.get(f"/api/v1/tickets/{ticket.json()['id']}/status-history")
    assert [(item["from_status"], item["to_status"]) for item in history.json()] == [
        (None, "open"),
        ("open", "assigned"),
        ("assigned", "in_progress"),
        ("in_progress", "resolved"),
    ]
    assert client.get("/api/v1/tickets?status=resolved&priority=urgent").json()["total"] == 1

    with TestClient(client.app) as other_company_client:
        register_manager(other_company_client, f"mvp-other-{uuid4()}@example.com")
        assert other_company_client.get(f"/api/v1/properties/{property_data['id']}").status_code == 404
        assert other_company_client.get(
            f"/api/v1/conversations/{risky_inbound['conversation_id']}/messages"
        ).status_code == 404
        assert other_company_client.get(
            f"/api/v1/tickets/{ticket.json()['id']}/status-history"
        ).status_code == 404
        assert (
            other_company_client.post(
                f"/api/v1/tickets/{ticket.json()['id']}/guest-update",
                json={"content": "Cross-company update attempt"},
                headers=csrf_headers(other_company_client),
            ).status_code
            == 404
        )
        assert other_company_client.get("/api/v1/booking-conflicts").json()["total"] == 0
        assert other_company_client.get("/api/v1/conversations?handling_mode=manual").json()["total"] == 0
        assert other_company_client.get("/api/v1/tickets?priority=urgent").json()["total"] == 0
