import { cn } from "@/utils/cn"

interface AvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-xl",
}

function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const initials = fallback
    ?.split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-medium text-primary-700",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt || "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  )
}

export { Avatar }
