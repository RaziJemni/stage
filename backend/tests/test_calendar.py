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
from app.core.enums import BookingRecordType, BookingStatus, ChannelType, SyncStatus
from app.main import create_app
from app.modules.calendar import service
from app.modules.calendar.schemas import CalendarFeedRequest
from app.modules.calendar.tasks import sync_calendar_channel
from app.modules.properties.models import Channel


VALID_FEED = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.test
DTSTART:20260810T140000Z
DTEND:20260813T100000Z
SUMMARY:Guest reservation
LAST-MODIFIED:20260801T100000Z
END:VEVENT
BEGIN:VEVENT
UID:block-1@example.test
DTSTART;VALUE=DATE:20260820
DTEND;VALUE=DATE:20260822
SUMMARY:Blocked for maintenance
END:VEVENT
BEGIN:VEVENT
UID:same-day-block@example.test
DTSTART;VALUE=DATE:20260825
DTEND;VALUE=DATE:20260825
SUMMARY:Blocked for cleaning
END:VEVENT
END:VCALENDAR
"""

MISSING_EVENTS_FEED = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.test
DTSTART:20260810T140000Z
DTEND:20260813T100000Z
SUMMARY:Guest reservation
END:VEVENT
END:VCALENDAR
"""

PARTIAL_FEED = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.test
DTSTART:20260810T140000Z
DTEND:20260813T100000Z
SUMMARY:Guest reservation
END:VEVENT
BEGIN:VEVENT
UID:invalid-event@example.test
DTSTART:20260815T140000Z
SUMMARY:Missing end date
END:VEVENT
END:VCALENDAR
"""


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


def register_manager(client: TestClient, email: str | None = None) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "company_name": "Calendar Agency",
            "name": "Calendar Manager",
            "email": email or f"manager-{uuid4()}@example.com",
            "password": "secure-manager-password-123",
            "timezone": "Africa/Tunis",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_property(client: TestClient) -> str:
    response = client.post(
        "/api/v1/properties",
        json={"name": "Villa Yasmine", "city": "Hammamet", "timezone": "Africa/Tunis"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def configure_feed(client: TestClient, property_id: str) -> dict:
    response = client.post(
        f"/api/v1/properties/{property_id}/calendar-feeds",
        json={
            "channel_type": "airbnb",
            "calendar_url": "https://calendar.example.test/villa.ics",
            "external_listing_id": "villa-yasmine",
        },
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_manager_configures_feed_and_another_company_cannot_access_it(client: TestClient) -> None:
    register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)
    assert feed["channel_type"] == "airbnb"

    other_client = TestClient(client.app)
    register_manager(other_client)
    inaccessible = other_client.get(f"/api/v1/calendar-feeds/{feed['id']}/sync-runs")
    assert inaccessible.status_code == 404


def test_feed_rejects_direct_channel_and_missing_csrf(client: TestClient) -> None:
    register_manager(client)
    property_id = create_property(client)
    missing_csrf = client.post(
        f"/api/v1/properties/{property_id}/calendar-feeds",
        json={"channel_type": "airbnb", "calendar_url": "https://calendar.example.test/villa.ics"},
    )
    assert missing_csrf.status_code == 403
    invalid_channel = client.post(
        f"/api/v1/properties/{property_id}/calendar-feeds",
        json={"channel_type": "direct", "calendar_url": "https://calendar.example.test/villa.ics"},
        headers=csrf_headers(client),
    )
    assert invalid_channel.status_code == 422


def test_sync_persists_events_idempotently_and_records_failures(client: TestClient) -> None:
    identity = register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)

    with SessionLocal() as db:
        first_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: VALID_FEED,
        )
        assert first_run.status is SyncStatus.SUCCEEDED
        assert first_run.created_count == 3
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking)) == 3

        repeated_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: VALID_FEED,
        )
        assert repeated_run.created_count == 0
        assert repeated_run.updated_count == 0
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking)) == 3

        bookings = list(db.scalars(sa.select(service.Booking).order_by(service.Booking.external_event_id)))
        assert bookings[0].record_type is BookingRecordType.BLOCKED_PERIOD
        assert bookings[1].status is BookingStatus.CONFIRMED

        failed_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: b"not a calendar",
        )
        assert failed_run.status is SyncStatus.FAILED
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking)) == 3


def test_complete_sync_cancels_missing_events_but_partial_and_failed_syncs_preserve_them(
    client: TestClient,
) -> None:
    identity = register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)

    with SessionLocal() as db:
        first_run = service.sync_channel(
            db, company_id=identity["company"]["id"], channel_id=feed["id"], fetcher=lambda _: VALID_FEED
        )
        assert first_run.status is SyncStatus.SUCCEEDED

        partial_run = service.sync_channel(
            db, company_id=identity["company"]["id"], channel_id=feed["id"], fetcher=lambda _: PARTIAL_FEED
        )
        assert partial_run.status is SyncStatus.PARTIAL
        assert partial_run.rejected_count == 1
        assert partial_run.cancelled_count == 0
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking).where(service.Booking.status != BookingStatus.CANCELLED)) == 3

        failed_run = service.sync_channel(
            db, company_id=identity["company"]["id"], channel_id=feed["id"], fetcher=lambda _: b"not a calendar"
        )
        assert failed_run.status is SyncStatus.FAILED
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking).where(service.Booking.status != BookingStatus.CANCELLED)) == 3

        complete_run = service.sync_channel(
            db, company_id=identity["company"]["id"], channel_id=feed["id"], fetcher=lambda _: MISSING_EVENTS_FEED
        )
        assert complete_run.status is SyncStatus.SUCCEEDED
        assert complete_run.cancelled_count == 2
        assert db.scalar(sa.select(sa.func.count()).select_from(service.Booking).where(service.Booking.status != BookingStatus.CANCELLED)) == 1


def test_sync_request_queues_background_task(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)
    queued: list[tuple[str, str]] = []
    monkeypatch.setattr(sync_calendar_channel, "delay", lambda company_id, channel_id: queued.append((company_id, channel_id)))

    response = client.post(
        f"/api/v1/calendar-feeds/{feed['id']}/sync", headers=csrf_headers(client)
    )
    assert response.status_code == 202, response.text
    assert response.json() == {"channel_id": feed["id"], "status": "queued"}
    assert queued and queued[0][1] == feed["id"]


def test_private_calendar_urls_are_rejected_before_download() -> None:
    with pytest.raises(service.CalendarImportError, match="private or local"):
        service.fetch_calendar_bytes("http://127.0.0.1/calendar.ics")
