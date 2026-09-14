import os
import sys
import logging
from contextlib import asynccontextmanager
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
    from routers import indoor_temp, design, thermal_energy, optimization, heat_flow
    from services import model_loader, climate
    from services.envelope_physics import (
        MATERIAL_CONDUCTIVITY,
        MATERIAL_THERMAL_MASS,
        MATERIAL_COSTS_INR_PER_M3,
        MATERIAL_COST_RANGES_INR_PER_M3,
    )
except ImportError:
    from backend.routers import indoor_temp, design, thermal_energy, optimization, heat_flow
    from backend.services import model_loader
    from backend.services import climate
    from backend.services.envelope_physics import (
        MATERIAL_CONDUCTIVITY,
        MATERIAL_THERMAL_MASS,
        MATERIAL_COSTS_INR_PER_M3,
        MATERIAL_COST_RANGES_INR_PER_M3,
    )


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Load all ML models into memory at startup — not per-request."""
    logger.info("Loading ML model artifacts...")
    try:
        model_loader.load_all()
        logger.info("All models loaded successfully.")
    except FileNotFoundError as e:
        logger.error("Model loading failed: %s", e)
        logger.error(
            "Run 'python scripts/export_models.py' to generate model artifacts."
        )
    yield


app = FastAPI(
    title="Cold-Climate Shelter Thermal Comfort API",
    description="Microservice backend for passive shelter thermal comfort design & optimization (Ladakh region).",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
raw_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000,http://127.0.0.1:3000")
if raw_frontend_url.strip() == "*":
    origins = ["*"]
else:
    configured_origins = [url.strip() for url in raw_frontend_url.split(",") if url.strip()]
    default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    # Preserve unique order
    origins = list(dict.fromkeys(configured_origins + default_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health endpoint
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    ready = model_loader.is_ready()
    return {"status": "ok" if ready else "degraded", "models_loaded": ready}


@app.get("/climate", tags=["Climate Data"])
@app.get("/api/climate", tags=["Climate Data"])
def climate_data(latitude: float, longitude: float, start: str | None = None, end: str | None = None):
    """Return cached/retrieved NASA POWER climate values for a location."""
    from datetime import date
    from fastapi import HTTPException

    try:
        result = climate.get_climate(
            latitude, longitude,
            date.fromisoformat(start) if start else None,
            date.fromisoformat(end) if end else None,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return result.__dict__


@app.get("/materials", tags=["Material Data"])
@app.get("/api/materials", tags=["Material Data"])
def material_catalog():
    """Expose the canonical material values used by physics and optimization."""
    return {
        name: {
            "thermal_mass_MJ_m3K": MATERIAL_THERMAL_MASS[name],
            "k_W_mK": MATERIAL_CONDUCTIVITY[name],
            "lsor_cost_range": MATERIAL_COST_RANGES_INR_PER_M3[name]["range_str"],
            "lsor_cost_inr_m3": MATERIAL_COSTS_INR_PER_M3[name],
        }
        for name in ("Concrete", "Mud_Brick", "Rammed_Earth", "Stone")
    }

# Mount prediction routers (supporting both root and /api prefixed routes)
for r in (indoor_temp.router, design.router, thermal_energy.router, optimization.router, heat_flow.router):
    app.include_router(r)
    app.include_router(r, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
