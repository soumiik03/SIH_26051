from pydantic import BaseModel
from typing import Optional


class DesignPredictionRequest(BaseModel):
    """Placeholder schema for shelter design prediction input."""
    pass


class DesignPredictionResponse(BaseModel):
    """Placeholder schema for shelter design prediction output."""
    status: str = "stub"
    material: Optional[str] = None
    wwr: Optional[float] = None
    wall_thickness: Optional[float] = None
    glazing_ratio: Optional[float] = None
    r_value: Optional[float] = None
