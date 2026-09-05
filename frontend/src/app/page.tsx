import Link from "next/link";
import { Thermometer, Building2, Zap, ArrowRight, MapPin } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Field definitions (exact field names from backend schemas) ───────────────

const DESIGN_INPUTS = [
  "latitude",
  "longitude",
  "ambient_temp_c",
  "wind_speed_ms",
  "wind_direction_deg",
  "ghi_kwh_m2_day",
  "warm_humidity_pct",
  "hot_air_index",
  "rain_last_7days_mm",
];

const DESIGN_OUTPUTS = [
  "shelter_material_and_design",
  "material_class",
  "wwr",
  "wall_thickness_cm",
  "glazing_ratio",
  "insulation_r_value",
];

const INDOOR_TEMP_INPUTS = [
  "latitude",
  "longitude",
  "month",
  "hour",
  "outdoor_temperature_C",
  "wind_speed_mps",
  "thermal_mass_MJ_m3K",
  "insulation_r_value_m2K_W",
  "glazing",
  "GHI_W_m2",
  "best_shelter_material",
];

const INDOOR_TEMP_OUTPUTS = ["indoor_temperature_C"];

const THERMAL_ENERGY_INPUTS = [
  "latitude",
  "longitude",
  "hour",
  "shelter_volume_m3",
  "wall_material",
  "wall_thickness_cm",
  "glazing_ratio",
  "insulation_r_value",
  "ghi_w_m2",
  "ambient_temp_c",
  "thermal_mass_kj_k",
];

const THERMAL_ENERGY_OUTPUTS = ["thermal_energy_kwh"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldList({
  fields,
  variant,
}: {
  fields: string[];
  variant: "input" | "output";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <Badge key={f} variant={variant}>
          {f}
        </Badge>
      ))}
    </div>
  );
}

function FieldSection({
  inputs,
  outputs,
}: {
  inputs: string[];
  outputs: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Inputs
        </p>
        <FieldList fields={inputs} variant="input" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Outputs
        </p>
        <FieldList fields={outputs} variant="output" />
      </div>
    </div>
  );
}

// ─── Tool cards ───────────────────────────────────────────────────────────────

interface ToolCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

function ToolCard({
  href,
  icon,
  title,
  description,
  inputs,
  outputs,
}: ToolCardProps) {
  return (
    <Link href={href} className="group block focus:outline-none" tabIndex={-1}>
      <Card className="h-full transition-colors duration-150 hover:border-accent group-focus-visible:border-ring group-focus-visible:ring-2 group-focus-visible:ring-ring/50">
        <CardHeader className="pb-0">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="text-accent">{icon}</span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <FieldSection inputs={inputs} outputs={outputs} />
        </CardContent>

        <CardFooter className="mt-auto">
          <span className="flex items-center gap-1.5 text-xs font-medium text-accent transition-gap duration-150 group-hover:gap-2.5">
            Open tool
            <ArrowRight size={13} />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {/* Location chip */}
          <div className="mb-5 inline-flex items-center gap-1.5 border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <MapPin size={11} className="text-accent" />
            <span className="font-mono">Ladakh, India · 34°N 77°E</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Passive Thermal Comfort
            <br />
            <span className="text-accent">Design &amp; Optimization</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            ML-powered thermal analysis platform for cold-climate shelters in
            the Ladakh region. Predict indoor temperatures, optimise shelter
            design parameters, and estimate hourly heating demand — all from
            local climate inputs.
          </p>

          <p className="mt-2 text-xs text-muted-foreground/60">
            Smart India Hackathon 2026 · Problem Statement 26051
          </p>
        </div>
      </header>

      {/* ── Tool cards ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Prediction Tools
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ToolCard
            href="/indoor-temp"
            icon={<Thermometer size={18} />}
            title="Indoor Temperature"
            description="Predict hourly inside-shelter temperature from design parameters and live climate inputs."
            inputs={INDOOR_TEMP_INPUTS}
            outputs={INDOOR_TEMP_OUTPUTS}
          />

          <ToolCard
            href="/design"
            icon={<Building2 size={18} />}
            title="Shelter Design"
            description="Get the optimal shelter material, window-to-wall ratio, wall thickness, glazing ratio, and insulation R-value for a given location."
            inputs={DESIGN_INPUTS}
            outputs={DESIGN_OUTPUTS}
          />

          <ToolCard
            href="/thermal-energy"
            icon={<Zap size={18} />}
            title="Thermal Energy"
            description="Estimate hourly heating demand (kWh) for a shelter volume given its construction materials and climate conditions."
            inputs={THERMAL_ENERGY_INPUTS}
            outputs={THERMAL_ENERGY_OUTPUTS}
          />
        </div>
      </main>
    </div>
  );
}
