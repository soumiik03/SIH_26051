from pydantic import BaseModel, Field
from typing import Literal

class Design(BaseModel):
    material: Literal["brick", "aac", "insulated_panel"] = "brick"
    insulation_mm: float = Field(default=50, ge=0, le=250)
    glazing: Literal["single", "double", "low_e"] = "double"
    area_m2: float = Field(default=90, ge=20, le=1000)

class AnalysisRequest(BaseModel):
    location: str = Field(min_length=2, max_length=60)
    outdoor_temp_c: float = Field(default=10, ge=-40, le=55)
    solar_kwh_m2: float = Field(default=4, ge=0, le=12)
    occupants: int = Field(default=3, ge=0, le=30)
    target_temp_c: float = Field(default=21, ge=15, le=30)
    design: Design = Design()

class OptimizationRequest(AnalysisRequest):
    population_size: int = Field(default=64, ge=20, le=150)
    generations: int = Field(default=50, ge=10, le=150)
