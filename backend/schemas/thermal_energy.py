from pydantic import BaseModel
from typing import Optional


class ThermalEnergyRequest(BaseModel):
    """Placeholder schema for thermal energy / heating demand prediction input."""
    pass


class ThermalEnergyResponse(BaseModel):
    """Placeholder schema for thermal energy / heating demand prediction output."""
    status: str = "stub"
    thermal_energy: Optional[float] = None
    heating_demand: Optional[float] = None
