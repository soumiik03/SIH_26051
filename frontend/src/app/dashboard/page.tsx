"use client";

import Link from "next/link";
import { useState } from "react";
import { jsPDF } from "jspdf";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Design = {
  material: "brick" | "aac" | "insulated_panel";
  insulation_mm: number;
  glazing: "single" | "double" | "low_e";
  area_m2: number;
};

type ParetoPoint = {
  design: Design;
  daily_heating_kwh: number;
  estimated_install_cost: number;
};

type DashboardResult = {
  status: string;
  baseline: {
    indoor_temperature_24h: { hour: number; outdoor: number; indoor: number }[];
    thermal_energy: { daily_heating_kwh: number; annual_heating_kwh: number };
    comfort: { minimum_indoor_c: number; hours_below_target: number };
    cost: { estimated_install_cost: number };
  };
  pareto_front: ParetoPoint[];
};

const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

const initialDesign: Design = {
  material: "insulated_panel",
  insulation_mm: 150,
  glazing: "low_e",
  area_m2: 85,
};

export default function DashboardPage() {
  const [location, setLocation] = useState("Leh");
  const [outdoorTemp, setOutdoorTemp] = useState(-6);
  const [design, setDesign] = useState<Design>(initialDesign);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function runDashboard(nextDesign = design) {
    setLoading(true);
    setNotice("");

    const body = {
      location,
      outdoor_temp_c: outdoorTemp,
      solar_kwh_m2: 5.4,
      occupants: 4,
      target_temp_c: 21,
      population_size: 40,
      generations: 30,
      design: nextDesign,
    };

    try {
      const response = await fetch(`${API}/optimization/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error("Live API unavailable");
      setResult(await response.json());
    } catch {
      try {
        const fallback = await fetch(`${API}/optimization/golden/Leh`);
        if (!fallback.ok) throw new Error();
        const golden = await fallback.json();

        setResult({
          status: "fallback",
          baseline: golden.result,
          pareto_front: [],
        });
        setNotice("Demo fallback used: verified Leh scenario.");
      } catch {
        setNotice("Unable to reach the live API or demo fallback.");
      }
    } finally {
      setLoading(false);
    }
  }

  function applyPareto(point: ParetoPoint) {
    setDesign(point.design);
    runDashboard(point.design);
  }

  function exportPdf() {
    if (!result) return;

    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Shelter Optimization Report", 18, 20);
    pdf.setFontSize(11);

    pdf.text(
      [
        `Location: ${location}`,
        `Outdoor temperature: ${outdoorTemp} C`,
        `Material: ${design.material}`,
        `Insulation: ${design.insulation_mm} mm`,
        `Glazing: ${design.glazing}`,
        `Area: ${design.area_m2} m2`,
        "",
        `Minimum indoor temperature: ${result.baseline.comfort.minimum_indoor_c} C`,
        `Hours below target: ${result.baseline.comfort.hours_below_target}`,
        `Daily heating demand: ${result.baseline.thermal_energy.daily_heating_kwh} kWh`,
        `Estimated installation cost: INR ${result.baseline.cost.estimated_install_cost.toLocaleString()}`,
      ],
      18,
      36,
      { lineHeightFactor: 1.7 }
    );

    pdf.save("shelter-optimization-report.pdf");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Overview
          </Link>
          <h1 className="mt-4 text-2xl font-bold">
            Results Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Unified comfort, energy, cost, and NSGA-II Pareto optimization.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="grid gap-3 rounded-sm border border-border bg-card p-4 md:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Location
            <input
              className="mt-1 w-full border border-input bg-background p-2 text-foreground"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>

          <label className="text-xs text-muted-foreground">
            Outdoor temperature (°C)
            <input
              className="mt-1 w-full border border-input bg-background p-2 text-foreground"
              type="number"
              value={outdoorTemp}
              onChange={(event) => setOutdoorTemp(Number(event.target.value))}
            />
          </label>

          <label className="text-xs text-muted-foreground">
            Insulation (mm)
            <input
              className="mt-1 w-full border border-input bg-background p-2 text-foreground"
              type="number"
              value={design.insulation_mm}
              onChange={(event) =>
                setDesign({ ...design, insulation_mm: Number(event.target.value) })
              }
            />
          </label>

          <button
            className="bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            disabled={loading}
            onClick={() => runDashboard()}
          >
            {loading ? "Optimizing..." : "Run dashboard + auto-refine"}
          </button>

          <button
            className="border border-border px-4 py-2 text-sm font-semibold"
            disabled={!result}
            onClick={exportPdf}
          >
            Export PDF report
          </button>
        </section>

        {notice && (
          <p className="border border-warning bg-warning/15 p-3 text-sm text-warning">
            {notice}
          </p>
        )}

        {result && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric
                label="Minimum indoor"
                value={`${result.baseline.comfort.minimum_indoor_c} °C`}
              />
              <Metric
                label="Hours below target"
                value={String(result.baseline.comfort.hours_below_target)}
              />
              <Metric
                label="Daily heating"
                value={`${result.baseline.thermal_energy.daily_heating_kwh} kWh`}
              />
              <Metric
                label="Installation cost"
                value={`₹${result.baseline.cost.estimated_install_cost.toLocaleString()}`}
              />
            </section>

            <section className="border border-border bg-card p-5">
              <h2 className="font-semibold">Indoor temperature over 24 hours</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.baseline.indoor_temperature_24h}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" label={{ value: "Hour", position: "insideBottom", offset: -5 }} />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="outdoor" stroke="#f59e0b" name="Outdoor °C" />
                    <Line dataKey="indoor" stroke="#3b82f6" name="Indoor °C" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="border border-border bg-card p-5">
              <h2 className="font-semibold">Pareto front: heating demand vs cost</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a design trade-off below to apply it and automatically rerun the dashboard.
              </p>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid />
                    <XAxis
                      dataKey="estimated_install_cost"
                      name="Cost"
                      tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                    />
                    <YAxis dataKey="daily_heating_kwh" name="Heating kWh" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={result.pareto_front} fill="#22c55e" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {result.pareto_front.slice(0, 8).map((point, index) => (
                  <button
                    key={`${point.design.material}-${point.design.insulation_mm}-${index}`}
                    className="border border-border p-3 text-left text-sm hover:border-accent"
                    onClick={() => applyPareto(point)}
                  >
                    <strong>{point.design.material}</strong> · {point.design.insulation_mm} mm · {point.design.glazing}
                    <br />
                    ₹{point.estimated_install_cost.toLocaleString()} · {point.daily_heating_kwh} kWh/day
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold data-value">{value}</p>
    </div>
  );
}