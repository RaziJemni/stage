"""create the initial Vayca operational schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


company_status = postgresql.ENUM(
    "active", "suspended", "archived", name="company_status", create_type=False
)
user_role = postgresql.ENUM("manager", "staff", name="user_role", create_type=False)
user_status = postgresql.ENUM(
    "invited", "active", "inactive", name="user_status", create_type=False
)
property_status = postgresql.ENUM(
    "active", "archived", name="property_status", create_type=False
)
channel_type = postgresql.ENUM(
    "airbnb", "booking_com", "direct", "other", name="channel_type", create_type=False
)
sync_status = postgresql.ENUM(
    "running", "succeeded", "partial", "failed", name="sync_status", create_type=False
)
booking_source = postgresql.ENUM(
    "airbnb", "booking_com", "direct", "manual", "other", name="booking_source", create_type=False
)
booking_status = postgresql.ENUM(
    "tentative", "confirmed", "cancelled", name="booking_status", create_type=False
)
booking_record_type = postgresql.ENUM(
    "reservation", "blocked_period", name="booking_record_type", create_type=False
)
conflict_status = postgresql.ENUM(
    "open", "acknowledged", "resolved", "dismissed", name="conflict_status", create_type=False
)
conversation_status = postgresql.ENUM(
    "open", "closed", name="conversation_status", create_type=False
)
handling_mode = postgresql.ENUM(
    "automatic", "manual", name="handling_mode", create_type=False
)
message_direction = postgresql.ENUM(
    "inbound", "outbound", name="message_direction", create_type=False
)
sender_type = postgresql.ENUM(
    "guest", "chatbot", "staff", "system", name="sender_type", create_type=False
)
delivery_status = postgresql.ENUM(
    "received", "queued", "sent", "delivered", "failed", name="delivery_status", create_type=False
)
ticket_priority = postgresql.ENUM(
    "low", "medium", "high", "urgent", name="ticket_priority", create_type=False
)
ticket_status = postgresql.ENUM(
    "open", "assigned", "in_progress", "resolved", "cancelled", name="ticket_status", create_type=False
)

enum_types = (
    company_status,
    user_role,
    user_status,
    property_status,
    channel_type,
    sync_status,
    booking_source,
    booking_status,
    booking_record_type,
    conflict_status,
    conversation_status,
    handling_mode,
    message_direction,
    sender_type,
    delivery_status,
    ticket_priority,
    ticket_status,
)


def uuid_column(name: str = "id") -> sa.Column:
    return sa.Column(
        name,
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"),
        nullable=False,
    )


def upgrade() -> None:
    bind = op.get_bind()
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    for enum_type in enum_types:
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "companies",
        uuid_column(),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", company_status, server_default="active", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="Africa/Tunis", nullable=False),
        sa.Column("default_currency", sa.String(length=3), server_default="TND", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("char_length(default_currency) = 3", name="companies_currency_length"),
        sa.PrimaryKeyConstraint("id", name="pk_companies"),
    )

    op.create_table(
        "app_users",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("status", user_status, server_default="invited", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_app_users_company_id_companies", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_app_users"),
        sa.UniqueConstraint("company_id", "id", name="uq_app_users_company_id_id"),
        sa.UniqueConstraint("email", name="uq_app_users_email"),
    )

    op.create_table(
        "properties",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("address_line1", sa.String(length=200)),
        sa.Column("address_line2", sa.String(length=200)),
        sa.Column("city", sa.String(length=100)),
        sa.Column("postal_code", sa.String(length=20)),
        sa.Column("country_code", sa.String(length=2), server_default="TN", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="Africa/Tunis", nullable=False),
        sa.Column("max_guests", sa.Integer),
        sa.Column("check_in_time", sa.Time),
        sa.Column("check_out_time", sa.Time),
        sa.Column("wifi_network", sa.String(length=160)),
        sa.Column("wifi_password", sa.String(length=255)),
        sa.Column("parking_info", sa.Text),
        sa.Column("amenities", postgresql.JSONB),
        sa.Column("house_rules", sa.Text),
        sa.Column("emergency_contact", sa.Text),
        sa.Column("directions", sa.Text),
        sa.Column("external_booking_url", sa.String(length=500)),
        sa.Column("status", property_status, server_default="active", nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_properties_company_id_companies", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_properties"),
        sa.UniqueConstraint("company_id", "id", name="uq_properties_company_id_id"),
    )

    op.create_table(
        "channels",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_type", channel_type, nullable=False),
        sa.Column("external_listing_id", sa.String(length=255)),
        sa.Column("calendar_url", sa.String(length=2000)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("last_successful_sync_at", sa.DateTime(timezone=True)),
        sa.Column("last_error_summary", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_channels_company_property",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_channels"),
        sa.UniqueConstraint("company_id", "id", name="uq_channels_company_id_id"),
    )

    op.create_table(
        "calendar_sync_runs",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sync_status, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cancelled_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("rejected_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_summary", sa.Text),
        sa.Column("correlation_id", sa.String(length=100)),
        sa.ForeignKeyConstraint(
            ["company_id", "channel_id"],
            ["channels.company_id", "channels.id"],
            name="fk_calendar_sync_runs_company_channel",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_calendar_sync_runs"),
        sa.UniqueConstraint("company_id", "id", name="uq_calendar_sync_runs_company_id_id"),
    )

    op.create_table(
        "bookings",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True)),
        sa.Column("source_type", booking_source, nullable=False),
        sa.Column("external_event_id", sa.String(length=255)),
        sa.Column("guest_name", sa.String(length=160)),
        sa.Column("guest_contact", sa.String(length=255)),
        sa.Column("check_in", sa.DateTime(timezone=True), nullable=False),
        sa.Column("check_out", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", booking_status, server_default="confirmed", nullable=False),
        sa.Column("record_type", booking_record_type, nullable=False),
        sa.Column("external_updated_at", sa.DateTime(timezone=True)),
        sa.Column("raw_payload", postgresql.JSONB),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("check_out > check_in", name="booking_date_range"),
        sa.ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_bookings_company_property",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "channel_id"],
            ["channels.company_id", "channels.id"],
            name="fk_bookings_company_channel",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_bookings"),
        sa.UniqueConstraint("company_id", "id", name="uq_bookings_company_id_id"),
    )

    op.create_table(
        "booking_conflicts",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", conflict_status, server_default="open", nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolution_note", sa.Text),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_by_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_booking_conflicts_company_property",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "resolved_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_booking_conflicts_company_resolved_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_booking_conflicts"),
        sa.UniqueConstraint("company_id", "id", name="uq_booking_conflicts_company_id_id"),
    )

    op.create_table(
        "booking_conflict_bookings",
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conflict_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "conflict_id"],
            ["booking_conflicts.company_id", "booking_conflicts.id"],
            name="fk_conflict_bookings_company_conflict",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_conflict_bookings_company_booking",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("company_id", "conflict_id", "booking_id", name="pk_booking_conflict_bookings"),
    )

    op.create_table(
        "conversations",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True)),
        sa.Column("guest_contact_identifier", sa.String(length=255), nullable=False),
        sa.Column("status", conversation_status, server_default="open", nullable=False),
        sa.Column("handling_mode", handling_mode, server_default="automatic", nullable=False),
        sa.Column("assigned_staff_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("last_message_at", sa.DateTime(timezone=True)),
        sa.Column("escalation_reason", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_conversations_company_property",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_conversations_company_booking",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "assigned_staff_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_conversations_company_assigned_staff",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_conversations"),
        sa.UniqueConstraint("company_id", "id", name="uq_conversations_company_id_id"),
    )

    op.create_table(
        "messages",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_message_id", sa.String(length=255)),
        sa.Column("direction", message_direction, nullable=False),
        sa.Column("sender_type", sender_type, nullable=False),
        sa.Column("sender_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("language", sa.String(length=16)),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("delivery_status", delivery_status, server_default="received", nullable=False),
        sa.Column("automatically_sent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("model_version", sa.String(length=100)),
        sa.Column("escalation_reason", sa.Text),
        sa.Column("provider_timestamp", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "conversation_id"],
            ["conversations.company_id", "conversations.id"],
            name="fk_messages_company_conversation",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "sender_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_messages_company_sender_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_messages"),
        sa.UniqueConstraint("company_id", "id", name="uq_messages_company_id_id"),
    )

    op.create_table(
        "contractors",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=40)),
        sa.Column("specialty", sa.String(length=100)),
        sa.Column("notes", sa.Text),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_contractors_company_id_companies", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_contractors"),
        sa.UniqueConstraint("company_id", "id", name="uq_contractors_company_id_id"),
    )

    op.create_table(
        "tickets",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True)),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("category", sa.String(length=80)),
        sa.Column("priority", ticket_priority, server_default="medium", nullable=False),
        sa.Column("status", ticket_status, server_default="open", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("suggested_by_chatbot", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "property_id"],
            ["properties.company_id", "properties.id"],
            name="fk_tickets_company_property",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "booking_id"],
            ["bookings.company_id", "bookings.id"],
            name="fk_tickets_company_booking",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "conversation_id"],
            ["conversations.company_id", "conversations.id"],
            name="fk_tickets_company_conversation",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "created_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_tickets_company_created_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_tickets"),
        sa.UniqueConstraint("company_id", "id", name="uq_tickets_company_id_id"),
    )

    op.create_table(
        "ticket_assignments",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contractor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("notes", sa.Text),
        sa.ForeignKeyConstraint(
            ["company_id", "ticket_id"],
            ["tickets.company_id", "tickets.id"],
            name="fk_ticket_assignments_company_ticket",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "contractor_id"],
            ["contractors.company_id", "contractors.id"],
            name="fk_ticket_assignments_company_contractor",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "assigned_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_ticket_assignments_company_assigned_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_ticket_assignments"),
        sa.UniqueConstraint("company_id", "id", name="uq_ticket_assignments_company_id_id"),
    )

    op.create_table(
        "ticket_status_history",
        uuid_column(),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", ticket_status),
        sa.Column("to_status", ticket_status, nullable=False),
        sa.Column("changed_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("note", sa.Text),
        sa.ForeignKeyConstraint(
            ["company_id", "ticket_id"],
            ["tickets.company_id", "tickets.id"],
            name="fk_ticket_status_history_company_ticket",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "changed_by_user_id"],
            ["app_users.company_id", "app_users.id"],
            name="fk_ticket_status_history_company_changed_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_ticket_status_history"),
        sa.UniqueConstraint("company_id", "id", name="uq_ticket_status_history_company_id_id"),
    )

    op.create_index("ix_app_users_company_id", "app_users", ["company_id"])
    op.create_index("ix_app_users_email", "app_users", ["email"])
    op.create_index("ix_properties_company_id", "properties", ["company_id"])
    op.create_index("ix_channels_company_id", "channels", ["company_id"])
    op.create_index("ix_channels_property_id", "channels", ["property_id"])
    op.create_index("ix_calendar_sync_runs_company_id", "calendar_sync_runs", ["company_id"])
    op.create_index("ix_calendar_sync_runs_channel_id", "calendar_sync_runs", ["channel_id"])
    op.create_index("ix_bookings_company_id", "bookings", ["company_id"])
    op.create_index("ix_bookings_property_id", "bookings", ["property_id"])
    op.create_index("ix_bookings_channel_id", "bookings", ["channel_id"])
    op.create_index("ix_booking_conflicts_company_id", "booking_conflicts", ["company_id"])
    op.create_index("ix_booking_conflicts_property_id", "booking_conflicts", ["property_id"])
    op.create_index("ix_conversations_company_id", "conversations", ["company_id"])
    op.create_index("ix_conversations_property_id", "conversations", ["property_id"])
    op.create_index("ix_conversations_booking_id", "conversations", ["booking_id"])
    op.create_index("ix_conversations_assigned_staff_user_id", "conversations", ["assigned_staff_user_id"])
    op.create_index("ix_messages_company_id", "messages", ["company_id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_sender_user_id", "messages", ["sender_user_id"])
    op.create_index("ix_contractors_company_id", "contractors", ["company_id"])
    op.create_index("ix_tickets_company_id", "tickets", ["company_id"])
    op.create_index("ix_tickets_property_id", "tickets", ["property_id"])
    op.create_index("ix_tickets_booking_id", "tickets", ["booking_id"])
    op.create_index("ix_tickets_conversation_id", "tickets", ["conversation_id"])
    op.create_index("ix_tickets_created_by_user_id", "tickets", ["created_by_user_id"])
    op.create_index("ix_ticket_assignments_company_id", "ticket_assignments", ["company_id"])
    op.create_index("ix_ticket_assignments_ticket_id", "ticket_assignments", ["ticket_id"])
    op.create_index("ix_ticket_assignments_contractor_id", "ticket_assignments", ["contractor_id"])
    op.create_index("ix_ticket_status_history_company_id", "ticket_status_history", ["company_id"])
    op.create_index("ix_ticket_status_history_ticket_id", "ticket_status_history", ["ticket_id"])

    op.create_index(
        "uq_channels_external_listing",
        "channels",
        ["company_id", "property_id", "channel_type", "external_listing_id"],
        unique=True,
        postgresql_where=sa.text("external_listing_id IS NOT NULL"),
    )
    op.create_index(
        "uq_bookings_channel_external_event",
        "bookings",
        ["company_id", "channel_id", "external_event_id"],
        unique=True,
        postgresql_where=sa.text("channel_id IS NOT NULL AND external_event_id IS NOT NULL"),
    )
    op.create_index(
        "uq_conversations_open_identity",
        "conversations",
        ["company_id", "property_id", "guest_contact_identifier"],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
    )
    op.create_index(
        "uq_messages_external_id",
        "messages",
        ["company_id", "external_message_id"],
        unique=True,
        postgresql_where=sa.text("external_message_id IS NOT NULL"),
    )
    op.create_index(
        "uq_ticket_assignments_active",
        "ticket_assignments",
        ["company_id", "ticket_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )


def downgrade() -> None:
    for table_name in (
        "ticket_status_history",
        "ticket_assignments",
        "tickets",
        "contractors",
        "messages",
        "conversations",
        "booking_conflict_bookings",
        "booking_conflicts",
        "bookings",
        "calendar_sync_runs",
        "channels",
        "properties",
        "app_users",
        "companies",
    ):
        op.drop_table(table_name)

    bind = op.get_bind()
    for enum_type in reversed(enum_types):
        enum_type.drop(bind, checkfirst=True)
