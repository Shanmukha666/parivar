from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from typing import AsyncGenerator

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Parivar Path API starting up...")
    yield
    logger.info("Parivar Path API shutting down...")

app = FastAPI(title="Parivar Path API", lifespan=lifespan)

import os

origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "title": "Parivar Path API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "problem_statement": "SIH 2026 #26241 - MSDE"
    }

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
