import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import HandlingMode
from app.main import create_app
from app.modules.messaging import service


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


def create_property(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/properties",
        json={"name": "Villa Yasmine", "city": "Hammamet"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_inbound_conversation(client: TestClient) -> tuple[dict, dict]:
    manager = register_manager(client)
    property_data = create_property(client)
    with SessionLocal() as db:
        result = service.record_inbound_message(
            db,
            company_id=UUID(manager["company"]["id"]),
            property_id=UUID(property_data["id"]),
            guest_contact_identifier="+21699887766",
            content="Can I check in late?",
            external_message_id="provider-event-001",
            language="en",
        )
    assert result.created
    return manager, {"property": property_data, "conversation_id": str(result.message.conversation_id)}


def test_conversations_are_ordered_and_staff_reply_requires_csrf(client: TestClient) -> None:
    _, context = create_inbound_conversation(client)

    conversations = client.get("/api/v1/conversations")
    assert conversations.status_code == 200
    assert conversations.json()["total"] == 1
    assert conversations.json()["items"][0]["guest_contact_identifier"] == "+21699887766"

    messages = client.get(f"/api/v1/conversations/{context['conversation_id']}/messages")
    assert messages.status_code == 200
    assert [message["sender_type"] for message in messages.json()] == ["guest"]

    missing_csrf = client.post(
        f"/api/v1/conversations/{context['conversation_id']}/messages",
        json={"content": "Yes, we can arrange that."},
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["code"] == "csrf_invalid"

    created = client.post(
        f"/api/v1/conversations/{context['conversation_id']}/messages",
        json={"content": "Yes, we can arrange that."},
        headers=csrf_headers(client),
    )
    assert created.status_code == 201, created.text
    assert created.json()["sender_type"] == "staff"
    assert created.json()["delivery_status"] == "queued"

    updated = client.patch(
        f"/api/v1/conversations/{context['conversation_id']}/handling-mode",
        json={"handling_mode": "automatic"},
        headers=csrf_headers(client),
    )
    assert updated.status_code == 200
    assert updated.json()["handling_mode"] == "automatic"


def test_inbound_messages_are_deduplicated_and_manual_takeover_blocks_automation(
    client: TestClient,
) -> None:
    manager, context = create_inbound_conversation(client)
    company_id = UUID(manager["company"]["id"])
    property_id = UUID(context["property"]["id"])

    with SessionLocal() as db:
        duplicate = service.record_inbound_message(
            db,
            company_id=company_id,
            property_id=property_id,
            guest_contact_identifier="+21699887766",
            content="Can I check in late?",
            external_message_id="provider-event-001",
        )
        conversation = service.get_conversation(
            db, company_id=company_id, conversation_id=UUID(context["conversation_id"])
        )
        assert conversation is not None
        assert not duplicate.created
        assert service.automated_sending_allowed(conversation)

    takeover = client.patch(
        f"/api/v1/conversations/{context['conversation_id']}/handling-mode",
        json={"handling_mode": HandlingMode.MANUAL.value},
        headers=csrf_headers(client),
    )
    assert takeover.status_code == 200

    with SessionLocal() as db:
        conversation = service.get_conversation(
            db, company_id=company_id, conversation_id=UUID(context["conversation_id"])
        )
        assert conversation is not None
        assert not service.automated_sending_allowed(conversation)
        assert len(service.list_messages(db, company_id, UUID(context["conversation_id"]))) == 1


def test_risky_inbound_message_switches_conversation_to_manual(client: TestClient) -> None:
    manager = register_manager(client)
    property_data = create_property(client)

    with SessionLocal() as db:
        result = service.record_inbound_message(
            db,
            company_id=UUID(manager["company"]["id"]),
            property_id=UUID(property_data["id"]),
            guest_contact_identifier="+21699887766",
            content="I need a refund now",
            external_message_id="provider-event-refund-001",
        )
        conversation = service.get_conversation(
            db,
            company_id=UUID(manager["company"]["id"]),
            conversation_id=result.message.conversation_id,
        )

    assert result.created
    assert conversation is not None
    assert conversation.handling_mode is HandlingMode.MANUAL
    assert conversation.escalation_reason == "payment_or_refund"


def test_other_company_cannot_read_or_change_conversation(client: TestClient) -> None:
    _, context = create_inbound_conversation(client)
    other_client = TestClient(client.app)
    register_manager(other_client)

    messages = other_client.get(f"/api/v1/conversations/{context['conversation_id']}/messages")
    assert messages.status_code == 404
    assert messages.json()["code"] == "conversation_not_found"

    takeover = other_client.patch(
        f"/api/v1/conversations/{context['conversation_id']}/handling-mode",
        json={"handling_mode": "manual"},
        headers=csrf_headers(other_client),
    )
    assert takeover.status_code == 404
    assert takeover.json()["code"] == "conversation_not_found"
