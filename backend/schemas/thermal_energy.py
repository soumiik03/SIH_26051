"""Pydantic schemas for the thermal energy prediction endpoint.

Field names match the training dataset columns EXACTLY —
ladakh_thermal_energy_hourly_dataset.csv.
"""

from typing import Optional

from pydantic import BaseModel, Field


class ThermalEnergyRequest(BaseModel):
    """Input features for thermal energy (heating demand) regression."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hour: Optional[int] = None  # Optional — XGBoost handles missing values
    shelter_volume_m3: float = Field(gt=0)
    wall_material: str  # Stone | Rammed_Earth | Mud_Brick | Concrete
    wall_thickness_cm: float = Field(gt=0)
    glazing_ratio: float = Field(ge=0, le=1)  # Fraction 0-1
    insulation_r_value: float = Field(ge=0)
    ghi_w_m2: Optional[float] = Field(default=None, ge=0)
    ambient_temp_c: Optional[float] = None
    thermal_mass_kj_k: Optional[float] = Field(default=None, gt=0)


class ThermalEnergyResponse(BaseModel):
    """Predicted thermal energy demand."""

    status: str
    thermal_energy_kwh: float
