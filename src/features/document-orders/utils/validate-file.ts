import { ORDER_FILE_ACCEPT, ORDER_FILE_MAX_SIZE_MB } from "@/lib/constants"

/**
 * MIME types accepted per extension (cahier des charges §4.2: "Controle de
 * type et d'extension"). Checking both — not just the extension — matters
 * because a renamed file (e.g. malware.exe renamed to doc.pdf) keeps its
 * real MIME type in most browsers/OSes, so a MIME mismatch catches what an
 * extension-only check would miss. This is still a client-side convenience
 * check, not a security boundary — the bucket's `allowed_mime_types`
 * (00023_create_storage_buckets.sql) and, ultimately, server-side
 * validation are the real enforcement.
 */
const MIME_BY_EXTENSION: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
}

export function validateOrderFile(file: File): string | null {
  const dotIndex = file.name.lastIndexOf(".")
  const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ""

  if (!ORDER_FILE_ACCEPT.includes(extension as (typeof ORDER_FILE_ACCEPT)[number])) {
    return `Format non pris en charge. Formats acceptés : ${ORDER_FILE_ACCEPT.join(", ")}.`
  }

  const expectedMimeTypes = MIME_BY_EXTENSION[extension] ?? []
  if (file.type && expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
    return "Le contenu du fichier ne correspond pas à son extension. Veuillez vérifier le fichier."
  }

  const maxBytes = ORDER_FILE_MAX_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return `Le fichier dépasse la taille maximale autorisée (${ORDER_FILE_MAX_SIZE_MB} Mo).`
  }

  if (file.size === 0) {
    return "Ce fichier est vide."
  }

  return null
}
