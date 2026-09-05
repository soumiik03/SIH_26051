"""Pydantic schemas for the shelter design prediction endpoint.

Field names match the training dataset columns EXACTLY —
ladakh_all_season_shelter_dataset_2.csv
"""

from typing import Optional

from pydantic import BaseModel, Field


class DesignPredictionRequest(BaseModel):
    """Input features for shelter design classification."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    ambient_temp_c: Optional[float] = None
    wind_speed_ms: Optional[float] = Field(default=None, ge=0)
    wind_direction_deg: Optional[int] = Field(default=None, ge=0, le=360)
    ghi_kwh_m2_day: Optional[float] = Field(default=None, ge=0)
    warm_humidity_pct: Optional[float] = Field(default=None, ge=0, le=100)
    hot_air_index: Optional[str] = None
    rain_last_7days_mm: Optional[float] = Field(default=None, ge=0)


class DesignPredictionResponse(BaseModel):
    """Predicted optimal shelter material and design configuration."""

    status: str
    shelter_material_and_design: str  # Raw JSON string from the dataset
    # Convenience fields parsed from the JSON string:
    material_class: Optional[int] = None
    wwr: Optional[float] = None
    wall_thickness_cm: Optional[int] = None
    glazing_ratio: Optional[float] = None
    insulation_r_value: Optional[float] = None
