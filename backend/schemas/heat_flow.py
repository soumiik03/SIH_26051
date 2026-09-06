"""Pydantic schemas for the building heat flow and 3D visualization endpoint."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HeatFlowRequest(BaseModel):
    """Input parameters for calculating 24-hour heat flow across building envelope."""

    latitude: float = Field(default=34.16, ge=-90, le=90, description="Latitude in decimal degrees (e.g. 34.16 for Leh)")
    longitude: float = Field(default=77.58, ge=-180, le=180, description="Longitude in decimal degrees (e.g. 77.58 for Leh)")
    elevation_m: Optional[float] = Field(default=None, description="Altitude in meters; auto-resolved via pvlib if omitted")
    month: int = Field(default=1, ge=1, le=12, description="Month of the year (1-12)")
    day: int = Field(default=15, ge=1, le=31, description="Day of the month (1-31)")
    volume_m3: float = Field(default=100.0, gt=0, description="Interior volume in m3 (e.g. 100-120)")
    wall_material: str = Field(default="Stone", description="Stone | Rammed_Earth | Mud_Brick | Concrete")
    wall_thickness_cm: float = Field(default=30.0, gt=0, description="Wall thickness in cm")
    insulation_r_value: float = Field(default=3.0, ge=0, description="Insulation R-value (m2·K/W)")
    glazing_ratio: float = Field(default=0.25, ge=0, le=1, description="Glazing ratio on South facade (0-1)")
    occupancy: int = Field(default=4, ge=0, description="Number of occupants generating metabolic heat")
    heater_power_kw: float = Field(default=0.0, ge=0, description="Active heating power in kW")
    ambient_temp_c: Optional[float] = Field(default=None, description="Daily average ambient temp in °C (defaults to climate service)")
    wind_speed_mps: Optional[float] = Field(default=None, ge=0, description="Average wind speed in m/s")


class ShelterGeometry(BaseModel):
    """Parametric geometry dimensions and surface areas matching 3D visual mesh 1-to-1."""

    volume_m3: float
    width_m: float
    length_m: float
    wall_height_m: float
    roof_height_m: float
    wall_area_gross_m2: float
    glazing_area_m2: float
    door_area_m2: float
    wall_area_net_m2: float
    roof_area_m2: float
    floor_area_m2: float


class EnvelopeUValues(BaseModel):
    """Thermal transmittance properties (W/(m2·K))."""

    u_wall: float
    u_glazing: float
    u_roof: float
    u_floor: float
    r_wall_total: float


class HourlyHeatFlowPoint(BaseModel):
    """Detailed solar, thermal, and heat flow state for an individual hour."""

    hour: int
    sun_elevation_deg: float
    sun_azimuth_deg: float
    is_sun_up: bool
    ghi_w_m2: float
    ambient_temp_c: float
    indoor_temp_c: float
    delta_t_k: float
    q_walls_w: float
    q_glazing_w: float
    q_roof_w: float
    q_floor_w: float
    q_total_w: float
    heat_flow_direction: str  # "loss" (inside -> outside) or "gain" (outside -> inside)


class HeatFlowSummary(BaseModel):
    """Aggregate statistics for the 24-hour cycle."""

    peak_heat_loss_w: float
    peak_heat_loss_hour: int
    min_heat_loss_w: float
    min_heat_loss_hour: int
    total_heat_loss_kwh: float
    total_solar_gain_kwh: float
    average_indoor_temp_c: float
    average_ambient_temp_c: float


class HeatFlowResponse(BaseModel):
    """Complete heat flow details for the defined 24-hour period."""

    status: str
    indoor_temp_source: str  # "ml_model" or "physics_fallback"
    location: Dict[str, Any]
    geometry: ShelterGeometry
    u_values: EnvelopeUValues
    hourly_data: List[HourlyHeatFlowPoint]
    summary: HeatFlowSummary
