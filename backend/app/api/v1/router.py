from fastapi import APIRouter

from app.modules.identity.router import router as identity_router
from app.modules.identity.router import team_router
from app.modules.calendar.router import router as calendar_router
from app.modules.messaging.router import router as messaging_router
from app.modules.messaging.router import simulator_router
from app.modules.maintenance.router import contractor_router, router as maintenance_router
from app.modules.properties.router import router as properties_router
from app.modules.supervision.router import router as supervision_router

router = APIRouter(prefix="/api/v1")

router.include_router(identity_router)
router.include_router(team_router)
router.include_router(properties_router)
router.include_router(messaging_router)
router.include_router(simulator_router)
router.include_router(calendar_router)
router.include_router(supervision_router)
router.include_router(maintenance_router)
router.include_router(contractor_router)
