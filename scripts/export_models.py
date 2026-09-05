"""
Export script: reproduces the exact training pipelines from the Jupyter notebooks
and saves model artifacts to backend/models/.

Run from project root:
    .venv/Scripts/python scripts/export_models.py
"""

import copy
import json
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, classification_report, r2_score
from xgboost import XGBClassifier, XGBRegressor
import joblib

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT  # CSVs are in project root
MODELS_DIR = PROJECT_ROOT / "backend" / "models"


def export_design_model():
    """Exact reproduction of design_PREDICTION_.ipynb cells 01-09.

    Notebook uses the same `le` variable for both hot_air_index and
    shelter_material_and_design (second fit_transform overwrites the first fit).
    We save TWO separate LabelEncoders so both can be used at inference time.
    """
    print("\n" + "=" * 60)
    print("EXPORTING: Design Prediction Model (XGBClassifier)")
    print("=" * 60)

    # --- Cell 02: Load data ---
    df = pd.read_csv(DATA_DIR / "ladakh_all_season_shelter_dataset_2.csv")
    print(f"Loaded dataset: {df.shape}")

    # --- Cell 05: Encoding ---
    le_hot_air = LabelEncoder()
    le_target = LabelEncoder()

    df["hot_air_index"] = le_hot_air.fit_transform(df["hot_air_index"])
    df["shelter_material_and_design"] = le_target.fit_transform(
        df["shelter_material_and_design"]
    )

    print(f"hot_air_index classes: {list(le_hot_air.classes_)}")
    print(f"target classes count: {len(le_target.classes_)}")

    # --- Cell 07: Train/test split ---
    X = df.drop(["shelter_material_and_design"], axis=1)
    y = df["shelter_material_and_design"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=45
    )

    # --- Cell 08: Scaling ---
    minmax_scale = MinMaxScaler()
    X_train["ambient_temp_c"] = minmax_scale.fit_transform(
        X_train[["ambient_temp_c"]]
    )
    X_test["ambient_temp_c"] = minmax_scale.transform(X_test[["ambient_temp_c"]])

    # --- Cell 09: Train model ---
    xgb_model = XGBClassifier()
    xgb_model.fit(X_train, y_train)
    y_pred = xgb_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))

    # --- Save artifacts ---
    joblib.dump(xgb_model, MODELS_DIR / "design_model.joblib")
    joblib.dump(minmax_scale, MODELS_DIR / "design_scaler.joblib")
    joblib.dump(le_hot_air, MODELS_DIR / "design_label_encoder_hot_air.joblib")
    joblib.dump(le_target, MODELS_DIR / "design_label_encoder_target.joblib")

    features = list(X.columns)
    print(f"Features ({len(features)}): {features}")

    return {
        "model_file": "design_model.joblib",
        "scaler_file": "design_scaler.joblib",
        "le_hot_air_file": "design_label_encoder_hot_air.joblib",
        "le_target_file": "design_label_encoder_target.joblib",
        "features": features,
        "target": "shelter_material_and_design",
        "target_classes": list(le_target.classes_),
        "hot_air_index_classes": list(le_hot_air.classes_),
        "accuracy": round(float(acc), 4),
        "model_type": "XGBClassifier",
        "scaled_feature": "ambient_temp_c",
        "encoded_feature": "hot_air_index",
    }


