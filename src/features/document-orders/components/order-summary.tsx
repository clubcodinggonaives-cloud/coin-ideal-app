import { FileText, MapPin, Truck, Wallet, Receipt } from "lucide-react"
import { formatCurrency } from "@/utils/format"
import { COMPANY, PAYMENT_METHODS } from "@/lib/constants"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useUserAddresses } from "@/features/document-orders/hooks/use-addresses"
import { isProofPaymentMethod } from "@/features/document-orders/types"
import type { DocumentOrderState } from "@/features/document-orders/types"
import type { FinishingOption, Service } from "@/types"

interface OrderSummaryProps {
  order: DocumentOrderState
  service: Service | undefined
  finishingOptions: Pick<FinishingOption, "id" | "label">[]
  total: number
  deliveryFee?: number
}

function OrderSummary({ order, service, finishingOptions, total, deliveryFee = 0 }: OrderSummaryProps) {
  const { user } = useAuth()
  const { data: addresses } = useUserAddresses(user?.id ?? "")
  const selectedAddress = (addresses ?? []).find((a) => a.id === order.deliveryAddressId)

  const finishings = order.finishingIds
    .map((id) => finishingOptions.find((f) => f.id === id)?.label)
    .filter(Boolean)

  const paymentLabel = PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label
  const wantsProof = isProofPaymentMethod(order.paymentMethod)

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
          {order.reception === "delivery" ? (
            selectedAddress ? (
              <>
                <p className="text-gray-500">
                  {selectedAddress.street}, {selectedAddress.city}
                </p>
                {selectedAddress.phone && <p className="text-gray-500">{selectedAddress.phone}</p>}
                {order.deliveryInstructions && (
                  <p className="text-gray-500">Instructions : {order.deliveryInstructions}</p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Adresse à préciser</p>
            )
          ) : (
            <p className="text-gray-500">
              {COMPANY.street}, {COMPANY.city}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 text-sm">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div>
          <p className="text-gray-900">{paymentLabel}</p>
          <p className="text-gray-500">
            {wantsProof
              ? order.paymentProofFile
                ? `Preuve jointe : ${order.paymentProofFile.name}`
                : "Preuve de paiement à ajouter"
              : "Réglé sur place, à la remise ou à la livraison"}
          </p>
        </div>
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-4 text-sm">
        <div className="flex items-center justify-between text-gray-500">
          <span className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Sous-total
          </span>
          <span>{formatCurrency(Math.max(total - (order.reception === "delivery" ? deliveryFee : 0), 0))}</span>
        </div>
        {order.reception === "delivery" && (
          <div className="flex items-center justify-between text-gray-500">
            <span>Frais de livraison</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm font-medium text-gray-500">Total estimé</span>
        <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
      </div>
      <p className="text-xs text-gray-500">
        Estimation indicative — le montant définitif est confirmé par COIN-IDEAL avant préparation.
      </p>
    </div>
  )
}

export { OrderSummary }
