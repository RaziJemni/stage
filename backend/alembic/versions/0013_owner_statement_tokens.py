"""Add owner statement access tokens table for secure read-only owner portal access.

Revision ID: 0013_owner_statement_tokens
Revises: 0012_booking_pricing_decisions
"""

import sqlalchemy as sa
from alembic import op


revision = "0013_owner_statement_tokens"
down_revision = "0012_booking_pricing_decisions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "owner_statement_access_tokens",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "owner_id"], ["owners.company_id", "owners.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_owner_statement_tokens_hash"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="owner_statement_tokens_month_range"),
    )
    op.create_index("ix_owner_statement_tokens_company", "owner_statement_access_tokens", ["company_id"])
    op.create_index("ix_owner_statement_tokens_owner", "owner_statement_access_tokens", ["owner_id"])
    op.create_index("ix_owner_statement_tokens_hash", "owner_statement_access_tokens", ["token_hash"])
    op.create_index("ix_owner_statement_tokens_expires", "owner_statement_access_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_table("owner_statement_access_tokens")
