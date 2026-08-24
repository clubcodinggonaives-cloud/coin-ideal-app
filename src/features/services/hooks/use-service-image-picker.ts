import { useEffect, useRef, useState } from "react"

const MAX_IMAGES = 5
const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Sélection locale de photos avant la création d'un service (pas encore de
 * `serviceId` à ce stade, donc pas encore de vrai upload — juste des
 * aperçus locaux via `URL.createObjectURL`, uploadés une fois le service
 * créé). Voir service-edit.tsx pour le cas inverse (service déjà existant),
 * qui uploade immédiatement au lieu de mettre en scène.
 */
export function useServiceImagePicker() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return
    setError(null)
    const incoming = Array.from(fileList)
    const accepted: File[] = []

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Format non supporté. Utilisez JPG, PNG ou WEBP.")
        continue
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" dépasse ${MAX_SIZE_MB} Mo.`)
        continue
      }
      accepted.push(file)
    }

    setFiles((prev) => {
      const next = [...prev, ...accepted].slice(0, MAX_IMAGES)
      if (prev.length + accepted.length > MAX_IMAGES) {
        setError(`Maximum ${MAX_IMAGES} photos.`)
      }
      return next
    })
    setPreviews((prev) => {
      const nextUrls = accepted.map((f) => URL.createObjectURL(f))
      return [...prev, ...nextUrls].slice(0, MAX_IMAGES)
    })

    if (inputRef.current) inputRef.current.value = ""
  }

  const removeAt = (index: number) => {
    setPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return { files, previews, error, inputRef, addFiles, removeAt }
}
