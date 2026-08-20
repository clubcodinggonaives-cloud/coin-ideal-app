import type { PrintColor, PrintSided } from "@/features/document-orders/types"

/**
 * Shape sérialisée dans `service_requests.message` par
 * `useSubmitDocumentOrder` (voir la note dans ce hook : le champ existant
 * sert de support tant qu'un modèle `orders` dédié n'existe pas).
 */
export interface DocumentOrderMessagePayload {
  type: "document_order"
  fileName: string | null
  filePath: string | null
  pages: number
  copies: number
  color: PrintColor
  sided: PrintSided
  finishingIds: string[]
  paymentMethod: string
  notes: string
  estimatedTotal: number
}

/**
 * Les demandes de service "classiques" du modèle marketplace stockent un
 * message texte libre ; les commandes de document stockent du JSON. Cette
 * fonction distingue les deux pour l'affichage (voir provider/requests.tsx)
 * sans jamais faire confiance à un JSON malformé ou à un champ manquant.
 */
export function parseDocumentOrderMessage(message: string | null | undefined): DocumentOrderMessagePayload | null {
  if (!message) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(message)
  } catch {
    return null
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).type !== "document_order"
  ) {
    return null
  }

  const p = parsed as Record<string, unknown>
  return {
    type: "document_order",
    fileName: typeof p.fileName === "string" ? p.fileName : null,
    filePath: typeof p.filePath === "string" ? p.filePath : null,
    pages: typeof p.pages === "number" ? p.pages : 0,
    copies: typeof p.copies === "number" ? p.copies : 0,
    color: p.color === "color" ? "color" : "bw",
    sided: p.sided === "duplex" ? "duplex" : "simplex",
    finishingIds: Array.isArray(p.finishingIds) ? p.finishingIds.filter((f): f is string => typeof f === "string") : [],
    paymentMethod: typeof p.paymentMethod === "string" ? p.paymentMethod : "",
    notes: typeof p.notes === "string" ? p.notes : "",
    estimatedTotal: typeof p.estimatedTotal === "number" ? p.estimatedTotal : 0,
  }
}
