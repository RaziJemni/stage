from uuid import uuid4
import os
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import create_app
from app.core.database import SessionLocal


@pytest.fixture(scope="module", autouse=True)
def migrated_database() -> None:
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"].replace("%", "%%"))
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_data() -> None:
    with SessionLocal() as db:
        db.execute(sa.text("TRUNCATE TABLE companies CASCADE"))
        db.commit()


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get(settings.csrf_cookie_name)
    assert token
    return {"X-CSRF-Token": token}


def register_manager(client: TestClient) -> dict:
    response = client.post("/api/v1/auth/register", json={"company_name": "Ticket Agency", "name": "Manager", "email": f"ticket-{uuid4()}@example.com", "password": "secure-manager-password-123", "timezone": "Africa/Tunis"})
    assert response.status_code == 201
    return response.json()


def create_property(client: TestClient) -> dict:
    response = client.post("/api/v1/properties", json={"name": "Villa Ticket", "city": "Tunis"}, headers=csrf_headers(client))
    assert response.status_code == 201
    return response.json()


def test_ticket_creation_is_persistent_and_company_scoped() -> None:
    with TestClient(create_app()) as client:
        register_manager(client)
        property_data = create_property(client)
        payload = {"property_id": property_data["id"], "title": "Leaking sink", "description": "Water is leaking under the sink.", "category": "plumbing", "priority": "high"}
        created = client.post("/api/v1/tickets", json=payload, headers=csrf_headers(client))
        assert created.status_code == 201, created.text
        assert created.json()["status"] == "open"
        assert created.json()["suggested_by_chatbot"] is False
        assert client.get("/api/v1/tickets").json()["total"] == 1

        with TestClient(create_app()) as other_client:
            register_manager(other_client)
            assert other_client.get("/api/v1/tickets").json()["total"] == 0
            cross_company = other_client.post("/api/v1/tickets", json=payload, headers=csrf_headers(other_client))
            assert cross_company.status_code == 404
            assert cross_company.json()["code"] == "property_not_found"


def test_ticket_suggestion_requires_staff_confirmation_before_ticket_creation() -> None:
    with TestClient(create_app()) as client:
        register_manager(client)
        property_data = create_property(client)
        from app.modules.maintenance import service
        from app.modules.maintenance.schemas import TicketSuggestionCreateRequest
        from uuid import UUID

        with SessionLocal() as db:
            suggestion = service.create_ticket_suggestion(db, company_id=UUID(property_data["company_id"]), payload=TicketSuggestionCreateRequest(property_id=UUID(property_data["id"]), title="Broken lock", description="Guest reports a broken lock.", category="security", priority="urgent"))
            suggestion_id = str(suggestion.id)

        assert client.get("/api/v1/tickets").json()["total"] == 0
        listed = client.get("/api/v1/tickets/suggestions")
        assert listed.status_code == 200
        assert listed.json()["items"][0]["id"] == suggestion_id
        confirmed = client.post(f"/api/v1/tickets/suggestions/{suggestion_id}/confirm", json={"title": "Front-door lock broken", "description": "Guest reports the front-door lock is broken.", "category": "security", "priority": "urgent"}, headers=csrf_headers(client))
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["status"] == "confirmed"
        assert client.get("/api/v1/tickets").json()["items"][0]["suggested_by_chatbot"] is True
