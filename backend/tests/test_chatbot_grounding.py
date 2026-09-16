import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app.core.database import SessionLocal
from app.core.enums import (
    BookingRecordType,
    BookingSource,
    BookingStatus,
    CompanyStatus,
    HandlingMode,
    UserRole,
    UserStatus,
)
from app.integrations.chatbot import ChatbotProviderError
from app.modules.calendar.models import Booking
from app.modules.chatbot import service as chatbot_service
from app.modules.chatbot.service import process_inbound_message
from app.modules.identity.models import AppUser, Company
from app.modules.messaging import service as messaging_service
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


def create_context() -> tuple[UUID, UUID]:
    with SessionLocal() as db:
        company = Company(
            name="Chatbot Operations",
            status=CompanyStatus.ACTIVE,
            timezone="Africa/Tunis",
        )
        db.add(company)
        db.flush()
        db.add(
            AppUser(
                company_id=company.id,
                name="Manager",
                email=f"chatbot-{uuid4()}@example.com",
                password_hash="not-used-by-chatbot-tests",
                role=UserRole.MANAGER,
                status=UserStatus.ACTIVE,
            )
        )
        property_obj = Property(
            company_id=company.id,
            name="Villa Grounded",
            city="Tunis",
            wifi_password="villa-guest-wifi",
            check_in_time=datetime.strptime("15:00", "%H:%M").time(),
        )
        db.add(property_obj)
        db.commit()
        return company.id, property_obj.id


def record_inbound(
    company_id: UUID,
    property_id: UUID,
    *,
    content: str,
    language: str | None = None,
    guest_contact_identifier: str = "+21699887766",
):
    with SessionLocal() as db:
        return messaging_service.record_inbound_message(
            db,
            company_id=company_id,
            property_id=property_id,
            guest_contact_identifier=guest_contact_identifier,
            content=content,
            external_message_id=f"chatbot-inbound-{uuid4()}",
            language=language,
        ).message


def test_safe_property_reply_is_grounded_multilingual_and_auditable() -> None:
    company_id, property_id = create_context()
    inbound = record_inbound(company_id, property_id, content="Quel est le mot de passe wifi ?", language="fr")

    with SessionLocal() as db:
        reply = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound.id)

    assert reply is not None
    assert reply.sender_type.value == "chatbot"
    assert reply.language == "fr"
    assert reply.content == "Wi-Fi : villa-guest-wifi"
    assert reply.delivery_status.value == "queued"
    assert reply.automatically_sent is True
    assert reply.model_version == "vayca-deterministic-v1"


def test_availability_reply_uses_calendar_result_exactly_and_is_idempotent() -> None:
    company_id, property_id = create_context()
    with SessionLocal() as db:
        db.add(
            Booking(
                company_id=company_id,
                property_id=property_id,
                source_type=BookingSource.MANUAL,
                check_in=datetime(2026, 9, 10, tzinfo=UTC),
                check_out=datetime(2026, 9, 12, tzinfo=UTC),
                status=BookingStatus.CONFIRMED,
                record_type=BookingRecordType.RESERVATION,
            )
        )
        db.commit()
    inbound = record_inbound(
        company_id,
        property_id,
        content="Is the villa available from 2026-09-10 to 2026-09-12?",
        language="en",
    )

    with SessionLocal() as db:
        reply = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound.id)
        second = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound.id)

    assert reply is not None
    assert reply.content == "Availability: unavailable"
    assert second is not None
    assert second.id == reply.id


def test_arabic_availability_reply_uses_the_supported_language() -> None:
    company_id, property_id = create_context()
    inbound = record_inbound(
        company_id,
        property_id,
        content="هل المكان متاح من 2026-10-01 إلى 2026-10-03؟",
        language="ar",
    )

    with SessionLocal() as db:
        reply = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound.id)

    assert reply is not None
    assert reply.language == "ar"
    assert reply.content == "التوفر: متاح"


