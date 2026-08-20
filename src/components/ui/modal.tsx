import { forwardRef, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/utils/cn"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, children, className, size = "md" }, ref) => {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!isOpen) return
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
      }
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
      return () => {
        document.removeEventListener("keydown", handleEscape)
        document.body.style.overflow = ""
      }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose()
        }}
      >
        <div
          ref={ref}
          className={cn(
            "relative w-full rounded-xl bg-white p-6 shadow-xl",
            sizeClasses[size],
            className
          )}
        >
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          {!title && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    )
  }
)

Modal.displayName = "Modal"

export { Modal }
