# pyrefly: ignore [missing-import]
from fastapi import APIRouter

try:
    from schemas.indoor_temp import IndoorTempRequest, IndoorTempResponse
except ImportError:
    from backend.schemas.indoor_temp import IndoorTempRequest, IndoorTempResponse

router = APIRouter(prefix="/indoor-temp", tags=["Indoor Temperature"])


@router.get("/")
def get_indoor_temp_info():
    """Stub endpoint for indoor temperature prediction router."""
    return {"message": "Indoor temperature prediction endpoint stub"}


@router.post("/predict", response_model=IndoorTempResponse)
def predict_indoor_temp(payload: IndoorTempRequest):
    """Stub prediction endpoint to be wired in Chapter 1."""
    return IndoorTempResponse(status="stub", indoor_temperature=None)
