import { MapPin, Truck } from "lucide-react"
import { Input, Select } from "@/components/ui"
import { COMPANY, PAYMENT_METHODS } from "@/lib/constants"
import type { DocumentOrderState } from "@/features/document-orders/types"

interface DeliveryOptionsProps {
  order: DocumentOrderState
  deliveryFee: number
  onChange: (patch: Partial<DocumentOrderState>) => void
  addressError?: string
}

function DeliveryOptions({ order, deliveryFee, onChange, addressError }: DeliveryOptionsProps) {
  return (
    <div className="space-y-6">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Récupération</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              order.reception === "pickup"
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="reception"
              className="sr-only"
              checked={order.reception === "pickup"}
              onChange={() => onChange({ reception: "pickup" })}
            />
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <span>
              <span className="block font-medium text-gray-900">Retrait au local</span>
              <span className="text-gray-500">
                {COMPANY.street}, {COMPANY.city} — gratuit
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              order.reception === "delivery"
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="reception"
              className="sr-only"
              checked={order.reception === "delivery"}
              onChange={() => onChange({ reception: "delivery" })}
            />
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <span>
              <span className="block font-medium text-gray-900">Livraison</span>
              <span className="text-gray-500">Domicile ou bureau — {deliveryFee} HTG</span>
            </span>
          </label>
        </div>
      </div>

      {order.reception === "delivery" && (
        <Input
          label="Adresse de livraison"
          placeholder="Quartier, rue, point de repère..."
          value={order.deliveryAddress}
          onChange={(e) => onChange({ deliveryAddress: e.target.value })}
          error={addressError}
        />
      )}

      <Select
        label="Moyen de paiement"
        options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
        value={order.paymentMethod}
        onChange={(e) => onChange({ paymentMethod: e.target.value })}
      />
    </div>
  )
}

export { DeliveryOptions }
