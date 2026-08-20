import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-100 text-primary-700",
        secondary: "bg-gray-100 text-gray-700",
        accent: "bg-accent-100 text-accent-700",
        destructive: "bg-red-100 text-red-700",
        success: "bg-green-100 text-green-700",
        warning: "bg-amber-100 text-amber-700",
        info: "bg-blue-100 text-blue-700",
        outline: "border border-gray-300 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
