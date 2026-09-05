"""Thermal energy prediction router — heating demand estimation.

Loads the XGBRegressor exported from thermal_energy_model.ipynb and runs
inference with the same preprocessing pipeline:
  1. Auto-fill ``ghi_w_m2`` from solar service if not provided
  2. Auto-compute ``thermal_mass_kj_k`` from notebook formula if not provided
  3. LabelEncode ``wall_material``
  4. MinMaxScale ``ambient_temp_c``
  5. Predict ``thermal_energy_kwh``
"""

import numpy as np
from fastapi import APIRouter, HTTPException
import pandas as pd

try:
    from schemas.thermal_energy import (
        ThermalEnergyRequest,
        ThermalEnergyResponse,
    )
    from services import model_loader, solar, climate
except ImportError:
    from backend.schemas.thermal_energy import (
        ThermalEnergyRequest,
        ThermalEnergyResponse,
    )
    from backend.services import model_loader, solar, climate

router = APIRouter(tags=["Thermal Energy"])

# Material factors from thermal_energy_model.ipynb cell 14
MATERIAL_FACTORS = {
    "Concrete": 1.0,
    "Mud_Brick": 0.6,
    "Rammed_Earth": 0.8,
    "Stone": 1.2,
}


@router.get("/thermal-energy")
@router.get("/thermal-energy/")
def get_thermal_energy_info():
    """Info endpoint for thermal energy prediction."""
    return {
        "message": "Thermal energy prediction — POST /thermal-energy/predict"
    }


@router.post("/thermal-energy/predict", response_model=ThermalEnergyResponse)
@router.post("/predict/thermal-energy", response_model=ThermalEnergyResponse)
def predict_thermal_energy(payload: ThermalEnergyRequest):
    """Predict thermal energy demand given building + climate parameters."""

    model = model_loader.get_model("thermal_energy")
    scaler = model_loader.get_scaler("thermal_energy")
    le = model_loader.get_label_encoder("thermal_energy", "le_file")
    features = model_loader.get_features("thermal_energy")

    if not all([model, scaler, le]):
        raise HTTPException(
            status_code=503, detail="Thermal energy model not loaded"
        )

    # --- Auto-fill GHI if not provided ---
    ghi = payload.ghi_w_m2
    climate_data = None
    if ghi is None or payload.ambient_temp_c is None:
        try:
            climate_data = climate.get_climate(payload.latitude, payload.longitude)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    if ghi is None:
        ghi = solar.get_current_ghi(payload.latitude, payload.longitude)
    ambient_temp = payload.ambient_temp_c if payload.ambient_temp_c is not None else climate_data.ambient_temp_c

    # --- Auto-compute thermal_mass if not provided (notebook cell 14 formula) ---
    thermal_mass = payload.thermal_mass_kj_k
    if thermal_mass is None:
        material_factor = MATERIAL_FACTORS.get(payload.wall_material, 1.0)
        thermal_mass = (
            payload.shelter_volume_m3
            * payload.wall_thickness_cm
            * material_factor
            * 12
        ) + material_factor

    # --- Encode wall_material ---
    try:
        material_encoded = le.transform([payload.wall_material])[0]
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown wall_material: '{payload.wall_material}'. "
                f"Valid values: {list(le.classes_)}"
            ),
        )

    # --- Build feature DataFrame (hour → NaN if missing, matching notebook cell 14) ---
    input_data = pd.DataFrame(
        [
            {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "hour": payload.hour if payload.hour is not None else np.nan,
                "shelter_volume_m3": payload.shelter_volume_m3,
                "wall_material": material_encoded,
                "wall_thickness_cm": payload.wall_thickness_cm,
                "glazing_ratio": payload.glazing_ratio,
                "insulation_r_value": payload.insulation_r_value,
                "ghi_w_m2": ghi,
                "ambient_temp_c": ambient_temp,
                "thermal_mass_kj_k": thermal_mass,
            }
        ],
        columns=features,
    )

    # --- Scale ambient_temp_c ---
    input_data["ambient_temp_c"] = scaler.transform(
        input_data[["ambient_temp_c"]]
    )

    # --- Predict ---
    prediction = float(model.predict(input_data)[0])

    return ThermalEnergyResponse(
        status="ok",
        thermal_energy_kwh=round(prediction, 2),
    )
