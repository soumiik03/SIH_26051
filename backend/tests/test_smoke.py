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
