"""Smoke tests for all 3 prediction endpoints.

Calls each POST /predict endpoint with one realistic Ladakh-region sample
and asserts HTTP 200 + sane output ranges.

Run:
    cd SIH_26051 && .venv/Scripts/python -m pytest backend/tests/test_smoke.py -v -s
"""

import json
import sys
from pathlib import Path

# Ensure backend dir is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from main import app

# Load metadata so we can use valid class values in test payloads
MODELS_DIR = BACKEND_DIR / "models"
_metadata = {}
_metadata_path = MODELS_DIR / "metadata.json"
if _metadata_path.exists():
    with open(_metadata_path) as f:
        _metadata = json.load(f)


def _get_valid_hot_air_index() -> str:
    """Return a valid hot_air_index class from metadata, or a fallback."""
    classes = _metadata.get("design", {}).get("hot_air_index_classes", [])
    return classes[0] if classes else "Low"


def _get_valid_shelter_material() -> str:
    """Return a valid best_shelter_material class from metadata."""
    classes = _metadata.get("indoor_temp", {}).get("material_classes", [])
    return classes[0] if classes else "Stone"


def _get_valid_wall_material() -> str:
    """Return a valid wall_material class from metadata."""
    classes = _metadata.get("thermal_energy", {}).get("material_classes", [])
    return classes[0] if classes else "Stone"


@pytest.fixture(scope="module")
def client():
    """TestClient as a context manager so the lifespan event fires."""
    with TestClient(app) as c:
        yield c


# ── Tests ────────────────────────────────────────────────────────────


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_design_predict(client):
    """Realistic Ladakh sample: Leh in winter."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "ambient_temp_c": -5.0,
        "wind_speed_ms": 3.5,
        "wind_direction_deg": 220,
        "ghi_kwh_m2_day": 4.5,
        "warm_humidity_pct": 25.0,
        "hot_air_index": _get_valid_hot_air_index(),
        "rain_last_7days_mm": 0.0,
    }
    response = client.post("/predict/design", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"

    data = response.json()
    assert data["status"] == "ok"
    assert data["shelter_material_and_design"] is not None
    assert len(data["shelter_material_and_design"]) > 0

    print(f"\n{'='*50}")
    print(f"[Design] Input: {json.dumps(payload, indent=2)}")
    print(f"[Design] shelter_material_and_design: {data['shelter_material_and_design']}")
    print(
        f"[Design] Parsed: material_class={data.get('material_class')}, "
        f"wwr={data.get('wwr')}, wall_thickness_cm={data.get('wall_thickness_cm')}, "
        f"glazing_ratio={data.get('glazing_ratio')}, "
        f"insulation_r_value={data.get('insulation_r_value')}"
    )


def test_indoor_temp_predict(client):
    """Realistic Ladakh sample: Leh, January, noon."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "month": 1,
        "hour": 12,
        "outdoor_temperature_C": -10.0,
        "wind_speed_mps": 2.5,
        "thermal_mass_MJ_m3K": 1.8,
        "insulation_r_value_m2K_W": 3.0,
        "glazing": 0.25,
        "GHI_W_m2": 450.0,
        "best_shelter_material": _get_valid_shelter_material(),
    }
    response = client.post("/predict/indoor-temp", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"

    data = response.json()
    assert data["status"] == "ok"
    temp = data["indoor_temperature_C"]
    assert -30.0 <= temp <= 40.0, f"Indoor temp {temp}°C out of sane range [-30, 40]"

    print(f"\n{'='*50}")
    print(f"[Indoor Temp] Input: {json.dumps(payload, indent=2)}")
    print(f"[Indoor Temp] indoor_temperature_C: {temp}")


def test_thermal_energy_predict(client):
    """Realistic Ladakh sample: Leh, stone shelter, 100m³."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "shelter_volume_m3": 100.0,
        "wall_material": _get_valid_wall_material(),
        "wall_thickness_cm": 30.0,
        "glazing_ratio": 0.25,
        "insulation_r_value": 3.0,
        "ghi_w_m2": 450.0,
        "ambient_temp_c": -5.0,
    }
    response = client.post("/predict/thermal-energy", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"

    data = response.json()
    assert data["status"] == "ok"
    energy = data["thermal_energy_kwh"]
    assert energy >= 0, f"Thermal energy {energy} kWh is negative"

    print(f"\n{'='*50}")
    print(f"[Thermal Energy] Input: {json.dumps(payload, indent=2)}")
    print(f"[Thermal Energy] thermal_energy_kwh: {energy}")


def test_indoor_temp_climate_autofill(client):
    """Verify that omitting climate parameters uses the climate service without NameError."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "month": 1,
        "hour": 12,
        "outdoor_temperature_C": None,
        "wind_speed_mps": None,
        "thermal_mass_MJ_m3K": 1.8,
        "insulation_r_value_m2K_W": 3.0,
        "glazing": 0.25,
        "GHI_W_m2": None,
        "best_shelter_material": _get_valid_shelter_material(),
    }
    response = client.post("/predict/indoor-temp", json=payload)
    assert response.status_code == 200, f"Autofill failed: {response.text}"
    data = response.json()
    assert data["status"] == "ok"
    assert "indoor_temperature_C" in data


