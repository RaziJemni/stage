from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import CsrfContext, CurrentContext
from app.modules.messaging.review_service import (
    evaluate_and_send_review_requests,
    list_review_request_logs,
)


class ReviewRequestItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: UUID
    property_id: UUID
    property_name: str
    guest_name: str
    guest_contact: str
    status: str
    skip_reason: str | None
    language: str
    sent_at: str | None


class ReviewSequenceRunResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    processed_count: int
    sent_count: int
    skipped_count: int
    evaluations: list[ReviewRequestItem]


communication_router = APIRouter(prefix="/communication", tags=["Communication"])


@communication_router.post(
    "/review-requests/trigger",
    response_model=ReviewSequenceRunResult,
    summary="Trigger post-stay review request sequence evaluation",
)
def trigger_review_requests_endpoint(
    context: CsrfContext,
    db: Session = Depends(get_db),
) -> ReviewSequenceRunResult:
    evaluations = evaluate_and_send_review_requests(db, company_id=context.company.id)
    sent_count = sum(1 for e in evaluations if e.status == "sent")
    skipped_count = sum(1 for e in evaluations if e.status == "skipped")
    return ReviewSequenceRunResult(
        processed_count=len(evaluations),
        sent_count=sent_count,
        skipped_count=skipped_count,
        evaluations=[ReviewRequestItem(**e.__dict__) for e in evaluations],
    )


@communication_router.get(
    "/review-requests",
    response_model=list[ReviewRequestItem],
    summary="List recent review request sequence evaluations",
)
def list_review_requests_endpoint(
    context: CurrentContext,
    db: Session = Depends(get_db),
) -> list[ReviewRequestItem]:
    logs = list_review_request_logs(db, company_id=context.company.id)
    return [ReviewRequestItem(**e.__dict__) for e in logs]

