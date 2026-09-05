"""Pydantic schemas for the indoor temperature prediction endpoint.

Field names match the training dataset columns EXACTLY —
ladakh_indoor_temperature_ml_dataset.csv (after dropping location_id, date, season).
"""

from typing import Optional

from pydantic import BaseModel, Field


class IndoorTempRequest(BaseModel):
    """Input features for indoor temperature regression."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    month: int = Field(ge=1, le=12)
    hour: int = Field(ge=0, le=23)
    outdoor_temperature_C: Optional[float] = None
    wind_speed_mps: Optional[float] = Field(default=None, ge=0)
    thermal_mass_MJ_m3K: float
    insulation_r_value_m2K_W: float
    glazing: float = Field(ge=0, le=1)
    GHI_W_m2: Optional[float] = None  # Auto-filled from solar service if omitted
    best_shelter_material: str  # Categorical — will be LabelEncoded


class IndoorTempResponse(BaseModel):
    """Predicted indoor temperature."""

    status: str
    indoor_temperature_C: float
