"""Predictor pipeline connecting trained ML models with physics fallback."""

import logging
from math import pi, sin
import numpy as np
import pandas as pd

try:
    from catalog import GLAZING, MATERIALS, material_name, glazing_name
    from optimization_schemas import AnalysisRequest, Design
    from services import model_loader
    from services.envelope_physics import (
        calculate_envelope_heat_loss_w,
        calculate_shelter_areas,
        calculate_u_values,
    )
except ImportError:
    from backend.catalog import GLAZING, MATERIALS, material_name, glazing_name
    from backend.optimization_schemas import AnalysisRequest, Design
    from backend.services import model_loader
    from backend.services.envelope_physics import (
        calculate_envelope_heat_loss_w,
        calculate_shelter_areas,
        calculate_u_values,
    )

logger = logging.getLogger(__name__)

# Known cold-climate and reference coordinate mappings
COORDINATE_MAP = {
    "leh": (34.16, 77.58),
    "dras": (34.43, 75.76),
    "kargil": (34.55, 76.13),
    "delhi": (28.61, 77.20),
    "bengaluru": (12.97, 77.59),
}

# Mapping from catalog design materials to ML training classes
# indoor_temp classes:
# 0: High-thermal-mass adobe walls with deep window overhangs...
# 1: Rammed earth thermal mass with adjustable cross-ventilation flaps...
# 2: Stabilized Rammed Earth + Straw-Clay cavity insulation...
# 3: Sun-dried adobe bricks with 10cm straw-clay exterior jacket insulation...
# 4: Super-insulated Rammed Earth (straw/clay cavity) + unvented Trombe wall...
INDOOR_MATERIAL_INDEX = {
    "brick": 3,
    "aac": 2,
    "insulated_panel": 4,
}

# thermal_energy classes: ['Concrete', 'Mud_Brick', 'Rammed_Earth', 'Stone']
THERMAL_ENERGY_MATERIAL_NAME = {
    "brick": "Mud_Brick",
    "aac": "Rammed_Earth",
    "insulated_panel": "Concrete",
}

GLAZING_RATIO_MAP = {
    "single": 0.15,
    "double": 0.25,
    "low_e": 0.35,
}


def get_coords(location: str) -> tuple[float, float]:
    """Resolve latitude & longitude from location name or default to Leh."""
    loc_key = location.strip().lower()
    return COORDINATE_MAP.get(loc_key, (34.16, 77.58))


def envelope_u_value(design: Design) -> float:
    """Calculate envelope overall U-value including wall & added insulation."""
    base_u = MATERIALS.get(design.material, {}).get("u_value", 1.6)
    wall_r = 1.0 / max(0.01, base_u)
    # 0.035 W/m-K conductivity for high-efficiency insulation
    insulation_r = (design.insulation_mm / 1000.0) / 0.035
    return 1.0 / (wall_r + insulation_r)


def estimate_install_cost(design: Design) -> float:
    """Estimate total shelter envelope installation cost in INR."""
    window_area = design.area_m2 * 0.18
    opaque_area = max(10.0, design.area_m2 * 2.3 - window_area)
    mat_cost = MATERIALS.get(design.material, {}).get("cost_per_m3_inr", 3000.0)
    glaze_cost = GLAZING.get(design.glazing, {}).get("cost_per_m2_inr", 4300.0)
    wall_volume_m3 = opaque_area * 0.30
    insulation_cost = design.area_m2 * design.insulation_mm * 18.0
    return round(
        wall_volume_m3 * mat_cost + window_area * glaze_cost + insulation_cost,
        2,
    )


