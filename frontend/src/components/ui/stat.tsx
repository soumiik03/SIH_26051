import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statVariants = cva(
  // Value always monospace + tabular nums
  "data-value text-2xl font-semibold leading-none tracking-tight",
  {
    variants: {
      variant: {
        default: "text-foreground",
        success: "text-success",
        warning: "text-warning",
        danger: "text-danger",
        accent: "text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface StatProps extends VariantProps<typeof statVariants> {
  /** Short label shown above the value */
  label: string
  /** The numeric or string value to display */
  value: string | number
  /** Optional unit suffix shown after the value in muted text */
  unit?: string
  className?: string
}

/**
 * Stat — displays a labelled numeric/data output value.
 *
 * Value is always rendered in JetBrains Mono (font-mono / data-value).
 * Used by prediction result displays; import and drop into any results section.
 *
 * @example
 * <Stat label="Indoor Temperature" value={22.4} unit="°C" variant="success" />
 * <Stat label="Thermal Energy" value={18.7} unit="kWh" variant="warning" />
 */
function Stat({ label, value, unit, variant, className }: StatProps) {
  return (
    <div
      data-slot="stat"
      className={cn("flex flex-col gap-1", className)}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={cn(statVariants({ variant }))}>
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}

export { Stat }
