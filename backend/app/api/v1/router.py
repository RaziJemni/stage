from fastapi import APIRouter

from app.modules.identity.router import router as identity_router
from app.modules.identity.router import team_router
from app.modules.calendar.router import router as calendar_router
from app.modules.messaging.router import router as messaging_router
from app.modules.messaging.router import simulator_router
from app.modules.messaging.communication_router import communication_router
from app.modules.maintenance.router import contractor_router, router as maintenance_router
from app.modules.properties.router import owner_router, router as properties_router
from app.modules.supervision.router import analytics_router, public_owner_router, router as supervision_router

router = APIRouter(prefix="/api/v1")

router.include_router(identity_router)
router.include_router(team_router)
router.include_router(properties_router)
router.include_router(owner_router)
router.include_router(messaging_router)
router.include_router(simulator_router)
router.include_router(communication_router)
router.include_router(calendar_router)
router.include_router(supervision_router)
router.include_router(analytics_router)
router.include_router(public_owner_router)
router.include_router(maintenance_router)
router.include_router(contractor_router)