def predict_indoor_temperature(
    request: AnalysisRequest, design: Design | None = None
) -> list[dict]:
    """Predict 24-hour indoor temperature profile using trained XGBoost or physics fallback."""
    selected = design or request.design
    lat, lon = get_coords(request.location)

    # Attempt trained ML model inference first
    try:
        model = model_loader.get_model("indoor_temp")
        scaler = model_loader.get_scaler("indoor_temp")
        features = model_loader.get_features("indoor_temp")

        if model is not None and scaler is not None and features:
            u = envelope_u_value(selected)
            r_val = 1.0 / max(0.01, u)
            mat_idx = INDOOR_MATERIAL_INDEX.get(selected.material, 3)
            glaze_val = GLAZING_RATIO_MAP.get(selected.glazing, 0.25)
            # Higher thermal mass for solid brick / earth
            t_mass = 2.4 if selected.material == "brick" else 1.8

            rows = []
            outdoor_temps = []
            for hour in range(24):
                outdoor = request.outdoor_temp_c + 4.0 * sin((hour - 8) * pi / 12)
                outdoor_temps.append(outdoor)
                solar_ghi = max(0.0, sin((hour - 6) * pi / 12)) * (
                    request.solar_kwh_m2 * 1000.0 / 6.0
                )
                rows.append(
                    {
                        "latitude": lat,
                        "longitude": lon,
                        "month": 1,
                        "hour": hour,
                        "outdoor_temperature_C": outdoor,
                        "wind_speed_mps": 3.0,
                        "thermal_mass_MJ_m3K": t_mass,
                        "insulation_r_value_m2K_W": r_val,
                        "glazing": glaze_val,
                        "GHI_W_m2": solar_ghi,
                        "best_shelter_material": mat_idx,
                    }
                )

            batch_df = pd.DataFrame(rows, columns=features)
            batch_df["outdoor_temperature_C"] = scaler.transform(
                batch_df[["outdoor_temperature_C"]]
            )
            raw_predictions = model.predict(batch_df)

            result = []
            for hour in range(24):
                indoor = float(raw_predictions[hour])
                # Thermal comfort adjustments for occupant metabolic heat
                occupant_gain = request.occupants * 0.2
                adjusted_indoor = round(indoor + occupant_gain, 1)
                result.append(
                    {
                        "hour": hour,
                        "outdoor": round(outdoor_temps[hour], 1),
                        "indoor": adjusted_indoor,
                    }
                )
            return result
    except Exception as exc:
        logger.warning(
            "ML inference for indoor temp failed, falling back to calibrated physics: %s",
            exc,
        )

    # Calibrated Physics Fallback
    u = envelope_u_value(selected)
    glazing_u = GLAZING.get(selected.glazing, {}).get("u_value", 2.8)
    glazing_penalty = glazing_u * 0.08
    retention = max(0.18, min(0.85, 0.75 - u * 0.16 - glazing_penalty * 0.035))
    internal_gain = request.occupants * 0.25 + request.solar_kwh_m2 * 0.12

    result = []
    for hour in range(24):
        outdoor = request.outdoor_temp_c + 4.0 * sin((hour - 8) * pi / 12)
        solar_gain = (
            max(0.0, sin((hour - 6) * pi / 12)) * request.solar_kwh_m2 * 0.60
        )
        indoor = (
            outdoor
            + (request.target_temp_c - outdoor) * retention
            + internal_gain
            + solar_gain
        )
        result.append(
            {
                "hour": hour,
                "outdoor": round(outdoor, 1),
                "indoor": round(indoor, 1),
            }
        )
    return result


def predict_daily_heating_kwh(
    request: AnalysisRequest, design: Design | None = None
) -> float:
    """Predict daily heating demand using the shared four-part envelope model."""
    selected = design or request.design
    material_key = {"brick": "mud_brick", "aac": "rammed_earth", "insulated_panel": "concrete"}[selected.material]
    insulation_r = selected.insulation_mm / 1000.0 / 0.035
    u_values = calculate_u_values(material_key, 30.0, insulation_r)
    areas = calculate_shelter_areas(selected.area_m2 * 2.8, GLAZING_RATIO_MAP[selected.glazing])

    total_wh = 0.0
    for hour in range(24):
        ambient = request.outdoor_temp_c + 4.0 * sin((hour - 8) * pi / 12)
        loss = calculate_envelope_heat_loss_w(
            u_values, areas["wall"], areas["glazing"], areas["roof"], areas["floor"],
            request.target_temp_c, ambient,
        )
        total_wh += loss["total"]
    return round(total_wh / 1000.0, 2)


def build_analysis(
    request: AnalysisRequest, design: Design | None = None
) -> dict:
    """Build a complete thermal analysis breakdown for a given shelter design."""
    selected = design or request.design
    hourly = predict_indoor_temperature(request, selected)
    heating = predict_daily_heating_kwh(request, selected)
    return {
        "location": request.location,
        "inputs": request.model_dump(mode="json"),
        "design": selected.model_dump(),
        "indoor_temperature_24h": hourly,
        "thermal_energy": {
            "daily_heating_kwh": heating,
            "annual_heating_kwh": round(heating * 120, 0),
        },
        "comfort": {
            "minimum_indoor_c": min(x["indoor"] for x in hourly),
            "hours_below_target": sum(
                x["indoor"] < request.target_temp_c for x in hourly
            ),
        },
        "cost": {"estimated_install_cost": estimate_install_cost(selected)},
    }
