"""Run the API with auto-reload: python main.py"""

from pathlib import Path

import uvicorn

BACKEND_DIR = Path(__file__).resolve().parent

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(BACKEND_DIR)],
        reload_includes=["*.py"],
    )
