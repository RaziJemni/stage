from fastapi import FastAPI

app = FastAPI(title="Vayca API")

@app.get("/health")
def health():
    return {"status": "ok"}
