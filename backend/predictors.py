"""Predictor pipeline connecting trained ML models with physics fallback."""

import logging
from math import pi, sin
import numpy as np
import pandas as pd

try:
    from catalog import GLAZING, MATERIALS, material_name, glazing_name
    from optimization_schemas import AnalysisRequest, Design
    from services import model_loader
except ImportError:
    from backend.catalog import GLAZING, MATERIALS, material_name, glazing_name
    from backend.optimization_schemas import AnalysisRequest, Design
    from backend.services import model_loader

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
    """Estimate total shelter envelope installation cost in USD / standardized units."""
    window_area = design.area_m2 * 0.18
    opaque_area = max(10.0, design.area_m2 * 2.3 - window_area)
    mat_cost = MATERIALS.get(design.material, {}).get("cost_per_m2", 33.0)
    glaze_cost = GLAZING.get(design.glazing, {}).get("cost_per_m2", 52.0)
    insulation_cost = design.area_m2 * design.insulation_mm * 0.045
    return round(
        opaque_area * mat_cost + window_area * glaze_cost + insulation_cost,
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
    """Predict total daily heating demand in kWh using ML model or degree-hour deficit."""
    selected = design or request.design
    lat, lon = get_coords(request.location)

    # Attempt trained ML model inference first
    try:
        model = model_loader.get_model("thermal_energy")
        scaler = model_loader.get_scaler("thermal_energy")
        le = model_loader.get_label_encoder("thermal_energy", "le_file")
        features = model_loader.get_features("thermal_energy")

        if model is not None and scaler is not None and le is not None and features:
            wall_mat_str = THERMAL_ENERGY_MATERIAL_NAME.get(
                selected.material, "Mud_Brick"
            )
            mat_encoded = le.transform([wall_mat_str])[0]
            vol_m3 = selected.area_m2 * 2.8
            wall_th_cm = 45.0
            r_val = 1.0 / max(0.01, envelope_u_value(selected))
            glaze_ratio = GLAZING_RATIO_MAP.get(selected.glazing, 0.25)
            thermal_mass_val = vol_m3 * wall_th_cm * 12.0

            rows = []
            for hour in range(24):
                ambient = request.outdoor_temp_c + 4.0 * sin(
                    (hour - 8) * pi / 12
                )
                ghi_val = max(0.0, sin((hour - 6) * pi / 12)) * (
                    request.solar_kwh_m2 * 1000.0 / 6.0
                )
                rows.append(
                    {
                        "latitude": lat,
                        "longitude": lon,
                        "hour": hour,
                        "shelter_volume_m3": vol_m3,
                        "wall_material": mat_encoded,
                        "wall_thickness_cm": wall_th_cm,
                        "glazing_ratio": glaze_ratio,
                        "insulation_r_value": r_val,
                        "ghi_w_m2": ghi_val,
                        "ambient_temp_c": ambient,
                        "thermal_mass_kj_k": thermal_mass_val,
                    }
                )

            batch_df = pd.DataFrame(rows, columns=features)
            batch_df["ambient_temp_c"] = scaler.transform(
                batch_df[["ambient_temp_c"]]
            )
            raw_kwh = model.predict(batch_df)
            total_kwh = float(np.sum(np.clip(raw_kwh, 0.0, None)))
            # Scale appropriately for shelter area and occupant gains
            occupant_offset = request.occupants * 1.5
            return round(max(0.0, total_kwh - occupant_offset), 2)
    except Exception as exc:
        logger.warning(
            "ML inference for thermal energy failed, falling back to calibrated deficit: %s",
            exc,
        )

    # Calibrated Degree-Hour Deficit Fallback
    temperatures = predict_indoor_temperature(request, selected)
    deficit_degree_hours = sum(
        max(0.0, request.target_temp_c - p["indoor"]) for p in temperatures
    )
    glaze_u = GLAZING.get(selected.glazing, {}).get("u_value", 2.8)
    heat_loss_factor = (
        envelope_u_value(selected) * selected.area_m2 * 0.018
        + glaze_u * selected.area_m2 * 0.002
    )
    return round(deficit_degree_hours * heat_loss_factor, 2)


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
