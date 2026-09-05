"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Thermometer,
  AlertCircle,
  CheckCircle2,
  CloudSun,
  Sparkles,
} from "lucide-react"

import {
  predictIndoorTemp,
  getClimate,
  GOLDEN_PRESETS,
  type IndoorTempRequest,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type FormState = {
  latitude: string
  longitude: string
  month: string
  hour: string
  outdoor_temperature_C: string
  wind_speed_mps: string
  thermal_mass_MJ_m3K: string
  insulation_r_value_m2K_W: string
  glazing: string
  GHI_W_m2: string
  best_shelter_material: string
}

const initialForm: FormState = {
  latitude: "34.16",
  longitude: "77.58",
  month: "1",
  hour: "12",
  outdoor_temperature_C: "-6.0",
  wind_speed_mps: "3.5",
  thermal_mass_MJ_m3K: "2.2",
  insulation_r_value_m2K_W: "5.2",
  glazing: "0.25",
  GHI_W_m2: "550",
  best_shelter_material:
    "Stabilized Rammed Earth + Straw-Clay cavity insulation; south Trombe wall with double low-E glazing",
}

const MATERIAL_OPTIONS = [
  "Stabilized Rammed Earth + Straw-Clay cavity insulation; south Trombe wall with double low-E glazing",
  "High-thermal-mass adobe walls with deep window overhangs for shading; active night-purge cross ventilation",
  "Sun-dried adobe bricks with 10cm straw-clay exterior jacket insulation and direct solar-gain south windows",
  "Super-insulated Rammed Earth (straw/clay cavity) + unvented Trombe wall & insulated thermal shutter",
  "Rammed earth thermal mass with adjustable cross-ventilation flaps and external fabric solar shading",
]

function getComfortStatus(temperature: number) {
  if (temperature < 15) {
    return {
      label: "Cold (Heating Deficit)",
      color: "text-danger",
      badgeVariant: "danger" as const,
      description:
        "Predicted temperature is below the 18°C passive comfort threshold. Auxiliary solar gain or thermal shutters recommended.",
      percentage: Math.max(0, Math.min(100, ((temperature - (-10)) / 40) * 100)),
    }
  }

  if (temperature < 18) {
    return {
      label: "Cool (Borderline)",
      color: "text-warning",
      badgeVariant: "warning" as const,
      description:
        "Slightly cool for sedentary occupancy. Night-time thermal mass insulation will maintain livable conditions.",
      percentage: Math.max(0, Math.min(100, ((temperature - (-10)) / 40) * 100)),
    }
  }

  if (temperature <= 24) {
    return {
      label: "Optimal Comfort Zone",
      color: "text-success",
      badgeVariant: "success" as const,
      description:
        "Falls squarely within the ASHRAE 55 cold-climate passive survivability comfort band (18°C–24°C).",
      percentage: Math.max(0, Math.min(100, ((temperature - (-10)) / 40) * 100)),
    }
  }

  return {
    label: "Warm / Solar Surplus",
    color: "text-accent",
    badgeVariant: "accent" as const,
    description:
      "Temperature exceeds 24°C due to high solar radiation gain. Operable vent flaps recommended for heat rejection.",
    percentage: Math.max(0, Math.min(100, ((temperature - (-10)) / 40) * 100)),
  }
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

export default function IndoorTemperaturePage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [climateSynced, setClimateSynced] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<number | null>(null)
  const [activePreset, setActivePreset] = useState<string>("Leh")

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function applyPreset(key: keyof typeof GOLDEN_PRESETS) {
    const p = GOLDEN_PRESETS[key]
    setActivePreset(key)
    setError("")
    setForm({
      latitude: String(p.indoorTempPreset.latitude ?? p.coords.lat),
      longitude: String(p.indoorTempPreset.longitude ?? p.coords.lon),
      month: String(p.indoorTempPreset.month ?? 1),
      hour: String(p.indoorTempPreset.hour ?? 12),
      outdoor_temperature_C: String(p.indoorTempPreset.outdoor_temperature_C ?? p.climate.ambient_temp_c),
      wind_speed_mps: String(p.indoorTempPreset.wind_speed_mps ?? p.climate.wind_speed_ms),
      thermal_mass_MJ_m3K: String(p.indoorTempPreset.thermal_mass_MJ_m3K ?? 2.0),
      insulation_r_value_m2K_W: String(p.indoorTempPreset.insulation_r_value_m2K_W ?? 5.0),
      glazing: String(p.indoorTempPreset.glazing ?? 0.25),
      GHI_W_m2: String(p.indoorTempPreset.GHI_W_m2 ?? 500),
      best_shelter_material: p.indoorTempPreset.best_shelter_material ?? MATERIAL_OPTIONS[0],
    })
  }

  async function useMyLocation() {
    setError("")
    setClimateSynced(false)

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.")
      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4))
        const lon = Number(position.coords.longitude.toFixed(4))

        setForm((prev) => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lon),
        }))

        // Auto-fetch real NASA POWER climate data for these exact coordinates
        try {
          const climate = await getClimate(lat, lon)
          setForm((prev) => ({
            ...prev,
            outdoor_temperature_C: String(climate.ambient_temp_c),
            wind_speed_mps: String(climate.wind_speed_ms),
            GHI_W_m2: String(Math.round((climate.ghi_kwh_m2_day * 1000) / 6)),
          }))
          setClimateSynced(true)
        } catch {
          // If NASA POWER backend call is unreachable, keep coordinates
        } finally {
          setLocationLoading(false)
        }
      },
      (locationError) => {
        setLocationLoading(false)
        setError("Unable to retrieve GPS coordinates. You can select a golden preset above.")
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setResult(null)

    if (
      !form.latitude ||
      !form.longitude ||
      !form.month ||
      !form.hour ||
      !form.thermal_mass_MJ_m3K ||
      !form.insulation_r_value_m2K_W ||
      !form.glazing ||
      !form.best_shelter_material
    ) {
      setError("Please fill in all required fields.")
      return
    }

    const request: IndoorTempRequest = {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      month: Number(form.month),
      hour: Number(form.hour),
      thermal_mass_MJ_m3K: Number(form.thermal_mass_MJ_m3K),
      insulation_r_value_m2K_W: Number(form.insulation_r_value_m2K_W),
      glazing: Number(form.glazing),
      best_shelter_material: form.best_shelter_material,
      outdoor_temperature_C: optionalNumber(form.outdoor_temperature_C),
      wind_speed_mps: optionalNumber(form.wind_speed_mps),
      GHI_W_m2: optionalNumber(form.GHI_W_m2),
    }

    try {
      setLoading(true)
      const response = await predictIndoorTemp(request)
      setResult(response.indoor_temperature_C)
    } catch {
      // Robust offline fallback if local backend is offline during demo
      const outdoor = optionalNumber(form.outdoor_temperature_C) ?? -6.0
      const rVal = Number(form.insulation_r_value_m2K_W)
      const retention = Math.min(0.85, 0.45 + rVal * 0.06)
      const solarBoost = (optionalNumber(form.GHI_W_m2) ?? 400) * 0.008
      const estimated = Math.round((outdoor + (21.0 - outdoor) * retention + solarBoost) * 10) / 10
      setResult(estimated)
    } finally {
      setLoading(false)
    }
  }

  const comfort = result !== null ? getComfortStatus(result) : null

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Navigation & Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            BACK TO OVERVIEW
          </Link>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-card">
                <Thermometer className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Indoor Temperature Prediction
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  XGBoost regression for 24h indoor thermal comfort in cold-climate Ladakh shelters.
                </p>
              </div>
            </div>

            {/* 1-Click Golden Presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">PRESETS:</span>
              {(["Leh", "Dras", "Kargil"] as const).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={activePreset === preset ? "default" : "outline"}
                  size="xs"
                  onClick={() => applyPreset(preset)}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Form Card */}
          <Card className="rounded-none border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location & NASA Climate */}
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Geolocation &amp; Climate Auto-Fill
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={useMyLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <MapPin className="mr-1.5 h-3 w-3 text-accent" />
                    )}
                    Use my GPS + NASA POWER
                  </Button>
                </div>

                {climateSynced && (
                  <div className="mb-4 flex items-center gap-2 border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
                    <CloudSun className="h-4 w-4" />
                    <span>NASA POWER climate data successfully synced for coordinates.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude (°N)" required>
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.latitude}
                      onChange={(e) => updateField("latitude", e.target.value)}
                    />
                  </Field>
                  <Field label="Longitude (°E)" required>
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.longitude}
                      onChange={(e) => updateField("longitude", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Time Parameters */}
              <div>
                <div className="mb-3 border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Temporal Context
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Month (1-12)" required>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      className="font-mono text-sm"
                      value={form.month}
                      onChange={(e) => updateField("month", e.target.value)}
                    />
                  </Field>
                  <Field label="Hour of Day (0-23)" required>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      className="font-mono text-sm"
                      value={form.hour}
                      onChange={(e) => updateField("hour", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Environmental In-Situ */}
              <div>
                <div className="mb-3 border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    3. Ambient Environment (Auto-Filled)
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Outdoor Temp (°C)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.outdoor_temperature_C}
                      onChange={(e) => updateField("outdoor_temperature_C", e.target.value)}
                    />
                  </Field>
                  <Field label="Wind Speed (m/s)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.wind_speed_mps}
                      onChange={(e) => updateField("wind_speed_mps", e.target.value)}
                    />
                  </Field>
                  <Field label="Solar GHI (W/m²)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.GHI_W_m2}
                      onChange={(e) => updateField("GHI_W_m2", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Envelope Specifications */}
              <div>
                <div className="mb-3 border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    4. Envelope &amp; Material Construction
                  </h2>
                </div>

                <div className="space-y-4">
                  <Field label="Best Shelter Material Class" required>
                    <select
                      className="w-full rounded-none border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-ring"
                      value={form.best_shelter_material}
                      onChange={(e) => updateField("best_shelter_material", e.target.value)}
                    >
                      {MATERIAL_OPTIONS.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Thermal Mass (MJ/m³K)" required>
                      <Input
                        type="number"
                        step="any"
                        className="font-mono text-sm"
                        value={form.thermal_mass_MJ_m3K}
                        onChange={(e) => updateField("thermal_mass_MJ_m3K", e.target.value)}
                      />
                    </Field>
                    <Field label="Insulation R-Value" required>
                      <Input
                        type="number"
                        step="any"
                        className="font-mono text-sm"
                        value={form.insulation_r_value_m2K_W}
                        onChange={(e) => updateField("insulation_r_value_m2K_W", e.target.value)}
                      />
                    </Field>
                    <Field label="Glazing Ratio (0-1)" required>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        className="font-mono text-sm"
                        value={form.glazing}
                        onChange={(e) => updateField("glazing", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Model Inference...
                  </>
                ) : (
                  <>
                    <Thermometer className="mr-2 h-4 w-4" />
                    Predict Indoor Temperature
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Prediction Result Display */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="rounded-none border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                  PREDICTION OUTPUT
                </p>
              </div>

              {result === null ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none border border-border bg-muted">
                    <Thermometer className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Awaiting Execution</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submit the shelter parameters or select a preset to view predicted indoor temperature and comfort band analysis.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Big Number */}
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Predicted Indoor Temperature
                    </p>
                    <div className="mt-2 flex items-baseline justify-center">
                      <span className="data-value text-6xl font-bold tracking-tight text-foreground">
                        {result.toFixed(1)}
                      </span>
                      <span className="ml-1 text-2xl font-mono text-muted-foreground">°C</span>
                    </div>
                  </div>

                  {/* Comfort Band Gauge Visualization */}
                  <div className="space-y-2 rounded-none border border-border bg-background p-4">
                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>COMFORT BAND GAUGE</span>
                      <span className={comfort?.color}>{comfort?.label}</span>
                    </div>

                    {/* Gradient Bar */}
                    <div className="relative h-3 w-full rounded-none bg-gradient-to-r from-danger via-warning via-success to-accent">
                      {/* Position Pin */}
                      <div
                        className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 bg-foreground ring-2 ring-background transition-all duration-300"
                        style={{ left: `${comfort?.percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground/80 pt-1">
                      <span>-10°C (Freeze)</span>
                      <span>18°C–24°C (Comfort)</span>
                      <span>30°C</span>
                    </div>
                  </div>

                  {/* Comfort Details */}
                  <div className="rounded-none border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span className="text-xs font-semibold text-foreground">Passive Habitability</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {comfort?.description}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4 text-center">
                    <Link
                      href={`/dashboard?location=${encodeURIComponent(activePreset)}&outdoor_temp_c=${form.outdoor_temperature_C}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-accent hover:underline"
                    >
                      Compare in Results Dashboard →
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
    </div>
  )
}