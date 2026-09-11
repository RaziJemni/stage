"""add persistent user preferred language

Revision ID: 0006_user_preferred_language
Revises: 0005_ticket_suggestions
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_user_preferred_language"
down_revision = "0005_ticket_suggestions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "app_users",
        sa.Column("preferred_language", sa.String(10), server_default="fr", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("app_users", "preferred_language")
