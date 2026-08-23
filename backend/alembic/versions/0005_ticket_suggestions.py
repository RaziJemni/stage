"""add persistent ticket suggestions

Revision ID: 0005_ticket_suggestions
Revises: 0004_conversation_unread_state
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_ticket_suggestions"
down_revision = "0004_conversation_unread_state"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ticket_suggestions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True)),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("title", sa.String(200), nullable=False), sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(80)), sa.Column("priority", postgresql.ENUM(name="ticket_priority", create_type=False), server_default="medium", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True)), sa.Column("reviewed_at", sa.DateTime(timezone=True)), sa.Column("ticket_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'confirmed', 'rejected')", name="ticket_suggestion_status_valid"),
        sa.ForeignKeyConstraint(["company_id", "property_id"], ["properties.company_id", "properties.id"], name="fk_ticket_suggestions_company_property", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id", "booking_id"], ["bookings.company_id", "bookings.id"], name="fk_ticket_suggestions_company_booking", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id", "conversation_id"], ["conversations.company_id", "conversations.id"], name="fk_ticket_suggestions_company_conversation", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id", "reviewed_by_user_id"], ["app_users.company_id", "app_users.id"], name="fk_ticket_suggestions_company_reviewer", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("company_id", "id", name="uq_ticket_suggestions_company_id_id"),
    )
    for name, column in (("ix_ticket_suggestions_company_id", "company_id"), ("ix_ticket_suggestions_property_id", "property_id"), ("ix_ticket_suggestions_booking_id", "booking_id"), ("ix_ticket_suggestions_conversation_id", "conversation_id"), ("ix_ticket_suggestions_reviewed_by_user_id", "reviewed_by_user_id")):
        op.create_index(name, "ticket_suggestions", [column])


def downgrade() -> None:
    op.drop_table("ticket_suggestions")
