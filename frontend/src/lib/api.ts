/**
 * lib/api.ts — Typed API client for the Cold-Climate Shelter Thermal Comfort API.
 *
 * THREE exported functions, one per endpoint:
 *   predictDesign()       → POST /predict/design
 *   predictIndoorTemp()   → POST /predict/indoor-temp
 *   predictThermalEnergy() → POST /predict/thermal-energy
 *
 * TypeScript types match the backend Pydantic schemas EXACTLY:
 *   backend/schemas/design.py
 *   backend/schemas/indoor_temp.py
 *   backend/schemas/thermal_energy.py
 *
 * Do NOT rename any field — names are identical to the training dataset columns.
 *
 * Usage (teammate's form pages):
 *   import { predictDesign, type DesignPredictionRequest } from "@/lib/api"
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function apiFetch<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail: string;
    try {
      const err = await res.json();
      detail = err?.detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<TResponse>;
}

/** Thrown when the backend returns a non-2xx response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── /predict/design ─────────────────────────────────────────────────────────
// Source: backend/schemas/design.py :: DesignPredictionRequest / DesignPredictionResponse

/** Input body for POST /predict/design — matches DesignPredictionRequest exactly. */
export interface DesignPredictionRequest {
  /** Degrees north/south  [-90, 90] */
  latitude: number;
  /** Degrees east/west  [-180, 180] */
  longitude: number;
  /** Ambient air temperature in °C (optional) */
  ambient_temp_c?: number | null;
  /** Wind speed in m/s (optional, ≥0) */
  wind_speed_ms?: number | null;
  /** Wind direction in degrees [0, 360] (optional) */
  wind_direction_deg?: number | null;
  /** Global horizontal irradiance in kWh/m²/day (optional, ≥0) */
  ghi_kwh_m2_day?: number | null;
  /** Warm-season relative humidity % [0, 100] (optional) */
  warm_humidity_pct?: number | null;
  /** Hot-air index string category (optional) */
  hot_air_index?: string | null;
  /** Rainfall in last 7 days in mm (optional, ≥0) */
  rain_last_7days_mm?: number | null;
}

/** Response from POST /predict/design — matches DesignPredictionResponse exactly. */
export interface DesignPredictionResponse {
  status: string;
  /** Raw JSON string of the predicted shelter material and design config */
  shelter_material_and_design: string;
  /** Numeric material class label (parsed from shelter_material_and_design) */
  material_class?: number | null;
  /** Window-to-wall ratio (parsed convenience field) */
  wwr?: number | null;
  /** Wall thickness in cm (parsed convenience field) */
  wall_thickness_cm?: number | null;
  /** Glazing ratio fraction [0, 1] (parsed convenience field) */
  glazing_ratio?: number | null;
  /** Insulation R-value (parsed convenience field) */
  insulation_r_value?: number | null;
}

/**
 * Predict optimal shelter design for a given location and climate inputs.
 *
 * @param body - Location + optional climate inputs
 * @returns Predicted material class, WWR, wall thickness, glazing ratio, R-value
 * @throws {ApiError} on non-2xx response
 */
export async function predictDesign(
  body: DesignPredictionRequest
): Promise<DesignPredictionResponse> {
  return apiFetch<DesignPredictionResponse>("/predict/design", body);
}

// ─── /predict/indoor-temp ────────────────────────────────────────────────────
// Source: backend/schemas/indoor_temp.py :: IndoorTempRequest / IndoorTempResponse

/** Input body for POST /predict/indoor-temp — matches IndoorTempRequest exactly. */
export interface IndoorTempRequest {
  /** Degrees north/south  [-90, 90] */
  latitude: number;
  /** Degrees east/west  [-180, 180] */
  longitude: number;
  /** Calendar month [1, 12] */
  month: number;
  /** Hour of day [0, 23] */
  hour: number;
  /** Outdoor air temperature in °C (optional) */
  outdoor_temperature_C?: number | null;
  /** Wind speed in m/s (optional, ≥0) */
  wind_speed_mps?: number | null;
  /** Thermal mass of shelter in MJ/(m³·K) */
  thermal_mass_MJ_m3K: number;
  /** Insulation R-value in m²·K/W */
  insulation_r_value_m2K_W: number;
  /** Glazing fraction [0, 1] */
  glazing: number;
  /** Global horizontal irradiance in W/m² — auto-filled from solar service if omitted */
  GHI_W_m2?: number | null;
  /** Shelter material string — will be label-encoded by the backend */
  best_shelter_material: string;
}

