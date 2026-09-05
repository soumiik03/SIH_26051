import { ApiError, type ThermalEnergyRequest } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000"

export type ThermalEnergyResult = {
  status: string
  thermal_energy_kwh: number
}

export type { ThermalEnergyRequest }

export async function predictThermalEnergy(body: ThermalEnergyRequest): Promise<ThermalEnergyResult> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/predict/thermal-energy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "The thermal energy service could not be reached. Check that the backend is running.")
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError(response.status, "The thermal energy service returned an invalid response.")
  }

  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data
      ? String((data as { detail: unknown }).detail)
      : response.statusText || "Thermal energy prediction failed."
    throw new ApiError(response.status, detail)
  }

  if (!isThermalEnergyResult(data)) {
    throw new ApiError(response.status, "The thermal energy service returned an incomplete result.")
  }
  return data
}

function isThermalEnergyResult(value: unknown): value is ThermalEnergyResult {
  if (typeof value !== "object" || value === null) return false
  const result = value as Record<string, unknown>
  return typeof result.status === "string" &&
    typeof result.thermal_energy_kwh === "number" &&
    Number.isFinite(result.thermal_energy_kwh)
}
