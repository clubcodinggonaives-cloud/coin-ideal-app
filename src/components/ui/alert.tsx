import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react"
import { cn } from "@/utils/cn"

interface AlertProps {
  variant: "success" | "error" | "warning" | "info"
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

const variants = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: CheckCircle2,
    iconColor: "text-green-500",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: AlertCircle,
    iconColor: "text-red-500",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: Info,
    iconColor: "text-blue-500",
  },
}

function Alert({ variant, title, children, onClose, className }: AlertProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-lg border p-4",
        config.container,
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconColor)} />
        <div className="flex-1">
          {title && <h4 className="mb-1 font-medium">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export { Alert }
