from fastapi import FastAPI, Response

from app.core.database import check_database_connection


app = FastAPI(title="Vayca API")


@app.get("/health")
def health(response: Response):
    if not check_database_connection():
        response.status_code = 503
        return {"status": "degraded", "database": "unavailable"}

    return {"status": "ok", "database": "ok"}


@app.get("/health/live")
def liveness():
    return {"status": "ok"}
