from fastapi import APIRouter

from app.modules.identity.router import router as identity_router
from app.modules.identity.router import team_router


router = APIRouter(prefix="/api/v1")
router.include_router(identity_router)
router.include_router(team_router)
