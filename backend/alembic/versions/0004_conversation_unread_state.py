"""add shared conversation unread state

Revision ID: 0004_conversation_unread_state
Revises: 0003_conflict_ack
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_conversation_unread_state"
down_revision = "0003_conflict_ack"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("unread_message_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute(
        "ALTER TABLE conversations ADD CONSTRAINT "
        "conversation_unread_message_count_nonnegative "
        "CHECK (unread_message_count >= 0)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE conversations DROP CONSTRAINT IF EXISTS "
        "conversation_unread_message_count_nonnegative"
    )
    op.drop_column("conversations", "unread_message_count")
