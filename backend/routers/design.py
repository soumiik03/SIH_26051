# pyrefly: ignore [missing-import]
from fastapi import APIRouter

try:
    from schemas.design import DesignPredictionRequest, DesignPredictionResponse
except ImportError:
    from backend.schemas.design import DesignPredictionRequest, DesignPredictionResponse

router = APIRouter(prefix="/design", tags=["Design Prediction"])


@router.get("/")
def get_design_info():
    """Stub endpoint for shelter design prediction router."""
    return {"message": "Design prediction endpoint stub"}


@router.post("/predict", response_model=DesignPredictionResponse)
def predict_design(payload: DesignPredictionRequest):
    """Stub prediction endpoint to be wired in Chapter 1."""
    return DesignPredictionResponse(status="stub")
