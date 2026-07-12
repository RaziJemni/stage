from fastapi import FastAPI

app = FastAPI(title="VacayOps API")


@app.get("/health")
def health_check():
    """Used in step 4 of the setup checklist -- everyone should see
    the exact same response here once their environment is running."""
    return {"status": "ok"}
