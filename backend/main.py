"""Local: python main.py  |  Vercel can also use this file via `app`."""

from pathlib import Path

import uvicorn

from app.main import app

BACKEND_DIR = Path(__file__).resolve().parent

__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(BACKEND_DIR)],
        reload_includes=["*.py"],
    )
