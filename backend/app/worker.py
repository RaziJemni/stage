import os
from datetime import timedelta

from celery import Celery

import app.core.model_registry  # noqa: F401


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
        },
        "send-post-stay-review-requests": {
            "task": "vayca.communication.send_due_review_requests",
            "schedule": timedelta(minutes=30),
        },
        "dispatch-monthly-owner-statements": {
            "task": "vayca.supervision.dispatch_monthly_owner_statements",
            "schedule": timedelta(days=1),
        },
    },
)

celery.autodiscover_tasks(["app.modules.calendar", "app.modules.chatbot", "app.modules.messaging", "app.modules.supervision"])


@celery.task(name="vayca.healthcheck")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
