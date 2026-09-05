import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Field names exactly as defined in backend/schemas/design.py
const INPUTS = [
  { name: "latitude", note: "float, [-90, 90]" },
  { name: "longitude", note: "float, [-180, 180]" },
  { name: "ambient_temp_c", note: "float, optional" },
  { name: "wind_speed_ms", note: "float ≥ 0, optional" },
  { name: "wind_direction_deg", note: "int [0, 360], optional" },
  { name: "ghi_kwh_m2_day", note: "float ≥ 0, optional" },
  { name: "warm_humidity_pct", note: "float [0, 100], optional" },
  { name: "hot_air_index", note: "string, optional" },
  { name: "rain_last_7days_mm", note: "float ≥ 0, optional" },
];

const OUTPUTS = [
  { name: "shelter_material_and_design", note: "string (raw JSON)" },
  { name: "material_class", note: "int | null" },
  { name: "wwr", note: "float | null" },
  { name: "wall_thickness_cm", note: "int | null" },
  { name: "glazing_ratio", note: "float | null" },
  { name: "insulation_r_value", note: "float | null" },
];

export default function DesignPage() {
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
            <Building2 size={20} className="text-accent" />
            <h1 className="text-xl font-bold tracking-tight">
              Shelter Design Optimization
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Predict the optimal shelter material, window-to-wall ratio, wall
            thickness, glazing ratio, and insulation R-value for a Ladakh
            location.
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
                  POST /predict/design
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
