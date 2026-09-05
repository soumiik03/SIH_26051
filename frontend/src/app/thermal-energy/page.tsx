import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Field names exactly as defined in backend/schemas/thermal_energy.py
const INPUTS = [
  { name: "latitude", note: "float, [-90, 90]" },
  { name: "longitude", note: "float, [-180, 180]" },
  { name: "hour", note: "int [0, 23], optional" },
  { name: "shelter_volume_m3", note: "float > 0, required" },
  { name: "wall_material", note: "Stone | Rammed_Earth | Mud_Brick | Concrete" },
  { name: "wall_thickness_cm", note: "float > 0, required" },
  { name: "glazing_ratio", note: "float [0, 1], required" },
  { name: "insulation_r_value", note: "float ≥ 0, required" },
  { name: "ghi_w_m2", note: "float ≥ 0, optional" },
  { name: "ambient_temp_c", note: "float, optional" },
  { name: "thermal_mass_kj_k", note: "float > 0, optional" },
];

const OUTPUTS = [
  { name: "thermal_energy_kwh", note: "float (kWh)" },
];

export default function ThermalEnergyPage() {
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
            <Zap size={20} className="text-accent" />
            <h1 className="text-xl font-bold tracking-tight">
              Thermal Energy Estimation
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimate the hourly heating demand (kWh) for a Ladakh shelter
            volume given construction materials and climate conditions.
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
                  POST /predict/thermal-energy
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
