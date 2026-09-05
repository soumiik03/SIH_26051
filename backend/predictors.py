"""One place to connect existing fitted indoor-temperature and energy models."""
from math import sin, pi
try:
    from catalog import MATERIALS, GLAZING
    from optimization_schemas import AnalysisRequest, Design
except ImportError:
    from backend.catalog import MATERIALS, GLAZING
    from backend.optimization_schemas import AnalysisRequest, Design 


def envelope_u_value(design: Design) -> float:
    # Series resistance: wall + added insulation. This is the safe demo fallback.
    wall_r = 1 / MATERIALS[design.material]["u_value"]
    insulation_r = (design.insulation_mm / 1000) / 0.035
    return 1 / (wall_r + insulation_r)

def estimate_install_cost(design: Design) -> float:
    window_area = design.area_m2 * 0.18
    opaque_area = design.area_m2 * 2.3 - window_area
    return round(opaque_area * MATERIALS[design.material]["cost_per_m2"] + window_area * GLAZING[design.glazing]["cost_per_m2"] + design.area_m2 * design.insulation_mm * 0.045, 2)

def predict_indoor_temperature(request: AnalysisRequest, design: Design | None = None) -> list[dict]:
    design = design or request.design
    # TODO: replace this body with your indoor model's feature pipeline + model.predict.
    # Keep the return shape: [{"hour": 0..23, "outdoor": n, "indoor": n}].
    u = envelope_u_value(design)
    glazing_penalty = GLAZING[design.glazing]["u_value"] * 0.08
    retention = max(0.18, min(0.84, 0.72 - u * 0.17 - glazing_penalty * 0.035))
    internal_gain = request.occupants * 0.25 + request.solar_kwh_m2 * 0.13
    result = []
    for hour in range(24):
        outdoor = request.outdoor_temp_c + 4 * sin((hour - 8) * pi / 12)
        solar_gain = max(0, sin((hour - 6) * pi / 12)) * request.solar_kwh_m2 * 0.62
        indoor = outdoor + (request.target_temp_c - outdoor) * retention + internal_gain + solar_gain
        result.append({"hour": hour, "outdoor": round(outdoor, 1), "indoor": round(indoor, 1)})
    return result

def predict_daily_heating_kwh(request: AnalysisRequest, design: Design | None = None) -> float:
    design = design or request.design
    # TODO: replace this calculation with thermal-energy model.predict(feature_frame)[0].
    temperatures = predict_indoor_temperature(request, design)
    deficit_degree_hours = sum(max(0, request.target_temp_c - p["indoor"]) for p in temperatures)
    heat_loss_factor = envelope_u_value(design) * design.area_m2 * 0.018 + GLAZING[design.glazing]["u_value"] * design.area_m2 * 0.002
    return round(deficit_degree_hours * heat_loss_factor, 2)

def build_analysis(request: AnalysisRequest, design: Design | None = None) -> dict:
    selected = design or request.design
    hourly = predict_indoor_temperature(request, selected)
    heating = predict_daily_heating_kwh(request, selected)
    return {
        "location": request.location,
        "inputs": request.model_dump(mode="json"),
        "design": selected.model_dump(),
        "indoor_temperature_24h": hourly,
        "thermal_energy": {"daily_heating_kwh": heating, "annual_heating_kwh": round(heating * 120, 0)},
        "comfort": {"minimum_indoor_c": min(x["indoor"] for x in hourly), "hours_below_target": sum(x["indoor"] < request.target_temp_c for x in hourly)},
        "cost": {"estimated_install_cost": estimate_install_cost(selected)},
    }
