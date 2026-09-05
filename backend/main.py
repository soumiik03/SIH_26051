import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure current directory is in sys.path for relative submodule resolution
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

load_dotenv()

try:
    from routers import indoor_temp, design, thermal_energy
except ImportError:
    from backend.routers import indoor_temp, design, thermal_energy

app = FastAPI(
    title="Cold-Climate Shelter Thermal Comfort API",
    description="Microservice backend for passive shelter thermal comfort design & optimization (Ladakh region).",
    version="0.1.0",
)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}

# Mount prediction routers (stubs for Chapter 1)
app.include_router(indoor_temp.router)
app.include_router(design.router)
app.include_router(thermal_energy.router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
