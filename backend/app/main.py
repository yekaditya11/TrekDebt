from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.database import Base, engine
from app.models import models  # noqa: F401 — register models
from app.routers import trips


def _ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    # create_all does not ALTER existing tables — keep Aiven in sync
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS "
                "currency VARCHAR(3) NOT NULL DEFAULT 'INR'"
            )
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        _ensure_schema()
    except Exception as exc:  # noqa: BLE001 — keep function alive on cold start DB blips
        print(f"[startup] database init skipped: {exc}")
    yield


settings = get_settings()

app = FastAPI(
    title="TrekDebt API",
    description="Shared trip expense tracker for groups of friends",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": "Could not complete the request due to a data conflict"},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "trekdebt-api", "docs": "/docs", "health": "/api/health"}
