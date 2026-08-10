import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from urllib.parse import parse_qs, urlparse

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
from app.modules.calendar.models import CalendarSyncRun
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


UPDATED_AND_REDUCED_FEED = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.test
DTSTART:20260811T140000Z
DTEND:20260814T100000Z
SUMMARY:Guest reservation updated
LAST-MODIFIED:20260802T100000Z
END:VEVENT
END:VCALENDAR
"""


PARTIAL_FEED = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.test
DTSTART:20260811T140000Z
DTEND:20260814T100000Z
SUMMARY:Guest reservation updated
END:VEVENT
BEGIN:VEVENT
DTSTART:20260820T000000Z
DTEND:20260821T000000Z
SUMMARY:Invalid event without an identifier
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


def activate_staff(manager_client: TestClient) -> TestClient:
    invitation = manager_client.post(
        "/api/v1/team/invitations",
        json={"name": "Calendar Staff", "email": f"staff-{uuid4()}@example.com"},
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


def test_complete_sync_updates_and_cancels_missing_events(client: TestClient) -> None:
    identity = register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)

    with SessionLocal() as db:
        service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: VALID_FEED,
        )
        refreshed = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: UPDATED_AND_REDUCED_FEED,
        )
        assert refreshed.status is SyncStatus.SUCCEEDED
        assert refreshed.updated_count == 1
        assert refreshed.cancelled_count == 2

        bookings = {
            booking.external_event_id: booking
            for booking in db.scalars(sa.select(service.Booking))
        }
        assert bookings["reservation-1@example.test"].check_in.isoformat() == "2026-08-11T14:00:00+00:00"
        assert bookings["block-1@example.test"].status is BookingStatus.CANCELLED
        assert bookings["same-day-block@example.test"].status is BookingStatus.CANCELLED


def test_partial_sync_preserves_missing_bookings(client: TestClient) -> None:
    identity = register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)

    with SessionLocal() as db:
        service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: VALID_FEED,
        )
        channel = db.get(Channel, feed["id"])
        assert channel is not None
        last_successful_sync_at = channel.last_successful_sync_at
        partial_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: PARTIAL_FEED,
        )
        assert partial_run.status is SyncStatus.PARTIAL
        assert partial_run.rejected_count == 1
        assert partial_run.cancelled_count == 0
        db.refresh(channel)
        assert channel.last_successful_sync_at == last_successful_sync_at
        assert channel.last_error_summary == partial_run.error_summary
        assert db.scalar(
            sa.select(service.Booking.status).where(
                service.Booking.external_event_id == "block-1@example.test"
            )
        ) is BookingStatus.CONFIRMED


def test_sync_reconciles_booking_conflicts_for_complete_and_partial_feeds(
    client: TestClient,
) -> None:
    identity = register_manager(client)
    property_id = create_property(client)
    feed = configure_feed(client, property_id)
    direct_booking = client.post(
        "/api/v1/bookings",
        json={
            "property_id": property_id,
            "source_type": "direct",
            "record_type": "reservation",
            "status": "confirmed",
            "check_in": "2026-08-09T14:00:00Z",
            "check_out": "2026-08-11T10:00:00Z",
            "guest_name": "Direct guest",
        },
        headers=csrf_headers(client),
    )
    assert direct_booking.status_code == 201, direct_booking.text

    with SessionLocal() as db:
        first_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: VALID_FEED,
        )
        assert first_run.status is SyncStatus.SUCCEEDED, first_run.error_summary

        conflicts = client.get("/api/v1/booking-conflicts")
        assert conflicts.status_code == 200, conflicts.text
        assert conflicts.json()["total"] == 1

        partial_run = service.sync_channel(
            db,
            company_id=identity["company"]["id"],
            channel_id=feed["id"],
            fetcher=lambda _: PARTIAL_FEED,
        )
        assert partial_run.status is SyncStatus.PARTIAL

    repeated = client.get("/api/v1/booking-conflicts")
    assert repeated.status_code == 200
    assert repeated.json()["total"] == 0
    resolved = client.get("/api/v1/booking-conflicts?status=resolved")
    assert resolved.status_code == 200
    assert resolved.json()["total"] == 1


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


def test_calendar_booking_list_is_bounded_filtered_and_privacy_safe(client: TestClient) -> None:
    unauthenticated = TestClient(client.app)
    unauthenticated_list = unauthenticated.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-11T00:00:00Z",
        },
    )
    assert unauthenticated_list.status_code == 401
    unauthenticated_feeds = unauthenticated.get("/api/v1/calendar-feeds")
    assert unauthenticated_feeds.status_code == 401

    register_manager(client)
    property_id = create_property(client)
    active = client.post(
        "/api/v1/bookings",
        json={
            "property_id": property_id,
            "source_type": "direct",
            "record_type": "reservation",
            "status": "confirmed",
            "check_in": "2026-08-10T14:00:00Z",
            "check_out": "2026-08-12T10:00:00Z",
            "guest_name": "Visible Guest",
            "guest_contact": "+21620000000",
            "notes": "Private staff note",
        },
        headers=csrf_headers(client),
    )
    assert active.status_code == 201, active.text
    cancelled = client.post(
        "/api/v1/bookings",
        json={
            "property_id": property_id,
            "source_type": "manual",
            "record_type": "blocked_period",
            "status": "confirmed",
            "check_in": "2026-08-13T00:00:00Z",
            "check_out": "2026-08-14T00:00:00Z",
        },
        headers=csrf_headers(client),
    )
    assert cancelled.status_code == 201, cancelled.text
    cancel_response = client.post(
        f"/api/v1/bookings/{cancelled.json()['id']}/cancel",
        headers=csrf_headers(client),
    )
    assert cancel_response.status_code == 200, cancel_response.text

    listed = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "source_type": "direct",
            "page_size": 100,
        },
    )
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 1
    item = listed.json()["items"][0]
    assert item["id"] == active.json()["id"]
    assert item["guest_name"] == "Visible Guest"
    assert "guest_contact" not in item
    assert "notes" not in item
    assert "raw_payload" not in item

    cancelled_list = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "status": "cancelled",
            "page_size": 100,
        },
    )
    assert cancelled_list.status_code == 200
    assert cancelled_list.json()["total"] == 1

    detail = client.get(f"/api/v1/bookings/{active.json()['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["guest_contact"] == "+21620000000"
    assert detail.json()["notes"] == "Private staff note"
    assert "raw_payload" not in detail.json()

    invalid_range = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00",
            "range_end": "2026-08-11T00:00:00Z",
        },
    )
    assert invalid_range.status_code == 422
    assert invalid_range.json()["code"] == "calendar_range_timezone_required"

    too_large = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-01T00:00:00Z",
            "range_end": "2026-09-02T00:00:00Z",
        },
    )
    assert too_large.status_code == 422
    assert too_large.json()["code"] == "calendar_range_too_large"

    staff_client = activate_staff(client)
    staff_list = staff_client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
        },
    )
    assert staff_list.status_code == 200, staff_list.text
    assert staff_list.json()["total"] == 1


def test_calendar_booking_and_feed_details_enforce_tenant_scope(client: TestClient) -> None:
    register_manager(client)
    property_id = create_property(client)
    booking = client.post(
        "/api/v1/bookings",
        json={
            "property_id": property_id,
            "source_type": "direct",
            "record_type": "reservation",
            "status": "confirmed",
            "check_in": "2026-08-10T14:00:00Z",
            "check_out": "2026-08-12T10:00:00Z",
        },
        headers=csrf_headers(client),
    )
    assert booking.status_code == 201
    other_client = TestClient(client.app)
    register_manager(other_client)

    hidden_booking = other_client.get(f"/api/v1/bookings/{booking.json()['id']}")
    assert hidden_booking.status_code == 404
    hidden_feed = other_client.get("/api/v1/calendar-feeds")
    assert hidden_feed.status_code == 200
    assert hidden_feed.json()["total"] == 0


def test_calendar_booking_range_filters_and_pagination(client: TestClient) -> None:
    register_manager(client)
    first_property = create_property(client)
    second_property = create_property(client)

    def create_entry(property_id: str, **values: str) -> dict:
        payload = {
            "property_id": property_id,
            "source_type": "direct",
            "record_type": "reservation",
            "status": "confirmed",
            "check_in": "2026-08-11T14:00:00Z",
            "check_out": "2026-08-13T10:00:00Z",
            "guest_name": "Calendar guest",
        }
        payload.update(values)
        response = client.post(
            "/api/v1/bookings", json=payload, headers=csrf_headers(client)
        )
        assert response.status_code == 201, response.text
        return response.json()

    adjacent = create_entry(
        first_property,
        check_in="2026-08-09T14:00:00Z",
        check_out="2026-08-10T00:00:00Z",
    )
    tentative = create_entry(
        first_property,
        status="tentative",
        check_in="2026-08-11T14:00:00Z",
        check_out="2026-08-13T10:00:00Z",
    )
    blocked = create_entry(
        second_property,
        source_type="manual",
        record_type="blocked_period",
        check_in="2026-08-14T00:00:00Z",
        check_out="2026-08-16T00:00:00Z",
        guest_name=None,
    )

    listed = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "page_size": 1,
        },
    )
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 2
    assert listed.json()["pages"] == 2
    assert len(listed.json()["items"]) == 1
    assert listed.json()["items"][0]["id"] in {tentative["id"], blocked["id"]}
    assert adjacent["id"] not in {
        item["id"] for item in listed.json()["items"]
    }

    property_filtered = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "property_id": first_property,
        },
    )
    assert property_filtered.status_code == 200
    assert property_filtered.json()["total"] == 1
    assert property_filtered.json()["items"][0]["id"] == tentative["id"]

    source_filtered = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "source_type": "manual",
        },
    )
    assert source_filtered.status_code == 200
    assert source_filtered.json()["total"] == 1
    assert source_filtered.json()["items"][0]["id"] == blocked["id"]

    status_filtered = client.get(
        "/api/v1/bookings",
        params={
            "range_start": "2026-08-10T00:00:00Z",
            "range_end": "2026-08-15T00:00:00Z",
            "status": "tentative",
        },
    )
    assert status_filtered.status_code == 200
    assert status_filtered.json()["total"] == 1
    assert status_filtered.json()["items"][0]["id"] == tentative["id"]


def test_calendar_feed_health_classifies_all_states_without_exposing_urls(client: TestClient) -> None:
    identity = register_manager(client)
    now = datetime.now(timezone.utc)
    configurations = [
        ("pending", None, None, True),
        ("running", SyncStatus.RUNNING, now, True),
        ("healthy", SyncStatus.SUCCEEDED, now, True),
        (
            "stale",
            SyncStatus.SUCCEEDED,
            now - timedelta(seconds=settings.calendar_sync_interval_seconds * 2 + 1),
            True,
        ),
        ("partial", SyncStatus.PARTIAL, now, True),
        ("failed", SyncStatus.FAILED, now, True),
        ("inactive", SyncStatus.SUCCEEDED, now, False),
    ]
    for label, run_status, completed_at, active in configurations:
        property_id = create_property(client)
        feed = client.post(
            f"/api/v1/properties/{property_id}/calendar-feeds",
            json={
                "channel_type": "airbnb",
                "calendar_url": f"https://calendar.example.test/{label}.ics",
                "external_listing_id": label,
            },
            headers=csrf_headers(client),
        )
        assert feed.status_code == 201, feed.text
        with SessionLocal() as db:
            channel = db.get(service.Channel, feed.json()["id"])
            assert channel is not None
            channel.is_active = active
            if run_status is not None:
                run = CalendarSyncRun(
                    company_id=identity["company"]["id"],
                    channel_id=channel.id,
                    status=run_status,
                    started_at=completed_at or now,
                    completed_at=completed_at if run_status is not SyncStatus.RUNNING else None,
                )
                db.add(run)
                if run_status is SyncStatus.SUCCEEDED:
                    channel.last_successful_sync_at = completed_at
                if run_status in (SyncStatus.PARTIAL, SyncStatus.FAILED):
                    channel.last_error_summary = f"{label} error"
            db.commit()

    response = client.get("/api/v1/calendar-feeds?page_size=100")
    assert response.status_code == 200, response.text
    health_by_listing = {
        item["last_error_summary"].removesuffix(" error")
        if item["last_error_summary"]
        else item["health_status"]: item["health_status"]
        for item in response.json()["items"]
    }
    assert health_by_listing["pending"] == "pending"
    assert health_by_listing["running"] == "running"
    assert health_by_listing["healthy"] == "healthy"
    assert health_by_listing["stale"] == "stale"
    assert health_by_listing["partial"] == "partial"
    assert health_by_listing["failed"] == "failed"
    assert health_by_listing["inactive"] == "inactive"
    assert all("calendar_url" not in item for item in response.json()["items"])

