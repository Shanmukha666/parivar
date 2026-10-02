from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Parivar Path API starting up...")
    yield
    logger.info("Parivar Path API shutting down...")

app = FastAPI(title="Parivar Path API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import chat, outcomes, escalation, admin, auth, summary

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(chat.router, tags=["chat"])
app.include_router(outcomes.router, tags=["outcomes"])
app.include_router(escalation.router, tags=["escalation"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(summary.router, tags=["summary"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