def export_indoor_temp_model():
    """Exact reproduction of indoor_temp_prediction.ipynb cells 01-11."""
    print("\n" + "=" * 60)
    print("EXPORTING: Indoor Temperature Model (XGBRegressor)")
    print("=" * 60)

    # --- Cell 02: Load data ---
    df = pd.read_csv(DATA_DIR / "ladakh_indoor_temperature_ml_dataset.csv")
    print(f"Loaded dataset: {df.shape}")

    # --- Cell 04: Drop unused columns ---
    df = df.drop(["location_id", "date", "season"], axis=1)

    # --- Cell 06: Encoding ---
    le = LabelEncoder()
    df["best_shelter_material"] = le.fit_transform(df["best_shelter_material"])
    print(f"best_shelter_material classes: {list(le.classes_)}")

    # --- Cell 08: Train/test split ---
    X = df.drop(["indoor_temperature_C"], axis=1)
    y = df["indoor_temperature_C"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=45
    )

    # --- Cell 09: Scaling ---
    scaler = MinMaxScaler()
    X_train["outdoor_temperature_C"] = scaler.fit_transform(
        X_train[["outdoor_temperature_C"]]
    )
    X_test["outdoor_temperature_C"] = scaler.transform(
        X_test[["outdoor_temperature_C"]]
    )

    # --- Cell 11: Train model (XGBoost — best R²) ---
    xgb_model = XGBRegressor()
    xgb_model.fit(X_train, y_train)
    y_pred = xgb_model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    print(f"R² Score: {r2:.4f}")

    # --- Save artifacts ---
    joblib.dump(xgb_model, MODELS_DIR / "indoor_temp_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "indoor_temp_scaler.joblib")
    joblib.dump(le, MODELS_DIR / "indoor_temp_label_encoder.joblib")

    features = list(X.columns)
    print(f"Features ({len(features)}): {features}")

    return {
        "model_file": "indoor_temp_model.joblib",
        "scaler_file": "indoor_temp_scaler.joblib",
        "le_file": "indoor_temp_label_encoder.joblib",
        "features": features,
        "target": "indoor_temperature_C",
        "material_classes": list(le.classes_),
        "r2_score": round(float(r2), 4),
        "model_type": "XGBRegressor",
        "scaled_feature": "outdoor_temperature_C",
        "encoded_feature": "best_shelter_material",
    }


def export_thermal_energy_model():
    """Exact reproduction of thermal_energy_model.ipynb cells 01-10.

    NOTE: The notebook has a bug in cell 08 — uses fit_transform on BOTH
    train and test sets. We save the scaler fitted on training data (what
    the model was actually trained with) for correct production inference.
    """
    print("\n" + "=" * 60)
    print("EXPORTING: Thermal Energy Model (XGBRegressor)")
    print("=" * 60)

    # --- Cell 02: Load data ---
    df = pd.read_csv(DATA_DIR / "ladakh_thermal_energy_hourly_dataset.csv")
    print(f"Loaded dataset: {df.shape}")

    # --- Cell 04: Encoding ---
    le = LabelEncoder()
    df["wall_material"] = le.fit_transform(df["wall_material"])
    print(f"wall_material classes: {list(le.classes_)}")

    # --- Cell 07: Train/test split ---
    X = df.drop("thermal_energy_kwh", axis=1)
    y = df["thermal_energy_kwh"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=45
    )

    # --- Cell 08: Scaling ---
    # Notebook bug: uses fit_transform on both train AND test.
    # We deepcopy the scaler after fitting on train (what the model learns from).
    minmax_scale = MinMaxScaler()
    X_train["ambient_temp_c"] = minmax_scale.fit_transform(
        X_train[["ambient_temp_c"]]
    )
    train_fitted_scaler = copy.deepcopy(minmax_scale)
    # Replicate notebook bug for accurate score reporting
    X_test["ambient_temp_c"] = minmax_scale.fit_transform(
        X_test[["ambient_temp_c"]]
    )

    # --- Cell 10: Train model (XGBoost — best R²) ---
    xgb_model = XGBRegressor()
    xgb_model.fit(X_train, y_train)
    y_pred = xgb_model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    print(f"R² Score: {r2:.4f}")

    # --- Save artifacts (use training-fitted scaler for production) ---
    joblib.dump(xgb_model, MODELS_DIR / "thermal_energy_model.joblib")
    joblib.dump(train_fitted_scaler, MODELS_DIR / "thermal_energy_scaler.joblib")
    joblib.dump(le, MODELS_DIR / "thermal_energy_label_encoder.joblib")

    features = list(X.columns)
    print(f"Features ({len(features)}): {features}")

    return {
        "model_file": "thermal_energy_model.joblib",
        "scaler_file": "thermal_energy_scaler.joblib",
        "le_file": "thermal_energy_label_encoder.joblib",
        "features": features,
        "target": "thermal_energy_kwh",
        "material_classes": list(le.classes_),
        "r2_score": round(float(r2), 4),
        "model_type": "XGBRegressor",
        "scaled_feature": "ambient_temp_c",
        "encoded_feature": "wall_material",
    }


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    metadata = {}
    metadata["design"] = export_design_model()
    metadata["indoor_temp"] = export_indoor_temp_model()
    metadata["thermal_energy"] = export_thermal_energy_model()

    # Write metadata
    metadata_path = MODELS_DIR / "metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 60)
    print("EXPORT COMPLETE")
    print("=" * 60)
    print(f"Artifacts saved to: {MODELS_DIR}")
    print(f"Metadata written:   {metadata_path}")
    print()

    for fpath in sorted(MODELS_DIR.glob("*")):
        if fpath.name != ".gitkeep":
            size_kb = fpath.stat().st_size / 1024
            print(f"  {fpath.name:45s} {size_kb:8.1f} KB")


if __name__ == "__main__":
    main()
