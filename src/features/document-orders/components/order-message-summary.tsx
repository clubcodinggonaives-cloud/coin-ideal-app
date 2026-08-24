import { useState } from "react"
import { FileText, ExternalLink, Loader2 } from "lucide-react"
import { uploadsService } from "@/services/uploads.service"
import { PAYMENT_METHODS } from "@/lib/constants"
import { formatCurrency } from "@/utils/format"
import { FALLBACK_FINISHING_OPTIONS } from "@/features/document-orders/types"
import type { DocumentOrderMessagePayload } from "@/features/document-orders/utils/parse-order-message"

interface OrderMessageSummaryProps {
  payload: DocumentOrderMessagePayload
}

/**
 * Affiche une commande de document de façon lisible pour le personnel
 * COIN-IDEAL (voir provider/requests.tsx), au lieu du JSON brut stocké
 * dans `service_requests.message`. Le document lui-même n'est jamais
 * préchargé ou stocké en clair côté client : l'URL signée n'est demandée
 * qu'au clic, et expire après quelques minutes (voir uploads.service.ts).
 */
function OrderMessageSummary({ payload }: OrderMessageSummaryProps) {
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const finishings = payload.finishingIds
    .map((id) => FALLBACK_FINISHING_OPTIONS.find((f) => f.id === id)?.label)
    .filter(Boolean)
  const paymentLabel = PAYMENT_METHODS.find((m) => m.value === payload.paymentMethod)?.label

  const handleViewDocument = async () => {
    if (!payload.filePath) return
    setLoadingUrl(true)
    setUrlError(null)
    try {
      const url = await uploadsService.getOrderDocumentUrl(payload.filePath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setUrlError("Impossible d'ouvrir le document. Réessayez.")
    } finally {
      setLoadingUrl(false)
    }
  }

  return (
    <div className="mt-1 space-y-1.5 text-sm text-gray-600">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          {payload.pages} page{payload.pages > 1 ? "s" : ""} × {payload.copies} copie
          {payload.copies > 1 ? "s" : ""} · {payload.color === "color" ? "Couleur" : "Noir & blanc"} ·{" "}
          {payload.sided === "duplex" ? "Recto-verso" : "Simple face"}
          {finishings.length > 0 ? ` · ${finishings.join(", ")}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {payload.fileName && (
          <button
            type="button"
            onClick={handleViewDocument}
            disabled={loadingUrl || !payload.filePath}
            className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {loadingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {payload.fileName}
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
        {paymentLabel && <span className="text-gray-500">Paiement : {paymentLabel}</span>}
        <span className="font-medium text-gray-900">{formatCurrency(payload.estimatedTotal)} (estimation)</span>
      </div>
      {urlError && <p className="text-xs text-red-500">{urlError}</p>}
      {payload.notes && <p className="italic text-gray-500">« {payload.notes} »</p>}
    </div>
  )
}

export { OrderMessageSummary }
