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


def test_contractor_contacts_assignment_reassignment_and_tenant_isolation() -> None:
    with TestClient(create_app()) as client:
        register_manager(client)
        property_data = create_property(client)
        ticket = client.post(
            "/api/v1/tickets",
            json={"property_id": property_data["id"], "title": "Leaking sink", "description": "Water is leaking.", "priority": "high"},
            headers=csrf_headers(client),
        ).json()
        first = client.post(
            "/api/v1/contractors",
            json={"name": "Amine Plumbing", "phone": "+21620111222", "specialty": "plumbing"},
            headers=csrf_headers(client),
        )
        assert first.status_code == 201, first.text
        second = client.post(
            "/api/v1/contractors",
            json={"name": "Noura Repairs", "specialty": "general"},
            headers=csrf_headers(client),
        )
        assert second.status_code == 201
        assert client.get("/api/v1/contractors").json()["total"] == 2

        assigned = client.post(
            f"/api/v1/tickets/{ticket['id']}/assignments",
            json={"contractor_id": first.json()["id"], "notes": "Call before arrival."},
            headers=csrf_headers(client),
        )
        assert assigned.status_code == 201, assigned.text
        assert client.get("/api/v1/tickets").json()["items"][0]["status"] == "assigned"
        reassigned = client.post(
            f"/api/v1/tickets/{ticket['id']}/assignments",
            json={"contractor_id": second.json()["id"]},
            headers=csrf_headers(client),
        )
        assert reassigned.status_code == 201, reassigned.text
        history = client.get(f"/api/v1/tickets/{ticket['id']}/assignments")
        assert history.status_code == 200
        assert len(history.json()) == 2
        assert history.json()[0]["contractor_id"] == second.json()["id"]
        assert history.json()[0]["ended_at"] is None
        assert history.json()[1]["contractor_id"] == first.json()["id"]
        assert history.json()[1]["ended_at"] is not None

        deactivated = client.patch(
            f"/api/v1/contractors/{second.json()['id']}",
            json={"is_active": False},
            headers=csrf_headers(client),
        )
        assert deactivated.status_code == 200
        assert client.get("/api/v1/contractors").json()["total"] == 1
        assert client.get("/api/v1/contractors?include_inactive=true").json()["total"] == 2
        inactive = client.post(
            f"/api/v1/tickets/{ticket['id']}/assignments",
            json={"contractor_id": second.json()["id"]},
            headers=csrf_headers(client),
        )
        assert inactive.status_code == 409
        assert inactive.json()["code"] == "contractor_inactive"

        with TestClient(create_app()) as other_client:
            register_manager(other_client)
            assert other_client.get("/api/v1/contractors").json()["total"] == 0
            cross_contractor = other_client.patch(
                f"/api/v1/contractors/{first.json()['id']}",
                json={"is_active": False},
                headers=csrf_headers(other_client),
            )
            assert cross_contractor.status_code == 404
            assert cross_contractor.json()["code"] == "contractor_not_found"
            cross_ticket = other_client.get(f"/api/v1/tickets/{ticket['id']}/assignments")
            assert cross_ticket.status_code == 404
            assert cross_ticket.json()["code"] == "ticket_not_found"


def test_ticket_lifecycle_audits_transitions_ends_assignments_and_filters_history() -> None:
    with TestClient(create_app()) as client:
        register_manager(client)
        property_data = create_property(client)
        ticket = client.post(
            "/api/v1/tickets",
            json={"property_id": property_data["id"], "title": "Broken AC", "description": "No cooling.", "priority": "urgent"},
            headers=csrf_headers(client),
        ).json()
        contractor = client.post(
            "/api/v1/contractors",
            json={"name": "Amine HVAC", "specialty": "HVAC"},
            headers=csrf_headers(client),
        ).json()

        assigned = client.post(
            f"/api/v1/tickets/{ticket['id']}/assignments",
            json={"contractor_id": contractor["id"]},
            headers=csrf_headers(client),
        )
        assert assigned.status_code == 201
        started = client.patch(
            f"/api/v1/tickets/{ticket['id']}/status",
            json={"status": "in_progress", "note": "Contractor is on site."},
            headers=csrf_headers(client),
        )
        assert started.status_code == 200
        assert started.json()["status"] == "in_progress"
        resolved = client.patch(
            f"/api/v1/tickets/{ticket['id']}/status",
            json={"status": "resolved", "note": "Cooling verified."},
            headers=csrf_headers(client),
        )
        assert resolved.status_code == 200
        assert resolved.json()["status"] == "resolved"

        assignments = client.get(f"/api/v1/tickets/{ticket['id']}/assignments")
        assert assignments.status_code == 200
        assert assignments.json()[0]["ended_at"] is not None
        history = client.get(f"/api/v1/tickets/{ticket['id']}/status-history")
        assert history.status_code == 200
        assert [(item["from_status"], item["to_status"]) for item in history.json()] == [
            (None, "open"),
            ("open", "assigned"),
            ("assigned", "in_progress"),
            ("in_progress", "resolved"),
        ]
        assert history.json()[-1]["note"] == "Cooling verified."

        invalid = client.patch(
            f"/api/v1/tickets/{ticket['id']}/status",
            json={"status": "open"},
            headers=csrf_headers(client),
        )
        assert invalid.status_code == 409
        assert invalid.json()["code"] == "invalid_status_transition"
        filtered = client.get(f"/api/v1/tickets?status=resolved&priority=urgent&property_id={property_data['id']}&contractor_id={contractor['id']}")
        assert filtered.status_code == 200
        assert [item["id"] for item in filtered.json()["items"]] == [ticket["id"]]

        with TestClient(create_app()) as other_client:
            register_manager(other_client)
            assert other_client.get(f"/api/v1/tickets?contractor_id={contractor['id']}").json()["total"] == 0
            cross_history = other_client.get(f"/api/v1/tickets/{ticket['id']}/status-history")
            assert cross_history.status_code == 404
            assert cross_history.json()["code"] == "ticket_not_found"


