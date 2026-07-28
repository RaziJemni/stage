import os

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
)


@celery.task(name="vayca.healthcheck")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
