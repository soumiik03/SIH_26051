import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.ComponentProps<"input"> & {
  /** If true, renders value in monospace font (auto-set for type="number") */
  numeric?: boolean
}

function Input({ className, type, numeric, ...props }: InputProps) {
  const isNumeric = numeric ?? type === "number"
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout & spacing
        "flex h-9 w-full min-w-0 px-3 py-1",
        // Shape — sharp corners always
        "rounded-none",
        // Border & background
        "border border-input bg-background",
        // Typography
        "text-sm text-foreground placeholder:text-muted-foreground",
        // Monospace for numeric inputs
        isNumeric && "data-value",
        // Focus ring
        "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        // Disabled state
        "disabled:pointer-events-none disabled:opacity-50",
        // Validation state
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
        // File input styling
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