def test_missing_facts_and_provider_failure_escalate_without_chatbot_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    company_id, property_id = create_context()
    missing = record_inbound(company_id, property_id, content="What is the parking information?")
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=missing.id) is None
        conversation = messaging_service.get_conversation(db, company_id, missing.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "missing_or_uncertain_information"

    # A new automatic conversation receives a provider failure after facts are found.
    inbound = record_inbound(
        company_id,
        property_id,
        content="What is the Wi-Fi password?",
        guest_contact_identifier="+21699887767",
    )

    def unavailable_provider():
        raise ChatbotProviderError("offline")

    monkeypatch.setattr(chatbot_service, "get_chatbot_provider", unavailable_provider)
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=inbound.id) is None
        conversation = messaging_service.get_conversation(db, company_id, inbound.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "chatbot_provider_unavailable"


def test_other_company_cannot_process_an_inbound_message() -> None:
    company_id, property_id = create_context()
    inbound = record_inbound(company_id, property_id, content="What is the Wi-Fi password?")
    other_company_id, _ = create_context()

    with SessionLocal() as db:
        assert process_inbound_message(
            db, company_id=other_company_id, inbound_message_id=inbound.id
        ) is None
        assert db.scalar(
            sa.select(sa.func.count()).select_from(
                chatbot_service.Message
            ).where(chatbot_service.Message.sender_type == "chatbot")
        ) == 0


def test_invalid_availability_date_range_and_timezone_escalate_cleanly() -> None:
    company_id, property_id = create_context()
    # Check-out before check-in
    invalid_dates = record_inbound(
        company_id,
        property_id,
        content="Is it available from 2026-10-05 to 2026-10-01?",
    )
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=invalid_dates.id) is None
        conversation = messaging_service.get_conversation(db, company_id, invalid_dates.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "missing_or_uncertain_information"

    # Property with invalid timezone
    with SessionLocal() as db:
        prop = db.scalar(sa.select(Property).where(Property.id == property_id))
        assert prop is not None
        prop.timezone = "Invalid/Zone"
        db.commit()

    invalid_tz = record_inbound(
        company_id,
        property_id,
        content="Is it available from 2026-10-01 to 2026-10-03?",
        guest_contact_identifier="+21699887768",
    )
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=invalid_tz.id) is None
        conversation = messaging_service.get_conversation(db, company_id, invalid_tz.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "missing_or_uncertain_information"


def test_german_property_and_availability_replies_are_grounded() -> None:
    company_id, property_id = create_context()

    # German Wi-Fi inquiry
    inbound_wifi = record_inbound(
        company_id,
        property_id,
        content="Guten Tag, wie lautet das WLAN Passwort?",
        language="de",
    )
    with SessionLocal() as db:
        reply = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_wifi.id)
    assert reply is not None
    assert reply.language == "de"
    assert reply.content == "Wi-Fi: villa-guest-wifi"
    assert reply.sender_type.value == "chatbot"
    assert reply.delivery_status.value == "queued"

    # German availability inquiry (available)
    inbound_avail = record_inbound(
        company_id,
        property_id,
        content="Ist die Villa verfügbar von 2026-11-01 bis 2026-11-05?",
        language="de",
        guest_contact_identifier="+491512345678",
    )
    with SessionLocal() as db:
        reply_avail = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_avail.id)
    assert reply_avail is not None
    assert reply_avail.language == "de"
    assert reply_avail.content == "Verfügbarkeit: verfügbar"

    # German emergency inquiry escalates
    inbound_emergency = record_inbound(
        company_id,
        property_id,
        content="Es gibt einen Notfall, bitte sofort helfen!",
        language="de",
        guest_contact_identifier="+491512345679",
    )
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_emergency.id) is None
        conversation = messaging_service.get_conversation(db, company_id, inbound_emergency.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "emergency"


def test_italian_property_and_availability_replies_are_grounded() -> None:
    company_id, property_id = create_context()

    # Italian check-in inquiry
    inbound_checkin = record_inbound(
        company_id,
        property_id,
        content="Buongiorno, qual è l'orario di check-in?",
        language="it",
    )
    with SessionLocal() as db:
        reply = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_checkin.id)
    assert reply is not None
    assert reply.language == "it"
    assert reply.content == "Check-in: 15:00:00"
    assert reply.sender_type.value == "chatbot"

    # Italian availability inquiry (available)
    inbound_avail = record_inbound(
        company_id,
        property_id,
        content="La casa è disponibile dal 2026-11-01 al 2026-11-05?",
        language="it",
        guest_contact_identifier="+393401234567",
    )
    with SessionLocal() as db:
        reply_avail = process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_avail.id)
    assert reply_avail is not None
    assert reply_avail.language == "it"
    assert reply_avail.content == "Disponibilità: disponibile"

    # Italian cancellation escalates
    inbound_cancel = record_inbound(
        company_id,
        property_id,
        content="Vorrei cancellare la mia prenotazione per favore.",
        language="it",
        guest_contact_identifier="+393401234568",
    )
    with SessionLocal() as db:
        assert process_inbound_message(db, company_id=company_id, inbound_message_id=inbound_cancel.id) is None
        conversation = messaging_service.get_conversation(db, company_id, inbound_cancel.conversation_id)
        assert conversation is not None
        assert conversation.handling_mode is HandlingMode.MANUAL
        assert conversation.escalation_reason == "cancellation_or_date_change"

