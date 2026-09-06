try:
    from optimization_schemas import AnalysisRequest, Design
    from predictors import build_analysis
except ImportError:
    from backend.schemas import AnalysisRequest, Design
    from backend.optimization_schemas import AnalysisRequest, Design

GOLDEN_REQUESTS = {
    "Leh": AnalysisRequest(location="Leh", outdoor_temp_c=-6, solar_kwh_m2=5.4, occupants=4, design=Design(material="Concrete", insulation_mm=150, glazing="low_e", area_m2=85)),
    "Delhi": AnalysisRequest(location="Delhi", outdoor_temp_c=9, solar_kwh_m2=4.1, occupants=3, design=Design(material="Rammed_Earth", insulation_mm=85, glazing="double", area_m2=90)),
    "Bengaluru": AnalysisRequest(location="Bengaluru", outdoor_temp_c=18, solar_kwh_m2=5.0, occupants=3, design=Design(material="Mud_Brick", insulation_mm=50, glazing="double", area_m2=90)),
}

def golden(location: str) -> dict | None:
    match = next((key for key in GOLDEN_REQUESTS if key.lower() == location.lower()), None)
    return build_analysis(GOLDEN_REQUESTS[match]) if match else None
