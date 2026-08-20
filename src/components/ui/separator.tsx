import { cn } from "@/utils/cn"

function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical"
  className?: string
}) {
  return (
    <div
      role="separator"
      className={cn(
        "shrink-0 bg-gray-200",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  )
}

export { Separator }
