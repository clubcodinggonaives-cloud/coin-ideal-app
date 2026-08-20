import { Star } from "lucide-react"
import { cn } from "@/utils/cn"

interface RatingProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  count?: number
  className?: string
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4.5 w-4.5",
  lg: "h-5.5 w-5.5",
}

function Rating({ value, max = 5, size = "md", showValue = false, count, className }: RatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              i < Math.floor(value)
                ? "fill-amber-400 text-amber-400"
                : i < value
                ? "fill-amber-400/50 text-amber-400"
                : "fill-gray-200 text-gray-200"
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-sm text-gray-500">
          ({count})
        </span>
      )}
    </div>
  )
}

export { Rating }
