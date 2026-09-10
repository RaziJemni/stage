from app.core.database import SessionLocal
from app.modules.messaging.review_service import evaluate_and_send_review_requests
from app.worker import celery


@celery.task(name="vayca.communication.send_due_review_requests")
def send_due_review_requests() -> dict[str, int]:
    with SessionLocal() as db:
        evaluations = evaluate_and_send_review_requests(db)
        sent_count = sum(1 for e in evaluations if e.status == "sent")
        skipped_count = sum(1 for e in evaluations if e.status == "skipped")
        return {
            "processed": len(evaluations),
            "sent": sent_count,
            "skipped": skipped_count,
        }

