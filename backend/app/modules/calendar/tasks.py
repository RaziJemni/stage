from uuid import UUID

from sqlalchemy import select

from app.core.database import SessionLocal
from app.modules.calendar.service import sync_channel
from app.modules.properties.models import Channel
from app.worker import celery


@celery.task(name="vayca.calendar.sync_channel")
def sync_calendar_channel(company_id: str, channel_id: str) -> str:
    with SessionLocal() as db:
        sync_run = sync_channel(db, company_id=UUID(company_id), channel_id=UUID(channel_id))
        return str(sync_run.id)


@celery.task(name="vayca.calendar.refresh_due_channels")
def refresh_due_channels() -> int:
    with SessionLocal() as db:
        channels = db.execute(
            select(Channel.id, Channel.company_id).where(
                Channel.is_active, Channel.calendar_url.is_not(None)
            )
        ).all()
    for channel_id, company_id in channels:
        sync_calendar_channel.delay(str(company_id), str(channel_id))
    return len(channels)
