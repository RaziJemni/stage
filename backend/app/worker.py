import os
from datetime import timedelta

from celery import Celery


celery = Celery(
    "vayca",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1"),
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone=os.getenv("APP_TIMEZONE", "Africa/Tunis"),
    enable_utc=True,
    beat_schedule={
        "refresh-calendar-feeds": {
            "task": "vayca.calendar.refresh_due_channels",
            "schedule": timedelta(
                seconds=int(os.getenv("CALENDAR_SYNC_INTERVAL_SECONDS", "900"))
            ),
        }
    },
)

celery.autodiscover_tasks(["app.modules.calendar"])


@celery.task(name="vayca.healthcheck")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
