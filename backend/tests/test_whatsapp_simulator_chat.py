import os
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import PropertyStatus
from app.main import create_app
from app.modules.identity.models import Company
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


def test_simulator_chat_flow(client: TestClient) -> None:
    with SessionLocal() as db:
        company = Company(
            id=uuid4(),
            name="Hammamet Holiday Agency",
            timezone="Africa/Tunis",
            default_currency="TND",
        )
        db.add(company)
        db.flush()

        prop = Property(
            id=uuid4(),
            company_id=company.id,
            name="Villa Jasmine",
            city="Hammamet",
            address_line1="Zone Touristique",
            max_guests=8,
            wifi_network="Jasmine_Guest",
            wifi_password="SecretPassword123",
            status=PropertyStatus.ACTIVE,
        )
        db.add(prop)
        db.commit()
        prop_id = str(prop.id)

    # 1. Test listing available simulator properties
    resp = client.get("/api/v1/integrations/whatsapp/simulator/chat/properties")
    assert resp.status_code == 200
    props = resp.json()
    assert len(props) >= 1
    matched = next((p for p in props if p["id"] == prop_id), None)
    assert matched is not None
    assert matched["name"] == "Villa Jasmine"
    assert matched["city"] == "Hammamet"
    # Verify sensitive fields like wifi_password are NOT leaked
    assert "wifi_password" not in matched

    # 2. Test chat history is empty initially
    guest_phone = "+21698765432"
    resp = client.get(
        "/api/v1/integrations/whatsapp/simulator/chat/messages",
        params={"property_id": prop_id, "guest_phone": guest_phone},
    )
    assert resp.status_code == 200
    assert resp.json() == []

    # 3. Send a simulated message from the guest
    resp = client.post(
        "/api/v1/integrations/whatsapp/simulator/chat/send",
        json={
            "property_id": prop_id,
            "guest_phone": guest_phone,
            "content": "Bonjour, est-ce que la piscine est chauffée ?",
        },
    )
    assert resp.status_code == 202
    send_data = resp.json()
    assert send_data["created"] is True
    assert send_data["message_id"] is not None
    assert send_data["conversation_id"] is not None

    # 4. Fetch chat history again - message should be present
    resp = client.get(
        "/api/v1/integrations/whatsapp/simulator/chat/messages",
        params={"property_id": prop_id, "guest_phone": guest_phone},
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "Bonjour, est-ce que la piscine est chauffée ?"
    assert messages[0]["direction"] == "inbound"
    assert messages[0]["sender_type"] == "guest"

    # 5. Non-existent property returns 404
    fake_id = str(uuid4())
    resp = client.get(
        "/api/v1/integrations/whatsapp/simulator/chat/messages",
        params={"property_id": fake_id, "guest_phone": guest_phone},
    )
    assert resp.status_code == 404

    resp = client.post(
        "/api/v1/integrations/whatsapp/simulator/chat/send",
        json={
            "property_id": fake_id,
            "guest_phone": guest_phone,
            "content": "Hello",
        },
    )
    assert resp.status_code == 404
