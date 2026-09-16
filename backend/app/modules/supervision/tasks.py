from datetime import datetime, timezone
import logging
from uuid import UUID

from sqlalchemy import select

from app.core.database import SessionLocal
from app.modules.properties.models import Owner, Property
from app.modules.supervision.payout_service import dispatch_statement_email
from app.worker import celery

logger = logging.getLogger("vayca.supervision.tasks")


@celery.task(name="vayca.supervision.dispatch_monthly_owner_statements")
def dispatch_monthly_owner_statements(target_year: int | None = None, target_month: int | None = None) -> dict[str, int]:
    """Scheduled task to dispatch monthly performance statements to active property owners."""
    now = datetime.now(timezone.utc)
    if target_year is None or target_month is None:
        if now.month == 1:
            year = now.year - 1
            month = 12
        else:
            year = now.year
            month = now.month - 1
    else:
        year = target_year
        month = target_month

    sent_count = 0
    skipped_count = 0

    with SessionLocal() as db:
        owners = list(db.scalars(select(Owner).where(Owner.is_active.is_(True))).all())

        for owner in owners:
            if not owner.email or not owner.email.strip():
                skipped_count += 1
                continue

            # Verify owner has active properties
            has_prop = db.scalars(
                select(Property.id).where(
                    Property.company_id == owner.company_id,
                    Property.owner_id == owner.id,
                )
            ).first()

            if not has_prop:
                skipped_count += 1
                continue

            try:
                dispatch_statement_email(
                    db,
                    company_id=owner.company_id,
                    owner_id=owner.id,
                    year=year,
                    month=month,
                )
                sent_count += 1
                logger.info("Dispatched monthly statement to owner %s <%s> for %04d-%02d", owner.name, owner.email, year, month)
            except Exception as e:
                logger.error("Failed to dispatch monthly statement to owner %s: %s", owner.id, e)
                skipped_count += 1

    return {
        "year": year,
        "month": month,
        "sent": sent_count,
        "skipped": skipped_count,
    }
