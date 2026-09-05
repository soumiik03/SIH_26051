from fastapi import APIRouter

try:
    from schemas.thermal_energy import ThermalEnergyRequest, ThermalEnergyResponse
except ImportError:
    from backend.schemas.thermal_energy import ThermalEnergyRequest, ThermalEnergyResponse

router = APIRouter(prefix="/thermal-energy", tags=["Thermal Energy"])


@router.get("/")
def get_thermal_energy_info():
    """Stub endpoint for thermal energy prediction router."""
    return {"message": "Thermal energy prediction endpoint stub"}


@router.post("/predict", response_model=ThermalEnergyResponse)
def predict_thermal_energy(payload: ThermalEnergyRequest):
    """Stub prediction endpoint to be wired in Chapter 1."""
    return ThermalEnergyResponse(status="stub")
