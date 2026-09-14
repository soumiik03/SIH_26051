"""
Vercel Serverless Entrypoint for FastAPI Backend.
Exports the ASGI application instance for Vercel's Python runtime.
"""

import sys
from pathlib import Path

# Add project root and backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

for path in (ROOT_DIR, BACKEND_DIR):
    str_path = str(path)
    if str_path not in sys.path:
        sys.path.insert(0, str_path)

from backend.main import app  # noqa: E402
