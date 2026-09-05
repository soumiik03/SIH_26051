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
} from "lucide-react"

import { predictIndoorTemp, type IndoorTempRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
  latitude: "",
  longitude: "",
  month: String(new Date().getMonth() + 1),
  hour: String(new Date().getHours()),
  outdoor_temperature_C: "",
  wind_speed_mps: "",
  thermal_mass_MJ_m3K: "",
  insulation_r_value_m2K_W: "",
  glazing: "",
  GHI_W_m2: "",
  best_shelter_material: "Stone",
}

function getComfortStatus(temperature: number) {
  if (temperature < 15) {
    return {
      label: "Cold",
      description:
        "The predicted indoor temperature is below the assumed comfort range.",
    }
  }

  if (temperature < 18) {
    return {
      label: "Cool",
      description:
        "The indoor temperature is slightly below the assumed comfort range.",
    }
  }

  if (temperature <= 24) {
    return {
      label: "Comfortable",
      description:
        "The predicted temperature falls within the assumed comfort range.",
    }
  }

  if (temperature <= 27) {
    return {
      label: "Warm",
      description:
        "The indoor temperature is slightly above the assumed comfort range.",
    }
  }

  return {
    label: "Hot",
    description:
      "The predicted indoor temperature is above the assumed comfort range.",
  }
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

export default function IndoorTemperaturePage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<number | null>(null)

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
      insulation_r_value_m2K_W: Number(
        form.insulation_r_value_m2K_W
      ),
      glazing: Number(form.glazing),
      best_shelter_material: form.best_shelter_material,

      outdoor_temperature_C: optionalNumber(
        form.outdoor_temperature_C
      ),
      wind_speed_mps: optionalNumber(form.wind_speed_mps),
      GHI_W_m2: optionalNumber(form.GHI_W_m2),
    }

    try {
      setLoading(true)

      const response = await predictIndoorTemp(request)

      setResult(response.indoor_temperature_C)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("The prediction request failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const comfort =
    result !== null ? getComfortStatus(result) : null

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
              <Thermometer className="h-6 w-6 text-accent" />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Indoor Temperature
              </h1>

              <p className="mt-2 max-w-2xl text-muted-foreground">
                Predict the expected indoor temperature of the
                shelter using location, time, material, insulation
                and glazing parameters.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
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

              {/* Time */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Time
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Specify the month and hour for the prediction.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Month"
                    required
                    description="1–12"
                  >
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      step="1"
                      value={form.month}
                      onChange={(e) =>
                        updateField(
                          "month",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Hour"
                    required
                    description="0–23"
                  >
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      step="1"
                      value={form.hour}
                      onChange={(e) =>
                        updateField(
                          "hour",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                </div>
              </section>

              <div className="border-t border-border" />

              {/* Shelter Properties */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Shelter Properties
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Enter the thermal properties of the proposed
                    shelter.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Thermal Mass"
                    required
                    description="MJ/m³K"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.thermal_mass_MJ_m3K}
                      onChange={(e) =>
                        updateField(
                          "thermal_mass_MJ_m3K",
                          e.target.value
                        )
                      }
                      placeholder="1.50"
                    />
                  </Field>

                  <Field
                    label="Insulation R-value"
                    required
                    description="m²K/W"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.insulation_r_value_m2K_W}
                      onChange={(e) =>
                        updateField(
                          "insulation_r_value_m2K_W",
                          e.target.value
                        )
                      }
                      placeholder="3.50"
                    />
                  </Field>

                  <Field
                    label="Glazing"
                    required
                    description="Fraction: 0–1"
                  >
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.glazing}
                      onChange={(e) =>
                        updateField(
                          "glazing",
                          e.target.value
                        )
                      }
                      placeholder="0.20"
                    />
                  </Field>

                  <Field
                    label="Shelter Material"
                    required
                  >
                    <select
                      value={form.best_shelter_material}
                      onChange={(e) =>
                        updateField(
                          "best_shelter_material",
                          e.target.value
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Stone">
                        Stone
                      </option>

                      <option value="Rammed_Earth">
                        Rammed Earth
                      </option>

                      <option value="Mud_Brick">
                        Mud Brick
                      </option>

                      <option value="Concrete">
                        Concrete
                      </option>
                    </select>
                  </Field>

                </div>
              </section>

              <div className="border-t border-border" />

              {/* Climate Data */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Climate Data
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    These values are optional and can be
                    automatically populated from available climate
                    data.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">

                  <Field
                    label="Outdoor Temperature"
                    description="°C"
                  >
                    <Input
                      type="number"
                      step="any"
                      value={form.outdoor_temperature_C}
                      onChange={(e) =>
                        updateField(
                          "outdoor_temperature_C",
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
                      value={form.wind_speed_mps}
                      onChange={(e) =>
                        updateField(
                          "wind_speed_mps",
                          e.target.value
                        )
                      }
                      placeholder="3.5"
                    />
                  </Field>

                  <Field
                    label="GHI"
                    description="W/m²"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.GHI_W_m2}
                      onChange={(e) =>
                        updateField(
                          "GHI_W_m2",
                          e.target.value
                        )
                      }
                      placeholder="450"
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
                    Predicting indoor temperature...
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

          {/* Result */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden">

              <div className="border-b border-border bg-muted/30 p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Prediction Result
                </p>
              </div>

              {result === null ? (

                <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">

                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
                    <Thermometer className="h-7 w-7 text-muted-foreground" />
                  </div>

                  <h3 className="font-semibold">
                    No prediction yet
                  </h3>

                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Fill in the shelter parameters and run the
                    prediction to see the estimated indoor
                    temperature.
                  </p>

                </div>

              ) : (

                <div className="p-8">

                  <div className="text-center">

                    <p className="text-sm text-muted-foreground">
                      Estimated Indoor Temperature
                    </p>

                    <div className="mt-3 text-6xl font-bold tracking-tight">
                      {result.toFixed(1)}

                      <span className="ml-1 text-3xl font-medium text-muted-foreground">
                        °C
                      </span>
                    </div>

                  </div>

                  <div className="mt-8 rounded-lg border border-border p-5">

                    <div className="flex items-center gap-3">

                      <CheckCircle2 className="h-5 w-5 text-accent" />

                      <div>

                        <p className="text-sm text-muted-foreground">
                          Comfort assessment
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {comfort?.label}
                        </p>

                      </div>

                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {comfort?.description}
                    </p>

                  </div>

                  <div className="mt-6 text-center text-xs text-muted-foreground">
                    Comfort bands are provided as a
                    visualization of the predicted temperature.
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