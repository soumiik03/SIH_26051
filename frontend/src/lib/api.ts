/**
 * lib/api.ts — Typed API client and client-side fallback engine for Cold-Climate Shelter Thermal Comfort.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ─── Shared Fetch Helpers ─────────────────────────────────────────────────────

async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(0, "The prediction service could not be reached. Check that the backend is running.");
  }

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

  try {
    return (await res.json()) as TResponse;
  } catch {
    throw new ApiError(res.status, "The prediction service returned an invalid response.");
  }
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

// ─── Climate Service Types ───────────────────────────────────────────────────

export interface ClimateData {
  latitude: number;
  longitude: number;
  ambient_temp_c: number;
  wind_speed_ms: number;
  humidity_pct: number;
  ghi_kwh_m2_day: number;
  rain_last_7days_mm: number;
  source: string;
}

export async function getClimate(
  latitude: number,
  longitude: number
): Promise<ClimateData> {
  return apiFetch<ClimateData>(
    `/climate?latitude=${latitude}&longitude=${longitude}`,
    { method: "GET" }
  );
}

// ─── /predict/design ─────────────────────────────────────────────────────────

export interface DesignPredictionRequest {
  latitude: number;
  longitude: number;
  ambient_temp_c?: number | null;
  wind_speed_ms?: number | null;
  wind_direction_deg?: number | null;
  ghi_kwh_m2_day?: number | null;
  warm_humidity_pct?: number | null;
  hot_air_index?: string | null;
  rain_last_7days_mm?: number | null;
}

export interface DesignPredictionResponse {
  status: string;
  shelter_material_and_design: string;
  material_class?: number | null;
  wwr?: number | null;
  wall_thickness_cm?: number | null;
  glazing_ratio?: number | null;
  insulation_r_value?: number | null;
}

export async function predictDesign(
  body: DesignPredictionRequest
): Promise<DesignPredictionResponse> {
  return apiFetch<DesignPredictionResponse>("/predict/design", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── /predict/indoor-temp ────────────────────────────────────────────────────

export interface IndoorTempRequest {
  latitude: number;
  longitude: number;
  month: number;
  hour: number;
  outdoor_temperature_C?: number | null;
  wind_speed_mps?: number | null;
  thermal_mass_MJ_m3K: number;
  insulation_r_value_m2K_W: number;
  glazing: number;
  GHI_W_m2?: number | null;
  best_shelter_material: string;
}

export interface IndoorTempResponse {
  status: string;
  indoor_temperature_C: number;
}

export async function predictIndoorTemp(
  body: IndoorTempRequest
): Promise<IndoorTempResponse> {
  const response = await apiFetch<unknown>("/predict/indoor-temp", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (
    typeof response !== "object" ||
    response === null ||
    typeof (response as { indoor_temperature_C?: unknown }).indoor_temperature_C !== "number" ||
    !Number.isFinite((response as { indoor_temperature_C: number }).indoor_temperature_C)
  ) {
    throw new ApiError(200, "The prediction service returned an incomplete temperature result.");
  }
  return response as IndoorTempResponse;
}

// ─── /predict/thermal-energy ─────────────────────────────────────────────────

export interface ThermalEnergyRequest {
  latitude: number;
  longitude: number;
  hour?: number | null;
  shelter_volume_m3: number;
  wall_material: string;
  wall_thickness_cm: number;
  glazing_ratio: number;
  insulation_r_value: number;
  ghi_w_m2?: number | null;
  ambient_temp_c?: number | null;
  thermal_mass_kj_k?: number | null;
}

export interface ThermalEnergyResponse {
  status: string;
  thermal_energy_kwh: number;
}

export async function predictThermalEnergy(
  body: ThermalEnergyRequest
): Promise<ThermalEnergyResponse> {
  return apiFetch<ThermalEnergyResponse>("/predict/thermal-energy", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Chapter 3: Optimization & Results Dashboard ──────────────────────────────

export interface ShelterDesign {
  material: "brick" | "aac" | "insulated_panel";
  insulation_mm: number;
  glazing: "single" | "double" | "low_e";
  area_m2: number;
}

export interface AnalysisRequest {
  location: string;
  outdoor_temp_c: number;
  solar_kwh_m2: number;
  occupants: number;
  target_temp_c?: number;
  design: ShelterDesign;
}

export interface OptimizationRequest extends AnalysisRequest {
  population_size?: number;
  generations?: number;
}

export interface HourlyTempPoint {
  hour: number;
  outdoor: number;
  indoor: number;
}

export interface ParetoPoint {
  design: ShelterDesign;
  daily_heating_kwh: number;
  estimated_install_cost: number;
}

export interface AnalysisResult {
  location: string;
  inputs: OptimizationRequest;
  design: ShelterDesign;
  indoor_temperature_24h: HourlyTempPoint[];
  thermal_energy: {
    daily_heating_kwh: number;
    annual_heating_kwh: number;
  };
  comfort: {
    minimum_indoor_c: number;
    hours_below_target: number;
  };
  cost: {
    estimated_install_cost: number;
  };
}

export interface DashboardResponse {
  status: string;
  baseline: AnalysisResult;
  pareto_front: ParetoPoint[];
  source?: string;
}

export async function runOptimization(
  body: OptimizationRequest
): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/optimization/run", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getDashboard(
  body: OptimizationRequest
): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/optimization/dashboard", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getGoldenCase(
  location: string
): Promise<{ status: string; source: string; result: AnalysisResult }> {
  return apiFetch<{ status: string; source: string; result: AnalysisResult }>(
    `/optimization/golden/${encodeURIComponent(location)}`,
    { method: "GET" }
  );
}

// ─── Client-Side Bulletproof Golden Fallback Data ─────────────────────────────
// Guaranteed 100% offline demo resilience if the local backend server is unreachable

export interface PresetLocation {
  name: string;
  coords: { lat: number; lon: number };
  climate: {
    ambient_temp_c: number;
    wind_speed_ms: number;
    ghi_kwh_m2_day: number;
    humidity_pct: number;
    hot_air_index: string;
  };
  indoorTempPreset: Partial<IndoorTempRequest>;
  thermalEnergyPreset: Partial<ThermalEnergyRequest>;
  dashboardFallback: DashboardResponse;
}

export const GOLDEN_PRESETS: Record<string, PresetLocation> = {
  Leh: {
    name: "Leh (Ladakh Capital)",
    coords: { lat: 34.16, lon: 77.58 },
    climate: {
      ambient_temp_c: -6.0,
      wind_speed_ms: 3.5,
      ghi_kwh_m2_day: 5.4,
      humidity_pct: 25.0,
      hot_air_index: "Extreme Freeze",
    },
    indoorTempPreset: {
      latitude: 34.16,
      longitude: 77.58,
      month: 1,
      hour: 12,
      outdoor_temperature_C: -6.0,
      wind_speed_mps: 3.5,
      thermal_mass_MJ_m3K: 2.2,
      insulation_r_value_m2K_W: 5.2,
      glazing: 0.25,
      GHI_W_m2: 550,
      best_shelter_material:
        "Stabilized Rammed Earth + Straw-Clay cavity insulation; south Trombe wall with double low-E glazing",
    },
    thermalEnergyPreset: {
      latitude: 34.16,
      longitude: 77.58,
      shelter_volume_m3: 120,
      wall_material: "Rammed_Earth",
      wall_thickness_cm: 45,
      glazing_ratio: 0.25,
      insulation_r_value: 5.2,
      ghi_w_m2: 550,
      ambient_temp_c: -6.0,
      thermal_mass_kj_k: 12500,
    },
    dashboardFallback: {
      status: "fallback",
      source: "client-offline-cache",
      baseline: {
        location: "Leh",
        inputs: {
          location: "Leh",
          outdoor_temp_c: -6.0,
          solar_kwh_m2: 5.4,
          occupants: 4,
          target_temp_c: 21.0,
          design: {
            material: "insulated_panel",
            insulation_mm: 150,
            glazing: "low_e",
            area_m2: 85,
          },
        },
        design: {
          material: "insulated_panel",
          insulation_mm: 150,
          glazing: "low_e",
          area_m2: 85,
        },
        indoor_temperature_24h: [
          { hour: 0, outdoor: -9.5, indoor: 17.6 },
          { hour: 1, outdoor: -9.8, indoor: 17.4 },
          { hour: 2, outdoor: -10.0, indoor: 17.3 },
          { hour: 3, outdoor: -9.8, indoor: 17.2 },
          { hour: 4, outdoor: -9.5, indoor: 17.1 },
          { hour: 5, outdoor: -8.8, indoor: 17.2 },
          { hour: 6, outdoor: -8.0, indoor: 17.5 },
          { hour: 7, outdoor: -7.0, indoor: 18.0 },
          { hour: 8, outdoor: -6.0, indoor: 18.6 },
          { hour: 9, outdoor: -5.0, indoor: 19.4 },
          { hour: 10, outdoor: -4.0, indoor: 20.2 },
          { hour: 11, outdoor: -3.0, indoor: 20.8 },
          { hour: 12, outdoor: -2.0, indoor: 21.2 },
          { hour: 13, outdoor: -2.2, indoor: 21.1 },
          { hour: 14, outdoor: -2.8, indoor: 20.7 },
          { hour: 15, outdoor: -3.8, indoor: 20.1 },
          { hour: 16, outdoor: -5.0, indoor: 19.5 },
          { hour: 17, outdoor: -6.2, indoor: 18.9 },
          { hour: 18, outdoor: -7.2, indoor: 18.4 },
          { hour: 19, outdoor: -8.0, indoor: 18.1 },
          { hour: 20, outdoor: -8.6, indoor: 17.9 },
          { hour: 21, outdoor: -9.0, indoor: 17.8 },
          { hour: 22, outdoor: -9.2, indoor: 17.7 },
          { hour: 23, outdoor: -9.4, indoor: 17.6 },
        ],
        thermal_energy: {
          daily_heating_kwh: 16.8,
          annual_heating_kwh: 2016,
        },
        comfort: {
          minimum_indoor_c: 17.1,
          hours_below_target: 17,
        },
        cost: {
          estimated_install_cost: 14780.0,
        },
      },
      pareto_front: [
        {
          design: { material: "brick", insulation_mm: 50, glazing: "single", area_m2: 85 },
          daily_heating_kwh: 84.5,
          estimated_install_cost: 6520.0,
        },
        {
          design: { material: "aac", insulation_mm: 90, glazing: "double", area_m2: 85 },
          daily_heating_kwh: 36.2,
          estimated_install_cost: 9840.0,
        },
        {
          design: { material: "insulated_panel", insulation_mm: 120, glazing: "double", area_m2: 85 },
          daily_heating_kwh: 22.1,
          estimated_install_cost: 12950.0,
        },
        {
          design: { material: "insulated_panel", insulation_mm: 160, glazing: "low_e", area_m2: 85 },
          daily_heating_kwh: 15.4,
          estimated_install_cost: 15640.0,
        },
      ],
    },
  },
  Dras: {
    name: "Dras (Coldest Inhabited Place in India)",
    coords: { lat: 34.43, lon: 75.76 },
    climate: {
      ambient_temp_c: -14.0,
      wind_speed_ms: 4.8,
      ghi_kwh_m2_day: 4.8,
      humidity_pct: 35.0,
      hot_air_index: "Extreme Freeze",
    },
    indoorTempPreset: {
      latitude: 34.43,
      longitude: 75.76,
      month: 1,
      hour: 12,
      outdoor_temperature_C: -14.0,
      wind_speed_mps: 4.8,
      thermal_mass_MJ_m3K: 2.5,
      insulation_r_value_m2K_W: 6.2,
      glazing: 0.2,
      GHI_W_m2: 480,
      best_shelter_material:
        "Super-insulated Rammed Earth (straw/clay cavity) + unvented Trombe wall & insulated thermal shutter",
    },
    thermalEnergyPreset: {
      latitude: 34.43,
      longitude: 75.76,
      shelter_volume_m3: 100,
      wall_material: "Concrete",
      wall_thickness_cm: 50,
      glazing_ratio: 0.2,
      insulation_r_value: 6.2,
      ghi_w_m2: 480,
      ambient_temp_c: -14.0,
      thermal_mass_kj_k: 14000,
    },
    dashboardFallback: {
      status: "fallback",
      source: "client-offline-cache",
      baseline: {
        location: "Dras",
        inputs: {
          location: "Dras",
          outdoor_temp_c: -14.0,
          solar_kwh_m2: 4.8,
          occupants: 4,
          target_temp_c: 21.0,
          design: {
            material: "insulated_panel",
            insulation_mm: 200,
            glazing: "low_e",
            area_m2: 75,
          },
        },
        design: {
          material: "insulated_panel",
          insulation_mm: 200,
          glazing: "low_e",
          area_m2: 75,
        },
        indoor_temperature_24h: [
          { hour: 0, outdoor: -17.5, indoor: 16.4 },
          { hour: 1, outdoor: -17.8, indoor: 16.2 },
          { hour: 2, outdoor: -18.0, indoor: 16.0 },
          { hour: 3, outdoor: -17.8, indoor: 15.9 },
          { hour: 4, outdoor: -17.5, indoor: 15.8 },
          { hour: 5, outdoor: -16.8, indoor: 15.9 },
          { hour: 6, outdoor: -16.0, indoor: 16.2 },
          { hour: 7, outdoor: -15.0, indoor: 16.8 },
          { hour: 8, outdoor: -14.0, indoor: 17.5 },
          { hour: 9, outdoor: -13.0, indoor: 18.4 },
          { hour: 10, outdoor: -12.0, indoor: 19.3 },
          { hour: 11, outdoor: -11.0, indoor: 20.0 },
          { hour: 12, outdoor: -10.0, indoor: 20.5 },
          { hour: 13, outdoor: -10.2, indoor: 20.3 },
          { hour: 14, outdoor: -10.8, indoor: 19.8 },
          { hour: 15, outdoor: -11.8, indoor: 19.2 },
          { hour: 16, outdoor: -13.0, indoor: 18.5 },
          { hour: 17, outdoor: -14.2, indoor: 17.9 },
          { hour: 18, outdoor: -15.2, indoor: 17.4 },
          { hour: 19, outdoor: -16.0, indoor: 17.1 },
          { hour: 20, outdoor: -16.6, indoor: 16.9 },
          { hour: 21, outdoor: -17.0, indoor: 16.7 },
          { hour: 22, outdoor: -17.2, indoor: 16.6 },
          { hour: 23, outdoor: -17.4, indoor: 16.5 },
        ],
        thermal_energy: {
          daily_heating_kwh: 24.5,
          annual_heating_kwh: 2940,
        },
        comfort: {
          minimum_indoor_c: 15.8,
          hours_below_target: 20,
        },
        cost: {
          estimated_install_cost: 16850.0,
        },
      },
      pareto_front: [
        {
          design: { material: "aac", insulation_mm: 100, glazing: "double", area_m2: 75 },
          daily_heating_kwh: 58.4,
          estimated_install_cost: 9200.0,
        },
        {
          design: { material: "insulated_panel", insulation_mm: 150, glazing: "double", area_m2: 75 },
          daily_heating_kwh: 34.2,
          estimated_install_cost: 13800.0,
        },
        {
          design: { material: "insulated_panel", insulation_mm: 200, glazing: "low_e", area_m2: 75 },
          daily_heating_kwh: 23.8,
          estimated_install_cost: 17400.0,
        },
      ],
    },
  },
  Kargil: {
    name: "Kargil (Suru River Valley)",
    coords: { lat: 34.55, lon: 76.13 },
    climate: {
      ambient_temp_c: -8.0,
      wind_speed_ms: 3.2,
      ghi_kwh_m2_day: 5.1,
      humidity_pct: 28.0,
      hot_air_index: "Extreme Freeze",
    },
    indoorTempPreset: {
      latitude: 34.55,
      longitude: 76.13,
      month: 1,
      hour: 12,
      outdoor_temperature_C: -8.0,
      wind_speed_mps: 3.2,
      thermal_mass_MJ_m3K: 2.0,
      insulation_r_value_m2K_W: 4.8,
      glazing: 0.22,
      GHI_W_m2: 520,
      best_shelter_material:
        "Sun-dried adobe bricks with 10cm straw-clay exterior jacket insulation and direct solar-gain south windows",
    },
    thermalEnergyPreset: {
      latitude: 34.55,
      longitude: 76.13,
      shelter_volume_m3: 110,
      wall_material: "Mud_Brick",
      wall_thickness_cm: 42,
      glazing_ratio: 0.22,
      insulation_r_value: 4.8,
      ghi_w_m2: 520,
      ambient_temp_c: -8.0,
      thermal_mass_kj_k: 11200,
    },
    dashboardFallback: {
      status: "fallback",
      source: "client-offline-cache",
      baseline: {
        location: "Kargil",
        inputs: {
          location: "Kargil",
          outdoor_temp_c: -8.0,
          solar_kwh_m2: 5.1,
          occupants: 3,
          target_temp_c: 21.0,
          design: {
            material: "aac",
            insulation_mm: 120,
            glazing: "double",
            area_m2: 80,
          },
        },
        design: {
          material: "aac",
          insulation_mm: 120,
          glazing: "double",
          area_m2: 80,
        },
        indoor_temperature_24h: [
          { hour: 0, outdoor: -11.5, indoor: 17.0 },
          { hour: 1, outdoor: -11.8, indoor: 16.8 },
          { hour: 2, outdoor: -12.0, indoor: 16.7 },
          { hour: 3, outdoor: -11.8, indoor: 16.6 },
          { hour: 4, outdoor: -11.5, indoor: 16.5 },
          { hour: 5, outdoor: -10.8, indoor: 16.6 },
          { hour: 6, outdoor: -10.0, indoor: 16.9 },
          { hour: 7, outdoor: -9.0, indoor: 17.5 },
          { hour: 8, outdoor: -8.0, indoor: 18.2 },
          { hour: 9, outdoor: -7.0, indoor: 19.0 },
          { hour: 10, outdoor: -6.0, indoor: 19.8 },
          { hour: 11, outdoor: -5.0, indoor: 20.4 },
          { hour: 12, outdoor: -4.0, indoor: 20.9 },
          { hour: 13, outdoor: -4.2, indoor: 20.7 },
          { hour: 14, outdoor: -4.8, indoor: 20.3 },
          { hour: 15, outdoor: -5.8, indoor: 19.7 },
          { hour: 16, outdoor: -7.0, indoor: 19.0 },
          { hour: 17, outdoor: -8.2, indoor: 18.4 },
          { hour: 18, outdoor: -9.2, indoor: 17.9 },
          { hour: 19, outdoor: -10.0, indoor: 17.6 },
          { hour: 20, outdoor: -10.6, indoor: 17.3 },
          { hour: 21, outdoor: -11.0, indoor: 17.2 },
          { hour: 22, outdoor: -11.2, indoor: 17.1 },
          { hour: 23, outdoor: -11.4, indoor: 17.0 },
        ],
        thermal_energy: {
          daily_heating_kwh: 19.8,
          annual_heating_kwh: 2376,
        },
        comfort: {
          minimum_indoor_c: 16.5,
          hours_below_target: 18,
        },
        cost: {
          estimated_install_cost: 11400.0,
        },
      },
      pareto_front: [
        {
          design: { material: "brick", insulation_mm: 60, glazing: "single", area_m2: 80 },
          daily_heating_kwh: 72.0,
          estimated_install_cost: 6200.0,
        },
        {
          design: { material: "aac", insulation_mm: 100, glazing: "double", area_m2: 80 },
          daily_heating_kwh: 29.5,
          estimated_install_cost: 10100.0,
        },
        {
          design: { material: "insulated_panel", insulation_mm: 140, glazing: "low_e", area_m2: 80 },
          daily_heating_kwh: 17.2,
          estimated_install_cost: 14200.0,
        },
      ],
    },
  },
};

// ─── Heat Flow & 3D Visualization (SIH Task 3) ───────────────────────────────
export * from "./api/heat-flow";
