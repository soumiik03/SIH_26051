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
  CloudSun,
} from "lucide-react"

import {
  getClimate,
} from "@/lib/api"
import { predictDesign, withWallMaterial, type DesignPredictionRequest, type DesignResult } from "@/lib/api/design"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  ambient_temp_c: "",
  wind_speed_ms: "",
  wind_direction_deg: "",
  ghi_kwh_m2_day: "",
  warm_humidity_pct: "",
  hot_air_index: "",
  rain_last_7days_mm: "",
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
  const [showOptionalClimate, setShowOptionalClimate] = useState(false)
  const [error, setError] = useState("")
  const [prediction, setPrediction] = useState<DesignResult | null>(null)

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
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
      () => {
        setLocationLoading(false)
        setError("Unable to retrieve GPS coordinates. You can select a golden preset above.")
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setError("")
    setPrediction(null)

    const values = {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      ambient: optionalNumber(form.ambient_temp_c),
      windSpeed: optionalNumber(form.wind_speed_ms),
      windDirection: optionalNumber(form.wind_direction_deg),
      ghi: optionalNumber(form.ghi_kwh_m2_day),
      humidity: optionalNumber(form.warm_humidity_pct),
      rain: optionalNumber(form.rain_last_7days_mm),
    }
    if (!Number.isFinite(values.latitude) || values.latitude < -90 || values.latitude > 90 || !Number.isFinite(values.longitude) || values.longitude < -180 || values.longitude > 180) {
      setError("Enter a valid latitude (-90 to 90) and longitude (-180 to 180).")
      return
    }
    if (values.ambient !== undefined && !Number.isFinite(values.ambient)) {
      setError("Ambient temperature must be a valid number.")
      return
    }
    if (values.windSpeed !== undefined && (!Number.isFinite(values.windSpeed) || values.windSpeed < 0)) {
      setError("Wind speed cannot be negative.")
      return
    }
    if (values.windDirection !== undefined && (!Number.isFinite(values.windDirection) || values.windDirection < 0 || values.windDirection > 360)) {
      setError("Wind direction must be between 0 and 360 degrees.")
      return
    }
    if (values.ghi !== undefined && (!Number.isFinite(values.ghi) || values.ghi < 0) || values.humidity !== undefined && (!Number.isFinite(values.humidity) || values.humidity < 0 || values.humidity > 100) || values.rain !== undefined && (!Number.isFinite(values.rain) || values.rain < 0)) {
      setError("GHI and rainfall cannot be negative; humidity must be between 0 and 100%.")
      return
    }

    const request: DesignPredictionRequest = {
      latitude: values.latitude,
      longitude: values.longitude,
      ambient_temp_c: values.ambient,
      wind_speed_ms: values.windSpeed,
      wind_direction_deg: values.windDirection,
      ghi_kwh_m2_day: values.ghi,
      warm_humidity_pct: values.humidity,
      hot_air_index: form.hot_air_index || null,
      rain_last_7days_mm: values.rain,
    }

    try {
      setLoading(true)
      const response = withWallMaterial(await predictDesign(request))
      setPrediction(response)
      sessionStorage.setItem("thermal-design-result", JSON.stringify(response))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Design prediction failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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

                <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showOptionalClimate} onChange={(e) => setShowOptionalClimate(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Add environmental details manually</label>
                {showOptionalClimate && <div className="grid grid-cols-2 gap-4">
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
                </div>}

                {showOptionalClimate && <div className="mt-4">
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
                </div>}
              </div>

              {error && (
                <div className="flex items-center gap-2 border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                  <Button type="button" variant="outline" size="xs" className="ml-auto" onClick={() => void handleSubmit()} disabled={loading}>
                    Retry
                  </Button>
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
                        {prediction.material_name ?? `Design profile class ${prediction.material_class}`}
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

                  <div className="space-y-3 pt-2">
                    <div className="border border-border p-3">
                      <p className="text-xs font-mono text-muted-foreground">Structured result ready for the next optimization chapter.</p>
                      Auto-Refine in NSGA-II Optimizer →
                    </div>
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setPrediction(null)}>
                      Edit inputs / try another location
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">
                      The structured specification can be passed directly to later chapters.
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
