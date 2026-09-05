from pydantic import BaseModel
from typing import Optional


class IndoorTempRequest(BaseModel):
    """Placeholder schema for indoor temperature prediction input."""
    pass


class IndoorTempResponse(BaseModel):
    """Placeholder schema for indoor temperature prediction output."""
    status: str = "stub"
    indoor_temperature: Optional[float] = None
