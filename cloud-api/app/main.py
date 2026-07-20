"""PT Dashboard — Cloud API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import engine
from app.models.all import Base
from app.routes import auth, sites, ingest, dashboard, users

# Ensure tables exist (for non-migration scenarios)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PT Dashboard API",
    description="Multi-tenant SaaS dashboard for ProfitTrack POS data aggregation, visualization, and reporting.",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(sites.router)
app.include_router(ingest.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
