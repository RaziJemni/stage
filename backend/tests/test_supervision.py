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
