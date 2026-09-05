import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base styles — sharp corners, small text, monospace for field names
  "inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-xs font-mono leading-none transition-colors",
  {
    variants: {
      variant: {
        /** Muted — used for input field labels */
        input:
          "border-border bg-muted text-muted-foreground",
        /** Accent — used for output field labels */
        output:
          "border-accent/40 bg-accent/10 text-accent",
        /** Default neutral */
        default:
          "border-border bg-secondary text-secondary-foreground",
        /** Success semantic colour */
        success:
          "border-success/40 bg-success/10 text-success",
        /** Warning semantic colour */
        warning:
          "border-warning/40 bg-warning/10 text-warning-foreground",
        /** Danger semantic colour */
        danger:
          "border-danger/40 bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
