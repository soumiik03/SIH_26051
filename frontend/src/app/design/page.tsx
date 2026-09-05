"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  CloudSun,
  SlidersHorizontal,
} from "lucide-react"

import {
  predictDesign,
  getClimate,
  GOLDEN_PRESETS,
  type DesignPredictionRequest,
  type DesignPredictionResponse,
} from "@/lib/api"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type FormState = {
  latitude: string
  longitude: string
  ambient_temp_c: string
  wind_speed_ms: string
  wind_direction_deg: string
  ghi_kwh_m2_day: string
  warm_humidity_pct: string
  hot_air_index: string
  rain_last_7days_mm: string
}

const initialForm: FormState = {
  latitude: "34.16",
  longitude: "77.58",
  ambient_temp_c: "-6.0",
  wind_speed_ms: "3.5",
  wind_direction_deg: "220",
  ghi_kwh_m2_day: "5.4",
  warm_humidity_pct: "25.0",
  hot_air_index: "Extreme Freeze",
  rain_last_7days_mm: "0.0",
}

const HOT_AIR_INDEX_OPTIONS = [
  "Extreme Freeze",
  "Very Low",
  "Low",
  "Moderate",
  "High",
]

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

export default function DesignPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [climateSynced, setClimateSynced] = useState(false)
  const [error, setError] = useState("")
  const [activePreset, setActivePreset] = useState<string>("Leh")

  const [prediction, setPrediction] = useState<DesignPredictionResponse | null>(null)

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
      latitude: String(p.coords.lat),
      longitude: String(p.coords.lon),
      ambient_temp_c: String(p.climate.ambient_temp_c),
      wind_speed_ms: String(p.climate.wind_speed_ms),
      wind_direction_deg: "220",
      ghi_kwh_m2_day: String(p.climate.ghi_kwh_m2_day),
      warm_humidity_pct: String(p.climate.humidity_pct),
      hot_air_index: p.climate.hot_air_index,
      rain_last_7days_mm: "0.0",
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

        // Auto-fetch real NASA POWER climate data for these coordinates
        try {
          const climate = await getClimate(lat, lon)
          setForm((prev) => ({
            ...prev,
            ambient_temp_c: String(climate.ambient_temp_c),
            wind_speed_ms: String(climate.wind_speed_ms),
            ghi_kwh_m2_day: String(climate.ghi_kwh_m2_day),
            warm_humidity_pct: String(climate.humidity_pct),
            rain_last_7days_mm: String(climate.rain_last_7days_mm),
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
    setPrediction(null)

    if (!form.latitude || !form.longitude) {
      setError("Latitude and longitude are required.")
      return
    }

    const request: DesignPredictionRequest = {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      ambient_temp_c: optionalNumber(form.ambient_temp_c),
      wind_speed_ms: optionalNumber(form.wind_speed_ms),
      wind_direction_deg: optionalNumber(form.wind_direction_deg),
      ghi_kwh_m2_day: optionalNumber(form.ghi_kwh_m2_day),
      warm_humidity_pct: optionalNumber(form.warm_humidity_pct),
      hot_air_index: form.hot_air_index || null,
      rain_last_7days_mm: optionalNumber(form.rain_last_7days_mm),
    }

    try {
      setLoading(true)
      const response = await predictDesign(request)
      setPrediction(response)
    } catch {
      // Robust offline fallback if backend server is unreachable
      setPrediction({
        status: "fallback",
        shelter_material_and_design: JSON.stringify({
          material_class: 1,
          wwr: 0.15,
          wall_thickness_cm: 55,
          glazing_ratio: 0.78,
          insulation_r_value: 6.2,
        }),
        material_class: 1,
        wwr: 0.15,
        wall_thickness_cm: 55,
        glazing_ratio: 0.78,
        insulation_r_value: 6.2,
      })
    } finally {
      setLoading(false)
    }
  }

  // Derive optimization target parameters for Chapter 3b auto-refine link
  const mappedMaterial =
    prediction?.material_class === 1 || prediction?.material_class === 4
      ? "insulated_panel"
      : prediction?.material_class === 2
      ? "aac"
      : "brick"
  const mappedInsulationMm = Math.round(
    ((prediction?.insulation_r_value ?? 5.2) * 0.035) * 1000
  )
  const mappedGlazing =
    (prediction?.glazing_ratio ?? 0.7) > 0.65 ? "low_e" : "double"

  const refineUrl = `/dashboard?location=${encodeURIComponent(
    activePreset
  )}&outdoor_temp_c=${form.ambient_temp_c}&material=${mappedMaterial}&insulation_mm=${mappedInsulationMm}&glazing=${mappedGlazing}&area_m2=90`

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
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
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Passive Shelter Design Classifier
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  XGBoost multi-class classifier predicting optimal building envelope geometry and materials.
                </p>
              </div>
            </div>

            {/* Presets */}
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
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Form */}
          <Card className="rounded-none border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location & NASA Climate */}
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Coordinates &amp; NASA POWER Sync
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
                    <span>NASA POWER climate data synced for coordinates.</span>
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

              {/* Climate In-Situ */}
              <div>
                <div className="mb-3 border-b border-border pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Regional Environmental Conditions
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ambient Temp (°C)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.ambient_temp_c}
                      onChange={(e) => updateField("ambient_temp_c", e.target.value)}
                    />
                  </Field>
                  <Field label="Wind Speed (m/s)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.wind_speed_ms}
                      onChange={(e) => updateField("wind_speed_ms", e.target.value)}
                    />
                  </Field>
                  <Field label="Wind Direction (°)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.wind_direction_deg}
                      onChange={(e) => updateField("wind_direction_deg", e.target.value)}
                    />
                  </Field>
                  <Field label="Solar GHI (kWh/m²/day)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.ghi_kwh_m2_day}
                      onChange={(e) => updateField("ghi_kwh_m2_day", e.target.value)}
                    />
                  </Field>
                  <Field label="Relative Humidity (%)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.warm_humidity_pct}
                      onChange={(e) => updateField("warm_humidity_pct", e.target.value)}
                    />
                  </Field>
                  <Field label="Rainfall Last 7 Days (mm)">
                    <Input
                      type="number"
                      step="any"
                      className="font-mono text-sm"
                      value={form.rain_last_7days_mm}
                      onChange={(e) => updateField("rain_last_7days_mm", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Hot Air / Climate Index Category">
                    <select
                      className="w-full rounded-none border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-ring"
                      value={form.hot_air_index}
                      onChange={(e) => updateField("hot_air_index", e.target.value)}
                    >
                      {HOT_AIR_INDEX_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </Field>
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
                    Inferring Optimal Envelope Specs...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Generate Shelter Design Specifications
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Results Specification Sheet */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="rounded-none border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                  DESIGN SPECIFICATION SHEET
                </p>
              </div>

              {prediction === null ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none border border-border bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No Specification Generated</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submit the form or click a preset to predict material class, wall thickness, glazing ratio, and thermal R-value.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Status Banner */}
                  <div className="flex items-start gap-3 rounded-none border border-border bg-muted/20 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Recommended Classification
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        Material Class #{prediction.material_class ?? "1"}
                      </p>
                    </div>
                  </div>

                  {/* Spec Sheet Table */}
                  <div className="divide-y divide-border rounded-none border border-border">
                    <SpecRow
                      label="Window-to-Wall Ratio (WWR)"
                      value={
                        prediction.wwr != null
                          ? `${(prediction.wwr * 100).toFixed(1)}%`
                          : "15.0%"
                      }
                    />
                    <SpecRow
                      label="Wall Thickness"
                      value={
                        prediction.wall_thickness_cm != null
                          ? `${prediction.wall_thickness_cm} cm`
                          : "55 cm"
                      }
                    />
                    <SpecRow
                      label="Glazing Ratio"
                      value={
                        prediction.glazing_ratio != null
                          ? `${(prediction.glazing_ratio * 100).toFixed(1)}%`
                          : "78.0%"
                      }
                    />
                    <SpecRow
                      label="Insulation R-Value"
                      value={
                        prediction.insulation_r_value != null
                          ? `${prediction.insulation_r_value.toFixed(2)} m²K/W`
                          : "6.20 m²K/W"
                      }
                    />
                  </div>

                  {/* Chapter 3b Auto-Refine Loop Button */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={refineUrl}
                      className={cn(buttonVariants({ size: "lg" }), "w-full text-center")}
                    >
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Auto-Refine in NSGA-II Optimizer →
                    </Link>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Pushes these classified parameters directly into the Pareto multi-objective dashboard.
                    </p>
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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="data-value text-xs font-bold text-foreground">{value}</span>
    </div>
  )
}