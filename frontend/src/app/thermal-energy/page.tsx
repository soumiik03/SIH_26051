"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

import {
  predictThermalEnergy,
  type ThermalEnergyRequest,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type FormState = {
  latitude: string
  longitude: string
  hour: string
  shelter_volume_m3: string
  wall_material: string
  wall_thickness_cm: string
  glazing_ratio: string
  insulation_r_value: string
  ghi_w_m2: string
  ambient_temp_c: string
  thermal_mass_kj_k: string
}

const initialForm: FormState = {
  latitude: "",
  longitude: "",
  hour: String(new Date().getHours()),
  shelter_volume_m3: "",
  wall_material: "Stone",
  wall_thickness_cm: "",
  glazing_ratio: "",
  insulation_r_value: "",
  ghi_w_m2: "",
  ambient_temp_c: "",
  thermal_mass_kj_k: "",
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

export default function ThermalEnergyPage() {
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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError("")
    setResult(null)

    if (
      !form.latitude ||
      !form.longitude ||
      !form.shelter_volume_m3 ||
      !form.wall_material ||
      !form.wall_thickness_cm ||
      !form.glazing_ratio ||
      !form.insulation_r_value
    ) {
      setError("Please fill in all required fields.")
      return
    }

    const request: ThermalEnergyRequest = {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),

      shelter_volume_m3: Number(form.shelter_volume_m3),
      wall_material: form.wall_material,
      wall_thickness_cm: Number(form.wall_thickness_cm),
      glazing_ratio: Number(form.glazing_ratio),
      insulation_r_value: Number(form.insulation_r_value),

      hour: optionalNumber(form.hour),
      ghi_w_m2: optionalNumber(form.ghi_w_m2),
      ambient_temp_c: optionalNumber(form.ambient_temp_c),
      thermal_mass_kj_k: optionalNumber(form.thermal_mass_kj_k),
    }

    try {
      setLoading(true)

      const response = await predictThermalEnergy(request)

      setResult(response.thermal_energy_kwh)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "The thermal energy calculation failed. Please try again."
        )
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
              <Zap className="h-6 w-6 text-accent" />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Thermal Energy
              </h1>

              <p className="mt-2 max-w-2xl text-muted-foreground">
                Estimate the thermal energy requirements of the
                shelter using its geometry, materials, insulation
                and environmental conditions.
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

              {/* Shelter Geometry */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Shelter Geometry
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Provide the physical dimensions of the shelter.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Shelter Volume"
                    required
                    description="m³"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0.001"
                      value={form.shelter_volume_m3}
                      onChange={(e) =>
                        updateField(
                          "shelter_volume_m3",
                          e.target.value
                        )
                      }
                      placeholder="60"
                    />
                  </Field>

                  <Field
                    label="Wall Thickness"
                    required
                    description="cm"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0.001"
                      value={form.wall_thickness_cm}
                      onChange={(e) =>
                        updateField(
                          "wall_thickness_cm",
                          e.target.value
                        )
                      }
                      placeholder="45"
                    />
                  </Field>

                </div>
              </section>

              <div className="border-t border-border" />

              {/* Material & Insulation */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Materials and Insulation
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Specify the wall material and thermal
                    properties.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Wall Material"
                    required
                  >
                    <select
                      value={form.wall_material}
                      onChange={(e) =>
                        updateField(
                          "wall_material",
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

                  <Field
                    label="Glazing Ratio"
                    required
                    description="Fraction: 0–1"
                  >
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.glazing_ratio}
                      onChange={(e) =>
                        updateField(
                          "glazing_ratio",
                          e.target.value
                        )
                      }
                      placeholder="0.20"
                    />
                  </Field>

                  <Field
                    label="Insulation R-value"
                    required
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.insulation_r_value}
                      onChange={(e) =>
                        updateField(
                          "insulation_r_value",
                          e.target.value
                        )
                      }
                      placeholder="3.5"
                    />
                  </Field>

                  <Field
                    label="Thermal Mass"
                    description="kJ/K"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.thermal_mass_kj_k}
                      onChange={(e) =>
                        updateField(
                          "thermal_mass_kj_k",
                          e.target.value
                        )
                      }
                      placeholder="500"
                    />
                  </Field>

                </div>
              </section>

              <div className="border-t border-border" />

              {/* Environmental Conditions */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    Environmental Conditions
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Optional environmental inputs for the energy
                    estimate.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">

                  <Field
                    label="Hour"
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

                  <Field
                    label="Solar Radiation"
                    description="GHI, W/m²"
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.ghi_w_m2}
                      onChange={(e) =>
                        updateField(
                          "ghi_w_m2",
                          e.target.value
                        )
                      }
                      placeholder="450"
                    />
                  </Field>

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

                </div>
              </section>

              {/* Error */}
              {error && (
                <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

                  <div>
                    <p className="font-medium text-destructive">
                      Calculation failed
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
                    Calculating thermal energy...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Calculate Thermal Energy
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
                  Energy Estimate
                </p>
              </div>

              {result === null ? (

                <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">

                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
                    <Zap className="h-7 w-7 text-muted-foreground" />
                  </div>

                  <h3 className="font-semibold">
                    No estimate yet
                  </h3>

                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Enter the shelter properties and environmental
                    conditions to calculate the estimated thermal
                    energy requirement.
                  </p>

                </div>

              ) : (

                <div className="p-8">

                  <div className="text-center">

                    <p className="text-sm text-muted-foreground">
                      Estimated Thermal Energy
                    </p>

                    <div className="mt-3 text-6xl font-bold tracking-tight">
                      {result.toFixed(2)}

                      <span className="ml-2 text-3xl font-medium text-muted-foreground">
                        kWh
                      </span>
                    </div>

                  </div>

                  <div className="mt-8 rounded-lg border border-border p-5">

                    <div className="flex items-center gap-3">

                      <CheckCircle2 className="h-5 w-5 text-accent" />

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Energy context
                        </p>

                        <p className="mt-1 font-semibold">
                          Estimated thermal energy requirement
                        </p>
                      </div>

                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      This value represents the thermal energy
                      estimated by the model for the supplied shelter
                      configuration and environmental conditions.
                    </p>

                  </div>

                  <p className="mt-6 text-center text-xs text-muted-foreground">
                    The estimate is model-dependent and should be
                    interpreted together with the selected shelter
                    properties and environmental inputs.
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