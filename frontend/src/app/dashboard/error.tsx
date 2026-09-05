"use client";
export default function DashboardError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-20 max-w-xl border border-danger bg-card p-6">
      <h2 className="text-lg font-bold">Dashboard could not load</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Check that the backend is running, then try again.
      </p>
      <button
        className="mt-4 bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}