import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="p-8 space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Passive Thermal Comfort Design & Optimization Platform
        </h1>
        <p className="text-sm text-muted-foreground">
          Cold-climate shelter thermal performance system (Ladakh region) — Smart India Hackathon 2026.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/indoor-temp" className="block focus:outline-none">
          <Card className="hover:border-foreground/40 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Indoor Temperature</CardTitle>
              <CardDescription>
                Predict inside shelter temperature based on design parameters and environmental conditions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/design" className="block focus:outline-none">
          <Card className="hover:border-foreground/40 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Design Optimization</CardTitle>
              <CardDescription>
                Estimate optimal shelter material, WWR, wall thickness, glazing ratio, and R-value.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/thermal-energy" className="block focus:outline-none">
          <Card className="hover:border-foreground/40 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Thermal Energy</CardTitle>
              <CardDescription>
                Calculate solar radiation thermal energy generation and supplemental heating demand.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>
    </main>
  );
}
