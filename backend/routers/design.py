"""Design prediction router — shelter material & design recommendation.

Loads the XGBClassifier exported from design_PREDICTION_.ipynb and runs
inference with the same preprocessing pipeline:
  1. LabelEncode ``hot_air_index``
  2. MinMaxScale ``ambient_temp_c``
  3. Predict → inverse-transform to design JSON string
"""

import json as json_lib

from fastapi import APIRouter, HTTPException
import pandas as pd

try:
    from schemas.design import DesignPredictionRequest, DesignPredictionResponse
    from services import model_loader, climate
except ImportError:
    from backend.schemas.design import (
        DesignPredictionRequest,
        DesignPredictionResponse,
    )
    from backend.services import model_loader, climate

router = APIRouter(tags=["Design Prediction"])


@router.get("/design")
@router.get("/design/")
def get_design_info():
    """Info endpoint for shelter design prediction."""
    return {"message": "Design prediction endpoint — POST /design/predict"}


@router.post("/design/predict", response_model=DesignPredictionResponse)
@router.post("/predict/design", response_model=DesignPredictionResponse)
def predict_design(payload: DesignPredictionRequest):
    """Predict optimal shelter material and design for given climate/location."""

    model = model_loader.get_model("design")
    scaler = model_loader.get_scaler("design")
    le_hot_air = model_loader.get_label_encoder("design", "le_hot_air_file")
    le_target = model_loader.get_label_encoder("design", "le_target_file")
    features = model_loader.get_features("design")

    if not all([model, scaler, le_hot_air, le_target]):
        raise HTTPException(status_code=503, detail="Design model not loaded")

    climate_data = None
    if any(value is None for value in (payload.ambient_temp_c, payload.wind_speed_ms, payload.ghi_kwh_m2_day, payload.warm_humidity_pct, payload.rain_last_7days_mm)):
        try:
            climate_data = climate.get_climate(payload.latitude, payload.longitude)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    ambient = payload.ambient_temp_c if payload.ambient_temp_c is not None else climate_data.ambient_temp_c
    wind_speed = payload.wind_speed_ms if payload.wind_speed_ms is not None else climate_data.wind_speed_ms
    ghi = payload.ghi_kwh_m2_day if payload.ghi_kwh_m2_day is not None else climate_data.ghi_kwh_m2_day
    humidity = payload.warm_humidity_pct if payload.warm_humidity_pct is not None else climate_data.humidity_pct
    rain = payload.rain_last_7days_mm if payload.rain_last_7days_mm is not None else climate_data.rain_last_7days_mm
    hot_air = payload.hot_air_index or ("Extreme Freeze" if ambient <= -15 else "Very Low" if ambient <= 0 else "Low" if ambient <= 10 else "Moderate")

    # --- Encode hot_air_index ---
    try:
        hot_air_encoded = le_hot_air.transform([hot_air])[0]
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown hot_air_index: '{hot_air}'. "
                f"Valid values: {list(le_hot_air.classes_)}"
            ),
        )

    # --- Build feature DataFrame in exact column order from metadata ---
    input_data = pd.DataFrame(
        [
            {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "ambient_temp_c": ambient,
                "wind_speed_ms": wind_speed,
                "wind_direction_deg": payload.wind_direction_deg if payload.wind_direction_deg is not None else 180,
                "ghi_kwh_m2_day": ghi,
                "warm_humidity_pct": humidity,
                "hot_air_index": hot_air_encoded,
                "rain_last_7days_mm": rain,
            }
        ],
        columns=features,
    )

    # --- Scale ambient_temp_c (same scaler fitted during training) ---
    input_data["ambient_temp_c"] = scaler.transform(
        input_data[["ambient_temp_c"]]
    )

    # --- Predict ---
    prediction = model.predict(input_data)[0]

    # --- Inverse-transform to the original design string ---
    design_str = le_target.inverse_transform([int(prediction)])[0]

    # --- Parse the JSON design string for convenience fields ---
    parsed: dict = {}
    try:
        parsed = json_lib.loads(design_str)
    except (json_lib.JSONDecodeError, TypeError):
        pass

    return DesignPredictionResponse(
        status="ok",
        shelter_material_and_design=design_str,
        material_class=parsed.get("material_class"),
        wwr=parsed.get("wwr"),
        wall_thickness_cm=parsed.get("wall_thickness_cm"),
        glazing_ratio=parsed.get("glazing_ratio"),
        insulation_r_value=parsed.get("insulation_r_value"),
    )
