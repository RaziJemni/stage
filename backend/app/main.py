from fastapi import FastAPI

from app.api.errors import ApiProblem, register_exception_handlers
from app.api.middleware import RequestIdMiddleware
from app.api.v1.router import router as api_v1_router
from app.core.database import check_database_connection


def create_app() -> FastAPI:
    application = FastAPI(
        title="Vayca API",
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
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
