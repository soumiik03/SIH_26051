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
} from "lucide-react"

import { predictDesign, type DesignPredictionRequest } from "@/lib/api"
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
  latitude: "",
  longitude: "",
  ambient_temp_c: "",
  wind_speed_ms: "",
  wind_direction_deg: "",
  ghi_kwh_m2_day: "",
  warm_humidity_pct: "",
  hot_air_index: "",
  rain_last_7days_mm: "",
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

export default function DesignPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState("")


  const [prediction, setPrediction] = useState<{
    status: string
    shelter_material_and_design: string
    material_class?: number | null
    wwr?: number | null
    wall_thickness_cm?: number | null
    glazing_ratio?: number | null
    insulation_r_value?: number | null
  } | null>(null)

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function useMyLocation() {
    setError("")

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.")
      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }))

        setLocationLoading(false)
      },
      (locationError) => {
        setLocationLoading(false)

        switch (locationError.code) {
          case locationError.PERMISSION_DENIED:
            setError(
              "Location permission was denied. Please allow location access or enter the coordinates manually."
            )
            break

          case locationError.POSITION_UNAVAILABLE:
            setError("Your current location could not be determined.")
            break

          case locationError.TIMEOUT:
            setError("The location request timed out. Please try again.")
            break

          default:
            setError("Unable to retrieve your location.")
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
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
      hot_air_index:
        form.hot_air_index.trim() === ""
          ? undefined
          : form.hot_air_index,
      rain_last_7days_mm: optionalNumber(form.rain_last_7days_mm),
    }

    try {
      setLoading(true)

      const response = await predictDesign(request)

      setPrediction(response)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("The design prediction failed. Please try again.")
      }
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
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
              <Building2 className="h-6 w-6 text-accent" />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Shelter Design
              </h1>

              <p className="mt-2 max-w-2xl text-muted-foreground">
                Generate a shelter design recommendation based on
                location and environmental conditions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Form */}
          <Card className="p-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >

              {/* Location */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Location
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Use your current coordinates or enter them
                    manually.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Latitude"
                    required
                    description="Range: -90 to 90"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={form.latitude}
                      onChange={(e) =>
                        updateField(
                          "latitude",
                          e.target.value
                        )
                      }
                      placeholder="34.1526"
                    />
                  </Field>

                  <Field
                    label="Longitude"
                    required
                    description="Range: -180 to 180"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={form.longitude}
                      onChange={(e) =>
                        updateField(
                          "longitude",
                          e.target.value
                        )
                      }
                      placeholder="77.5771"
                    />
                  </Field>

                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={useMyLocation}
                  disabled={locationLoading || loading}
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Use my location
                    </>
                  )}
                </Button>
              </section>

              <div className="border-t border-border" />

              {/* Climate Conditions */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Environmental Conditions
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Enter available environmental data. These
                    values are optional.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Ambient Temperature"
                    description="°C"
                  >
                    <Input
                      type="number"
                      step="any"
                      value={form.ambient_temp_c}
                      onChange={(e) =>
                        updateField(
                          "ambient_temp_c",
                          e.target.value
                        )
                      }
                      placeholder="-10"
                    />
                  </Field>

                  <Field
                    label="Wind Speed"
                    description="m/s"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.wind_speed_ms}
                      onChange={(e) =>
                        updateField(
                          "wind_speed_ms",
                          e.target.value
                        )
                      }
                      placeholder="3.5"
                    />
                  </Field>

                  <Field
                    label="Wind Direction"
                    description="Degrees: 0–360"
                  >
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="360"
                      value={form.wind_direction_deg}
                      onChange={(e) =>
                        updateField(
                          "wind_direction_deg",
                          e.target.value
                        )
                      }
                      placeholder="180"
                    />
                  </Field>

                  <Field
                    label="Solar Radiation"
                    description="GHI kWh/m²/day"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.ghi_kwh_m2_day}
                      onChange={(e) =>
                        updateField(
                          "ghi_kwh_m2_day",
                          e.target.value
                        )
                      }
                      placeholder="5.2"
                    />
                  </Field>

                  <Field
                    label="Warm Humidity"
                    description="%"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={form.warm_humidity_pct}
                      onChange={(e) =>
                        updateField(
                          "warm_humidity_pct",
                          e.target.value
                        )
                      }
                      placeholder="35"
                    />
                  </Field>

                  <Field
                    label="Rainfall"
                    description="Last 7 days, mm"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.rain_last_7days_mm}
                      onChange={(e) =>
                        updateField(
                          "rain_last_7days_mm",
                          e.target.value
                        )
                      }
                      placeholder="2"
                    />
                  </Field>

                </div>

                <div className="mt-4">
                  <Field
                    label="Hot Air Index"
                    description="Optional environmental classification"
                  >
                    <Input
                      type="text"
                      value={form.hot_air_index}
                      onChange={(e) =>
                        updateField(
                          "hot_air_index",
                          e.target.value
                        )
                      }
                      placeholder="Low"
                    />
                  </Field>
                </div>
              </section>

              {/* Error */}
              {error && (
                <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

                  <div>
                    <p className="font-medium text-destructive">
                      Prediction failed
                    </p>

                    <p className="mt-1 text-muted-foreground">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || locationLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating design...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Generate Shelter Design
                  </>
                )}
              </Button>

            </form>
          </Card>

          {/* Result */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden">

              <div className="border-b border-border bg-muted/30 p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Recommended Design
                </p>
              </div>

              {prediction === null ? (

                <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">

                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  </div>

                  <h3 className="font-semibold">
                    No design generated
                  </h3>

                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Enter the location and available environmental
                    conditions to generate a shelter recommendation.
                  </p>

                </div>

              ) : (

                <div className="p-6">

                  <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Recommended configuration
                      </p>

                      <p className="mt-1 font-semibold">
                        {prediction.shelter_material_and_design}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Design Specifications
                    </h3>

                    <div className="divide-y divide-border rounded-lg border border-border">

                      <SpecRow
                        label="Material Class"
                        value={
                          prediction.material_class !== null &&
                          prediction.material_class !== undefined
                            ? String(prediction.material_class)
                            : "—"
                        }
                      />

                      <SpecRow
                        label="Wall-to-Window Ratio"
                        value={
                          prediction.wwr !== null &&
                          prediction.wwr !== undefined
                            ? `${(prediction.wwr * 100).toFixed(1)}%`
                            : "—"
                        }
                      />

                      <SpecRow
                        label="Wall Thickness"
                        value={
                          prediction.wall_thickness_cm !== null &&
                          prediction.wall_thickness_cm !== undefined
                            ? `${prediction.wall_thickness_cm} cm`
                            : "—"
                        }
                      />

                      <SpecRow
                        label="Glazing Ratio"
                        value={
                          prediction.glazing_ratio !== null &&
                          prediction.glazing_ratio !== undefined
                            ? `${(
                                prediction.glazing_ratio * 100
                              ).toFixed(1)}%`
                            : "—"
                        }
                      />

                      <SpecRow
                        label="Insulation R-value"
                        value={
                          prediction.insulation_r_value !== null &&
                          prediction.insulation_r_value !== undefined
                            ? prediction.insulation_r_value.toFixed(2)
                            : "—"
                        }
                      />

                    </div>
                  </div>

                  <p className="mt-5 text-xs leading-5 text-muted-foreground">
                    These specifications represent the model's
                    recommended shelter configuration for the supplied
                    environmental conditions.
                  </p>

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
  description,
  children,
}: {
  label: string
  required?: boolean
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium">
          {label}

          {required && (
            <span className="ml-1 text-destructive">
              *
            </span>
          )}
        </label>

        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  )
}

function SpecRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-right text-sm font-medium">
        {value}
      </span>
    </div>
  )
}