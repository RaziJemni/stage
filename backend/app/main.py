from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import ApiProblem, register_exception_handlers
from app.api.middleware import RequestIdMiddleware
from app.api.v1.router import router as api_v1_router
from app.core.database import check_database_connection
from app.core.config import settings


def create_app() -> FastAPI:
    application = FastAPI(
        title="Vayca API",
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
    )
    application.add_middleware(RequestIdMiddleware)
    register_exception_handlers(application)
    application.include_router(api_v1_router)
    return application


app = create_app()


@app.get("/health", tags=["System"])
def health():
    if not check_database_connection():
        raise ApiProblem(
            status=503,
            title="Service unavailable",
            detail="The database connection is unavailable.",
            code="database_unavailable",
        )

    return {"status": "ok", "database": "ok"}


@app.get("/health/live", tags=["System"])
def liveness():
    return {"status": "ok"}
