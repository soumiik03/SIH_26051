"""Indoor temperature prediction router.

Loads the XGBRegressor exported from indoor_temp_prediction.ipynb and runs
inference with the same preprocessing pipeline:
  1. Auto-fill GHI_W_m2 from solar service if not provided
  2. LabelEncode ``best_shelter_material``
  3. MinMaxScale ``outdoor_temperature_C``
  4. Predict ``indoor_temperature_C``
"""

from fastapi import APIRouter, HTTPException
import pandas as pd

try:
    from schemas.indoor_temp import IndoorTempRequest, IndoorTempResponse
    from services import model_loader, solar, climate
except ImportError:
    from backend.schemas.indoor_temp import (
        IndoorTempRequest,
        IndoorTempResponse,
    )
    from backend.services import model_loader, solar, climate

router = APIRouter(tags=["Indoor Temperature"])


@router.get("/indoor-temp")
@router.get("/indoor-temp/")
def get_indoor_temp_info():
    """Info endpoint for indoor temperature prediction."""
    return {"message": "Indoor temperature prediction — POST /indoor-temp/predict"}


@router.post("/indoor-temp/predict", response_model=IndoorTempResponse)
@router.post("/predict/indoor-temp", response_model=IndoorTempResponse)
def predict_indoor_temp(payload: IndoorTempRequest):
    """Predict indoor temperature given building + climate parameters."""

    model = model_loader.get_model("indoor_temp")
    scaler = model_loader.get_scaler("indoor_temp")
    le = model_loader.get_label_encoder("indoor_temp", "le_file")
    features = model_loader.get_features("indoor_temp")

    if not all([model, scaler, le]):
        raise HTTPException(
            status_code=503, detail="Indoor temp model not loaded"
        )

    # --- Auto-fill GHI if not provided ---
    ghi = payload.GHI_W_m2
    climate_data = None
    if ghi is None or payload.outdoor_temperature_C is None or payload.wind_speed_mps is None:
        try:
            climate_data = climate.get_climate(payload.latitude, payload.longitude)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    if ghi is None:
        ghi = solar.get_ghi_for_hour(
            payload.latitude, payload.longitude, payload.month, payload.hour
        )
    outdoor_temperature = payload.outdoor_temperature_C if payload.outdoor_temperature_C is not None else climate_data.ambient_temp_c
    wind_speed = payload.wind_speed_mps if payload.wind_speed_mps is not None else climate_data.wind_speed_ms

    # --- Encode best_shelter_material ---
    try:
        material_encoded = le.transform([payload.best_shelter_material])[0]
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown best_shelter_material: '{payload.best_shelter_material}'. "
                f"Valid values: {list(le.classes_)}"
            ),
        )

    # --- Build feature DataFrame in exact column order from metadata ---
    input_data = pd.DataFrame(
        [
            {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "month": payload.month,
                "hour": payload.hour,
                "outdoor_temperature_C": outdoor_temperature,
                "wind_speed_mps": wind_speed,
                "thermal_mass_MJ_m3K": payload.thermal_mass_MJ_m3K,
                "insulation_r_value_m2K_W": payload.insulation_r_value_m2K_W,
                "glazing": payload.glazing,
                "GHI_W_m2": ghi,
                "best_shelter_material": material_encoded,
            }
        ],
        columns=features,
    )

    # --- Scale outdoor_temperature_C ---
    input_data["outdoor_temperature_C"] = scaler.transform(
        input_data[["outdoor_temperature_C"]]
    )

    # --- Predict ---
    prediction = float(model.predict(input_data)[0])

    return IndoorTempResponse(
        status="ok",
        indoor_temperature_C=round(prediction, 2),
    )
