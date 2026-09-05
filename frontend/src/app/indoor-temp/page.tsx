import Link from "next/link";
import { Thermometer, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Field names exactly as defined in backend/schemas/indoor_temp.py
const INPUTS = [
  { name: "latitude", note: "float, [-90, 90]" },
  { name: "longitude", note: "float, [-180, 180]" },
  { name: "month", note: "int [1, 12]" },
  { name: "hour", note: "int [0, 23]" },
  { name: "outdoor_temperature_C", note: "float, optional" },
  { name: "wind_speed_mps", note: "float ≥ 0, optional" },
  { name: "thermal_mass_MJ_m3K", note: "float, required" },
  { name: "insulation_r_value_m2K_W", note: "float, required" },
  { name: "glazing", note: "float [0, 1], required" },
  { name: "GHI_W_m2", note: "float, optional (auto-filled)" },
  { name: "best_shelter_material", note: "string (label-encoded)" },
];

const OUTPUTS = [
  { name: "indoor_temperature_C", note: "float (°C)" },
];

export default function IndoorTempPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Overview
          </Link>
          <div className="flex items-center gap-3">
            <Thermometer size={20} className="text-accent" />
            <h1 className="text-xl font-bold tracking-tight">
              Indoor Temperature Prediction
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Predict the hourly indoor temperature of a Ladakh shelter from
            design parameters and environmental conditions.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Coming-soon notice */}
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Form coming soon
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              This prediction flow is being built in Chapter 2d.
            </p>
          </CardContent>
        </Card>

        {/* Schema preview for the teammate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Inputs
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  POST /predict/indoor-temp
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {INPUTS.map(({ name, note }) => (
                  <li key={name} className="flex flex-wrap items-center gap-2">
                    <Badge variant="input">{name}</Badge>
                    <span className="text-xs text-muted-foreground/70">
                      {note}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Outputs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {OUTPUTS.map(({ name, note }) => (
                  <li key={name} className="flex flex-wrap items-center gap-2">
                    <Badge variant="output">{name}</Badge>
                    <span className="text-xs text-muted-foreground/70">
                      {note}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
