from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.faces import router as faces_router

app = FastAPI(title="Nikk Photography AI Service")

# This service is only ever called by our own Node backend, never
# directly by browsers - but CORS is included for local development
# convenience (e.g. testing this service's docs UI directly).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(faces_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nikk-photography-ai"}
