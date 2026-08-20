import { useState, useRef, type DragEvent, type KeyboardEvent } from "react"
import { FileText, Upload, X } from "lucide-react"
import { ORDER_FILE_ACCEPT, ORDER_FILE_MAX_SIZE_MB } from "@/lib/constants"
import { validateOrderFile } from "@/features/document-orders/utils/validate-file"
import { cn } from "@/utils/cn"

interface FileUploaderProps {
  file: File | null
  onChange: (file: File | null) => void
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function FileUploader({ file, onChange, error }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const acceptAttr = ORDER_FILE_ACCEPT.join(",")
  // Extension + MIME check happens for both the file picker and drag-drop —
  // the browser's `accept` attribute only filters the picker dialog, and
  // does nothing at all for a dropped file.
  const displayedError = validationError ?? error

  const handleFiles = (files: FileList | null) => {
    const selected = files?.[0]
    if (!selected) return

    const validationMessage = validateOrderFile(selected)
    if (validationMessage) {
      setValidationError(validationMessage)
      onChange(null)
      return
    }

    setValidationError(null)
    onChange(selected)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setValidationError(null)
            if (inputRef.current) inputRef.current.value = ""
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Retirer le fichier"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          "border-gray-300 hover:border-primary-400 hover:bg-primary-50/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          displayedError && "border-red-400"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            Glissez votre fichier ici ou cliquez pour sélectionner
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, DOC, DOCX, JPG ou PNG — {ORDER_FILE_MAX_SIZE_MB} Mo maximum
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          aria-label="Téléverser votre document"
        />
      </div>
      {displayedError && <p className="mt-1.5 text-sm text-red-500">{displayedError}</p>}
    </div>
  )
}

export { FileUploader, formatFileSize }
