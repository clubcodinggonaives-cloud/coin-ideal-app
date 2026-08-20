import { FileText, MapPin, Truck, Wallet } from "lucide-react"
import { formatCurrency } from "@/utils/format"
import { COMPANY, PAYMENT_METHODS } from "@/lib/constants"
import { FINISHING_OPTIONS, type DocumentOrderState } from "@/features/document-orders/types"
import type { Service } from "@/types"

interface OrderSummaryProps {
  order: DocumentOrderState
  service: Service | undefined
  total: number
}

function OrderSummary({ order, service, total }: OrderSummaryProps) {
  const finishings = order.finishingIds
    .map((id) => FINISHING_OPTIONS.find((f) => f.id === id)?.label)
    .filter(Boolean)

  const paymentLabel = PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">Résumé de la commande</h3>

      <div className="flex items-start gap-3 text-sm">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{order.file?.name ?? "Aucun fichier"}</p>
          <p className="text-gray-500">
            {service?.name ?? "Service non sélectionné"} · {order.pages} page{order.pages > 1 ? "s" : ""} ×{" "}
            {order.copies} copie{order.copies > 1 ? "s" : ""}
          </p>
          <p className="text-gray-500">
            {order.color === "color" ? "Couleur" : "Noir & blanc"} ·{" "}
            {order.sided === "duplex" ? "Recto-verso" : "Simple face"}
            {finishings.length > 0 ? ` · ${finishings.join(", ")}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 text-sm">
        {order.reception === "delivery" ? (
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {order.reception === "delivery" ? "Livraison" : "Retrait au local"}
          </p>
          <p className="text-gray-500">
            {order.reception === "delivery"
              ? order.deliveryAddress || "Adresse à préciser"
              : `${COMPANY.street}, ${COMPANY.city}`}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 text-sm">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <p className="text-gray-900">{paymentLabel}</p>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm font-medium text-gray-500">Total estimé</span>
        <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
      </div>
      <p className="text-xs text-gray-400">
        Estimation indicative — le montant définitif est confirmé par COIN-IDEAL avant préparation.
      </p>
    </div>
  )
}

export { OrderSummary }