def test_ticket_can_be_cancelled_from_each_non_terminal_status() -> None:
    with TestClient(create_app()) as client:
        register_manager(client)
        property_data = create_property(client)
        for index, current_status in enumerate(("open", "assigned", "in_progress")):
            ticket = client.post(
                "/api/v1/tickets",
                json={"property_id": property_data["id"], "title": f"Ticket {index}", "description": "Needs review."},
                headers=csrf_headers(client),
            ).json()
            if current_status != "open":
                contractor = client.post(
                    "/api/v1/contractors",
                    json={"name": f"Contractor {index}"},
                    headers=csrf_headers(client),
                ).json()
                assert client.post(f"/api/v1/tickets/{ticket['id']}/assignments", json={"contractor_id": contractor["id"]}, headers=csrf_headers(client)).status_code == 201
            if current_status == "in_progress":
                assert client.patch(f"/api/v1/tickets/{ticket['id']}/status", json={"status": "in_progress"}, headers=csrf_headers(client)).status_code == 200
            cancelled = client.patch(f"/api/v1/tickets/{ticket['id']}/status", json={"status": "cancelled"}, headers=csrf_headers(client))
            assert cancelled.status_code == 200
            assert cancelled.json()["status"] == "cancelled"


def test_ticket_guest_update_is_reviewed_persisted_and_isolated() -> None:
    with TestClient(create_app()) as client:
        manager = register_manager(client)
        property_data = create_property(client)

        from uuid import UUID
        from app.modules.messaging import service as messaging_service
        from app.core.enums import ConversationStatus

        with SessionLocal() as db:
            result = messaging_service.record_inbound_message(
                db,
                company_id=UUID(manager["company"]["id"]),
                property_id=UUID(property_data["id"]),
                guest_contact_identifier="+21699887766",
                content="The AC is making a strange noise.",
                external_message_id="ticket-conv-001",
                language="en",
            )
            conversation_id = str(result.message.conversation_id)

        ticket_with_conv = client.post(
            "/api/v1/tickets",
            json={
                "property_id": property_data["id"],
                "conversation_id": conversation_id,
                "title": "AC Strange Noise",
                "description": "Guest reported strange noise from the AC unit.",
                "priority": "high",
            },
            headers=csrf_headers(client),
        ).json()

        ticket_without_conv = client.post(
            "/api/v1/tickets",
            json={
                "property_id": property_data["id"],
                "title": "Clean pool filters",
                "description": "Routine pool filter cleaning.",
                "priority": "low",
            },
            headers=csrf_headers(client),
        ).json()

        # Send guest update
        update_payload = {"content": "Update: A technician has been scheduled to inspect the AC unit."}
        response = client.post(
            f"/api/v1/tickets/{ticket_with_conv['id']}/guest-update",
            json=update_payload,
            headers=csrf_headers(client),
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["conversation_id"] == conversation_id
        assert data["content"] == update_payload["content"]
        assert data["delivery_status"] == "queued"

        # Verify message in conversation messages
        messages = client.get(f"/api/v1/conversations/{conversation_id}/messages").json()
        assert len(messages) == 2
        staff_message = messages[-1]
        assert staff_message["content"] == update_payload["content"]
        assert staff_message["sender_type"] == "staff"
        assert staff_message["direction"] == "outbound"
        assert staff_message["delivery_status"] == "queued"

        # Verify conversation handling mode is manual
        conversations = client.get("/api/v1/conversations").json()
        conv_item = next(c for c in conversations["items"] if c["id"] == conversation_id)
        assert conv_item["handling_mode"] == "manual"

        # Test ticket without conversation returns 409
        no_conv_res = client.post(
            f"/api/v1/tickets/{ticket_without_conv['id']}/guest-update",
            json={"content": "Hello guest"},
            headers=csrf_headers(client),
        )
        assert no_conv_res.status_code == 409
        assert no_conv_res.json()["code"] == "ticket_has_no_conversation"

        # Test closed conversation returns 409
        with SessionLocal() as db:
            from app.modules.messaging.models import Conversation
            conv_obj = db.scalar(sa.select(Conversation).where(Conversation.id == UUID(conversation_id)))
            assert conv_obj is not None
            conv_obj.status = ConversationStatus.CLOSED
            db.commit()

        closed_res = client.post(
            f"/api/v1/tickets/{ticket_with_conv['id']}/guest-update",
            json={"content": "Another update"},
            headers=csrf_headers(client),
        )
        assert closed_res.status_code == 409
        assert closed_res.json()["code"] == "conversation_closed"

        # Test tenant isolation with another company
        with TestClient(create_app()) as other_client:
            register_manager(other_client)
            cross_res = other_client.post(
                f"/api/v1/tickets/{ticket_with_conv['id']}/guest-update",
                json={"content": "Unauthorized update attempt"},
                headers=csrf_headers(other_client),
            )
            assert cross_res.status_code == 404
            assert cross_res.json()["code"] == "ticket_not_found"
