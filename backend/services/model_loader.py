"""
Model loader — loads trained .joblib artifacts once at app startup.

Call ``load_all()`` from the FastAPI startup event.  After that, use the
accessor functions (``get_model``, ``get_scaler``, etc.) from your
routers; they return the pre-loaded in-memory objects.
"""

import json
import logging
from pathlib import Path

import joblib

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# Module-level singletons — populated by load_all()
_artifacts: dict = {}
_metadata: dict | None = None


def load_all() -> None:
    """Load every model artifact listed in metadata.json.

    Raises ``FileNotFoundError`` if metadata.json is missing (meaning the
    export script hasn't been run yet).
    """
    global _metadata
    _artifacts.clear()

    metadata_path = MODELS_DIR / "metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(
            f"metadata.json not found at {metadata_path}. "
            "Run  python scripts/export_models.py  first."
        )

    with open(metadata_path) as fh:
        _metadata = json.load(fh)

    for model_name, info in _metadata.items():
        logger.info("Loading model group: %s", model_name)
        _artifacts[model_name] = {}

        for key, value in info.items():
            if not key.endswith("_file"):
                continue
            if not value:
                continue

            artifact_path = MODELS_DIR / value
            if artifact_path.exists():
                _artifacts[model_name][key] = joblib.load(artifact_path)
                logger.info("  ✓ %s → %s", key, value)
            else:
                logger.warning("  ✗ missing artifact: %s", value)

    logger.info("All model artifacts loaded.")


# ── Accessors ────────────────────────────────────────────────────────


def get_model(name: str):
    """Return the trained model object (e.g. XGBClassifier / XGBRegressor)."""
    return _artifacts.get(name, {}).get("model_file")


def get_scaler(name: str):
    """Return the MinMaxScaler fitted during training."""
    return _artifacts.get(name, {}).get("scaler_file")


def get_label_encoder(name: str, key: str = "le_file"):
    """Return a LabelEncoder.  Use *key* to pick a specific one
    (e.g. ``"le_hot_air_file"`` vs ``"le_target_file"`` for the design model).
    """
    return _artifacts.get(name, {}).get(key)


def get_metadata(name: str | None = None) -> dict:
    """Return raw metadata dict (or a sub-dict for *name*)."""
    if _metadata is None:
        return {}
    if name:
        return _metadata.get(name, {})
    return _metadata


def get_features(name: str) -> list[str]:
    """Return the ordered list of feature column names for *name*."""
    return get_metadata(name).get("features", [])


def is_ready() -> bool:
    """Return whether all prediction model groups are loaded."""
    required = {
        "design": {"model_file", "scaler_file", "le_hot_air_file", "le_target_file"},
        "indoor_temp": {"model_file", "scaler_file", "le_file"},
        "thermal_energy": {"model_file", "scaler_file", "le_file"},
    }
    return all(required[name].issubset(_artifacts.get(name, {})) for name in required)
