import Link from "next/link";

export default function IndoorTempPage() {
  return (
    <main className="p-8 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight">Indoor Temperature Prediction</h1>
        <Link
          href="/"
          className="text-sm font-mono text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to Overview
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Placeholder route for indoor temperature prediction models (Chapter 1).
      </p>
    </main>
  );
}