def test_thermal_energy_climate_autofill(client):
    """Verify that omitting ambient temp and GHI uses climate service without NameError."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "shelter_volume_m3": 100.0,
        "wall_material": _get_valid_wall_material(),
        "wall_thickness_cm": 30.0,
        "glazing_ratio": 0.25,
        "insulation_r_value": 3.0,
        "ghi_w_m2": None,
        "ambient_temp_c": None,
    }
    response = client.post("/predict/thermal-energy", json=payload)
    assert response.status_code == 200, f"Autofill failed: {response.text}"
    data = response.json()
    assert data["status"] == "ok"
    assert "thermal_energy_kwh" in data


def test_climate_endpoint(client):
    """Verify /climate endpoint returns climate parameters for Ladakh coordinates."""
    response = client.get("/climate?latitude=34.16&longitude=77.58")
    assert response.status_code == 200
    data = response.json()
    assert "ambient_temp_c" in data
    assert "wind_speed_ms" in data
    assert "ghi_kwh_m2_day" in data
    assert "humidity_pct" in data


def test_optimization_run(client):
    """Verify NSGA-II / Pareto optimization endpoint returns Pareto-optimal points."""
    payload = {
        "location": "Leh",
        "outdoor_temp_c": -6.0,
        "solar_kwh_m2": 5.4,
        "occupants": 4,
        "target_temp_c": 21.0,
        "design": {
            "material": "insulated_panel",
            "insulation_mm": 100.0,
            "glazing": "double",
            "area_m2": 90.0,
        },
        "population_size": 20,
        "generations": 10,
    }
    response = client.post("/optimization/run", json=payload)
    assert response.status_code == 200, f"Optimization run failed: {response.text}"
    data = response.json()
    assert data["status"] == "ok"
    assert "baseline" in data
    assert "pareto_front" in data
    assert len(data["pareto_front"]) > 0


def test_optimization_dashboard(client):
    """Verify unified /optimization/dashboard endpoint."""
    payload = {
        "location": "Leh",
        "outdoor_temp_c": -6.0,
        "solar_kwh_m2": 5.4,
        "occupants": 4,
        "target_temp_c": 21.0,
        "design": {
            "material": "insulated_panel",
            "insulation_mm": 100.0,
            "glazing": "double",
            "area_m2": 90.0,
        },
        "population_size": 20,
        "generations": 10,
    }
    response = client.post("/optimization/dashboard", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "baseline" in data
    assert "pareto_front" in data
    assert "indoor_temperature_24h" in data["baseline"]
    assert len(data["baseline"]["indoor_temperature_24h"]) == 24


def test_golden_case(client):
    """Verify /optimization/golden/Leh endpoint."""
    response = client.get("/optimization/golden/Leh")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "fallback"
    assert data["result"]["location"] == "Leh"


def test_heat_flow_predict(client):
    """Verify /predict/heat-flow calculates 24h envelope heat flow and geometry."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "month": 1,
        "day": 15,
        "volume_m3": 100.0,
        "wall_material": "Stone",
        "wall_thickness_cm": 30.0,
        "insulation_r_value": 3.0,
        "glazing_ratio": 0.25,
        "occupancy": 4,
        "heater_power_kw": 0.0,
    }
    response = client.post("/predict/heat-flow", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    assert data["status"] == "ok"
    assert data["indoor_temp_source"] in ["ml_model", "physics_fallback"]
    assert "geometry" in data
    assert "hourly_data" in data
    assert "summary" in data

    # Check U-values include walls, glazing, roof, floor
    u_vals = data["u_values"]
    assert u_vals["u_wall"] > 0
    assert u_vals["u_glazing"] > 0
    assert u_vals["u_roof"] > 0
    assert u_vals["u_floor"] > 0

    # Check geometry consistency
    geom = data["geometry"]
    assert geom["volume_m3"] == 100.0
    assert geom["width_m"] > 3.0
    assert geom["length_m"] > geom["width_m"]
    assert geom["wall_height_m"] == 2.6
    assert geom["wall_area_net_m2"] > 0
    assert geom["glazing_area_m2"] > 0
    assert geom["roof_area_m2"] > 0
    assert geom["floor_area_m2"] > 0

    # Check 24 hours of points
    hourly = data["hourly_data"]
    assert len(hourly) == 24
    for pt in hourly:
        assert 0 <= pt["hour"] <= 23
        assert -90.0 <= pt["sun_elevation_deg"] <= 90.0
        assert 0.0 <= pt["sun_azimuth_deg"] <= 360.0
        assert pt["q_total_w"] >= 0
        assert pt["q_roof_w"] >= 0
        assert pt["q_floor_w"] >= 0
        # Total heat loss must equal sum of wall, glazing, roof, floor
        expected_q = round(pt["q_walls_w"] + pt["q_glazing_w"] + pt["q_roof_w"] + pt["q_floor_w"], 1)
        assert abs(pt["q_total_w"] - expected_q) < 0.2
        assert pt["heat_flow_direction"] in ["loss", "gain"]

    # Confirm roof loss is non-trivial and a primary loss path
    assert hourly[0]["q_roof_w"] > 100.0

    summary = data["summary"]
    assert summary["peak_heat_loss_w"] > 0
    assert summary["total_heat_loss_kwh"] > 0
    print(f"\n{'='*50}")
    print(f"[Heat Flow] Indoor temp source: {data['indoor_temp_source']}")
    print(f"[Heat Flow] Peak loss: {summary['peak_heat_loss_w']} W at hour {summary['peak_heat_loss_hour']}")
    print(f"[Heat Flow] 24h Total loss: {summary['total_heat_loss_kwh']} kWh")
    print(f"[Heat Flow] Avg indoor: {summary['average_indoor_temp_c']}°C, Avg outdoor: {summary['average_ambient_temp_c']}°C")


def test_heat_flow_physics_direction(client):
    """Verify that increasing insulation strictly decreases heat loss."""
    base_payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "month": 1,
        "day": 15,
        "volume_m3": 100.0,
        "wall_material": "Stone",
        "wall_thickness_cm": 30.0,
        "glazing_ratio": 0.25,
        "occupancy": 4,
        "ambient_temp_c": -10.0,
    }

    low_ins_payload = {**base_payload, "insulation_r_value": 0.5}
    high_ins_payload = {**base_payload, "insulation_r_value": 5.0}

    res_low = client.post("/predict/heat-flow", json=low_ins_payload).json()
    res_high = client.post("/predict/heat-flow", json=high_ins_payload).json()

    # Low insulation should have higher U-value and higher total heat loss
    assert res_low["u_values"]["u_wall"] > res_high["u_values"]["u_wall"]
    # Total heat loss in kWh should be lower with high insulation
    assert res_high["summary"]["total_heat_loss_kwh"] < res_low["summary"]["total_heat_loss_kwh"]


def test_heat_flow_solar_tracking(client):
    """Verify real solar position angles at midnight and midday for Leh."""
    payload = {
        "latitude": 34.16,
        "longitude": 77.58,
        "month": 1,
        "day": 15,
        "volume_m3": 100.0,
    }
    response = client.post("/predict/heat-flow", json=payload)
    assert response.status_code == 200
    hourly = response.json()["hourly_data"]

    # Midnight (hour 0): sun must be below horizon
    h0 = hourly[0]
    assert h0["sun_elevation_deg"] < 0
    assert not h0["is_sun_up"]
    assert h0["ghi_w_m2"] == 0.0

    # Solar noon (hour 12/13): sun must be well above horizon, roughly south (~180°)
    h12 = hourly[12]
    assert h12["sun_elevation_deg"] > 25.0
    assert h12["is_sun_up"]
    assert h12["ghi_w_m2"] > 200.0
    assert 140.0 <= h12["sun_azimuth_deg"] <= 220.0
    print(f"\n[Solar Tracking] Hour 12: Elevation={h12['sun_elevation_deg']}°, Azimuth={h12['sun_azimuth_deg']}°, GHI={h12['ghi_w_m2']} W/m²")


