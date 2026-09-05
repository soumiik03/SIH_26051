import Link from "next/link";

export default function ThermalEnergyPage() {
  return (
    <main className="p-8 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight">Thermal Energy & Heating Demand</h1>
        <Link
          href="/"
          className="text-sm font-mono text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to Overview
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Placeholder route for thermal energy & heating demand prediction models (Chapter 1).
      </p>
    </main>
  );
}
