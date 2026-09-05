"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto mt-20 max-w-xl border border-danger bg-card p-6">
      <h1 className="text-lg font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Refresh the prediction flow or try again. Your entered values have not
        been submitted again automatically.
      </p>
      <button
        className="mt-4 bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
