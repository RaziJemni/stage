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


def register_manager(client: TestClient, company_name: str = "Hammamet Operations") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "company_name": company_name,
            "name": "Manager User",
            "email": f"manager-{uuid4()}@example.com",
            "password": "secure-manager-password-123",
            "timezone": "Africa/Tunis",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_property(client: TestClient, name: str = "Dar Sidi Bou Said") -> dict:
    response = client.post(
        "/api/v1/properties",
        json={
            "name": name,
            "city": "Sidi Bou Said",
            "address_line1": "Rue Habib Thameur",
        },
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_booking(client: TestClient, property_id: str, **overrides: str) -> dict:
    payload = {
        "property_id": property_id,
        "source_type": "direct",
        "record_type": "reservation",
        "status": "confirmed",
        "check_in": "2026-09-10T14:00:00Z",
        "check_out": "2026-09-13T10:00:00Z",
        "guest_name": "Karim Ben Salah",
        "guest_contact": "+216 98 123 456",
        "notes": "Direct reservation via WhatsApp",
        "payment_status": "paid_in_full",
        "total_amount": "900.000",
        "payment_method": "cash",
    }
    payload.update(overrides)
    response = client.post(
        "/api/v1/bookings",
        json=payload,
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_get_booking_receipt_data_success(client: TestClient) -> None:
    register_manager(client, company_name="Carthage Luxury Escapes")
    prop = create_property(client, name="Villa Carthage")
    booking = create_booking(
        client,
        prop["id"],
        total_amount="900.000",
        payment_status="paid_in_full",
        payment_method="cash",
    )

    response = client.get(f"/api/v1/bookings/{booking['id']}/receipt/data")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["invoice_number"].startswith("VAY-202609-")
    assert data["company_name"] == "Carthage Luxury Escapes"
    assert data["property_name"] == "Villa Carthage"
    assert data["guest_name"] == "Karim Ben Salah"
    assert data["guest_contact"] == "+216 98 123 456"
    assert data["nights"] == 3
    assert float(data["total_amount"]) == 900.0
    assert float(data["paid_amount"]) == 900.0
    assert float(data["outstanding_balance"]) == 0.0
    assert float(data["unit_nightly_rate"]) == 300.0
    assert data["currency"] == "TND"
    assert data["payment_status"] == "paid_in_full"
    assert data["payment_method"] == "cash"


def test_get_booking_receipt_html_rendering(client: TestClient) -> None:
    register_manager(client)
    prop = create_property(client)
    booking = create_booking(client, prop["id"])

    # French render
    res_fr = client.get(f"/api/v1/bookings/{booking['id']}/receipt?lang=fr")
    assert res_fr.status_code == 200
    assert "text/html" in res_fr.headers["content-type"]
    html_fr = res_fr.text
    assert "REÇU DE RÉSERVATION &amp; FACTURE" in html_fr or "REÇU DE RÉSERVATION & FACTURE" in html_fr
    assert "Karim Ben Salah" in html_fr
    assert "Dar Sidi Bou Said" in html_fr
    assert "900.000 TND" in html_fr
    assert "3 nuits" in html_fr
    assert "VAY-202609-" in html_fr
    assert "window.print()" in html_fr

    # English render
    res_en = client.get(f"/api/v1/bookings/{booking['id']}/receipt?lang=en")
    assert res_en.status_code == 200
    html_en = res_en.text
    assert "BOOKING RECEIPT &amp; INVOICE" in html_en or "BOOKING RECEIPT & INVOICE" in html_en
    assert "3 nights" in html_en


def test_deposit_received_and_unpaid_calculations(client: TestClient) -> None:
    register_manager(client)
    prop = create_property(client)
    booking = create_booking(
        client,
        prop["id"],
        total_amount="1200.000",
        paid_amount="400.000",
        payment_status="deposit_received",
        payment_method="bank_transfer",
    )

    response = client.get(f"/api/v1/bookings/{booking['id']}/receipt/data")
    assert response.status_code == 200
    data = response.json()
    assert float(data["total_amount"]) == 1200.0
    assert float(data["paid_amount"]) == 400.0
    assert float(data["outstanding_balance"]) == 800.0
    assert data["payment_status"] == "deposit_received"
    assert data["payment_method"] == "bank_transfer"

    # HTML verification
    res_html = client.get(f"/api/v1/bookings/{booking['id']}/receipt?lang=fr")
    assert res_html.status_code == 200
    assert "Acompte versé" in res_html.text
    assert "800.000 TND" in res_html.text
    assert "Virement bancaire" in res_html.text


def test_blocked_period_has_no_receipt(client: TestClient) -> None:
    register_manager(client)
    prop = create_property(client)

    # Create blocked period
    payload = {
        "property_id": prop["id"],
        "source_type": "manual",
        "record_type": "blocked_period",
        "check_in": "2026-09-15T14:00:00Z",
        "check_out": "2026-09-17T10:00:00Z",
        "notes": "Painting maintenance",
    }
    block_res = client.post("/api/v1/bookings", json=payload, headers=csrf_headers(client))
    assert block_res.status_code == 201
    booking_id = block_res.json()["id"]

    data_res = client.get(f"/api/v1/bookings/{booking_id}/receipt/data")
    assert data_res.status_code == 400
    assert data_res.json()["detail"] == "blocked_periods_have_no_receipt"

    html_res = client.get(f"/api/v1/bookings/{booking_id}/receipt")
    assert html_res.status_code == 400
    assert html_res.json()["detail"] == "blocked_periods_have_no_receipt"


def test_cross_company_isolation_receipt(client: TestClient) -> None:
    # Company 1
    register_manager(client, company_name="Company One")
    prop1 = create_property(client, name="Property One")
    b1 = create_booking(client, prop1["id"])

    # Company 2
    client2 = TestClient(client.app)
    register_manager(client2, company_name="Company Two")

    # Manager 2 tries to access Company 1's receipt
    res = client2.get(f"/api/v1/bookings/{b1['id']}/receipt/data")
    assert res.status_code == 404
    assert res.json()["detail"] == "booking_not_found"

    res_html = client2.get(f"/api/v1/bookings/{b1['id']}/receipt")
    assert res_html.status_code == 404
    assert res_html.json()["detail"] == "booking_not_found"


def test_cancelled_booking_receipt_shows_watermark(client: TestClient) -> None:
    register_manager(client)
    prop = create_property(client)
    booking = create_booking(client, prop["id"])

    # Cancel the booking
    cancel_res = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Guest request"},
        headers=csrf_headers(client),
    )
    assert cancel_res.status_code == 200

    html_res = client.get(f"/api/v1/bookings/{booking['id']}/receipt")
    assert html_res.status_code == 200
    assert "ANNULÉE / CANCELLED" in html_res.text