/** Response from POST /predict/indoor-temp — matches IndoorTempResponse exactly. */
export interface IndoorTempResponse {
  status: string;
  /** Predicted indoor temperature in °C */
  indoor_temperature_C: number;
}

/**
 * Predict indoor temperature for a shelter at a given hour and month.
 *
 * @param body - Location, time, design parameters, and climate inputs
 * @returns Predicted indoor_temperature_C in °C
 * @throws {ApiError} on non-2xx response
 */
export async function predictIndoorTemp(
  body: IndoorTempRequest
): Promise<IndoorTempResponse> {
  return apiFetch<IndoorTempResponse>("/predict/indoor-temp", body);
}

// ─── /predict/thermal-energy ─────────────────────────────────────────────────
// Source: backend/schemas/thermal_energy.py :: ThermalEnergyRequest / ThermalEnergyResponse

/** Input body for POST /predict/thermal-energy — matches ThermalEnergyRequest exactly. */
export interface ThermalEnergyRequest {
  /** Degrees north/south  [-90, 90] */
  latitude: number;
  /** Degrees east/west  [-180, 180] */
  longitude: number;
  /** Hour of day [0, 23] (optional — XGBoost handles missing values) */
  hour?: number | null;
  /** Shelter interior volume in m³ (>0) */
  shelter_volume_m3: number;
  /** Wall material string: Stone | Rammed_Earth | Mud_Brick | Concrete */
  wall_material: string;
  /** Wall thickness in cm (>0) */
  wall_thickness_cm: number;
  /** Glazing ratio fraction [0, 1] */
  glazing_ratio: number;
  /** Insulation R-value (≥0) */
  insulation_r_value: number;
  /** Global horizontal irradiance in W/m² (optional, ≥0) */
  ghi_w_m2?: number | null;
  /** Ambient air temperature in °C (optional) */
  ambient_temp_c?: number | null;
  /** Thermal mass of shelter in kJ/K (optional, >0) */
  thermal_mass_kj_k?: number | null;
}

/** Response from POST /predict/thermal-energy — matches ThermalEnergyResponse exactly. */
export interface ThermalEnergyResponse {
  status: string;
  /** Predicted thermal energy demand in kWh */
  thermal_energy_kwh: number;
}

/**
 * Predict thermal energy (heating demand) for a shelter over one hour.
 *
 * @param body - Location, shelter geometry, material, and climate inputs
 * @returns Predicted thermal_energy_kwh
 * @throws {ApiError} on non-2xx response
 */
export async function predictThermalEnergy(
  body: ThermalEnergyRequest
): Promise<ThermalEnergyResponse> {
  return apiFetch<ThermalEnergyResponse>("/predict/thermal-energy", body);
}

// ─── Smoke-test block (remove before committing to production) ────────────────
//
// Uncomment and run in a browser console or test file to verify the backend is
// reachable and field names are wired correctly. Requires a local backend at
// NEXT_PUBLIC_API_URL (default http://localhost:8000) with models loaded.
//
// import { predictDesign, predictIndoorTemp, predictThermalEnergy } from "@/lib/api"
//
// async function smokeTest() {
//   const design = await predictDesign({ latitude: 34.15, longitude: 77.57 })
//   console.log("[smoke] /predict/design →", design)
//
//   const temp = await predictIndoorTemp({
//     latitude: 34.15,
//     longitude: 77.57,
//     month: 1,
//     hour: 12,
//     thermal_mass_MJ_m3K: 2.1,
//     insulation_r_value_m2K_W: 3.5,
//     glazing: 0.15,
//     best_shelter_material: "Stone",
//   })
//   console.log("[smoke] /predict/indoor-temp →", temp)
//
//   const energy = await predictThermalEnergy({
//     latitude: 34.15,
//     longitude: 77.57,
//     shelter_volume_m3: 45,
//     wall_material: "Stone",
//     wall_thickness_cm: 40,
//     glazing_ratio: 0.15,
//     insulation_r_value: 3.5,
//   })
//   console.log("[smoke] /predict/thermal-energy →", energy)
// }
// smokeTest()
