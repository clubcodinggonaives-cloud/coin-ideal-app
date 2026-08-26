import { useState } from "react"
import { MapPin, Truck, Wallet, Smartphone, Plus, Upload, FileText } from "lucide-react"
import { Input, Textarea, Button } from "@/components/ui"
import { COMPANY } from "@/lib/constants"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useUserAddresses, useCreateAddress } from "@/features/document-orders/hooks/use-addresses"
import { isProofPaymentMethod } from "@/features/document-orders/types"
import type { DocumentOrderState } from "@/features/document-orders/types"

interface DeliveryOptionsProps {
  order: DocumentOrderState
  deliveryFee: number
  onChange: (patch: Partial<DocumentOrderState>) => void
  addressError?: string
  proofError?: string
}

function AddressPicker({
  order,
  onChange,
  addressError,
}: Pick<DeliveryOptionsProps, "order" | "onChange" | "addressError">) {
  const { user } = useAuth()
  const { data: addresses, isLoading } = useUserAddresses(user?.id ?? "")
  const createAddress = useCreateAddress()
  const [showNew, setShowNew] = useState(false)
  const [label, setLabel] = useState("Domicile")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("Gonaïves")
  const [phone, setPhone] = useState("")

  const handleCreate = async () => {
    if (!user || !street.trim() || !phone.trim()) return
    const address = await createAddress.mutateAsync({
      userId: user.id,
      label: label.trim() || "Livraison",
      street: street.trim(),
      city: city.trim() || "Gonaïves",
      phone: phone.trim(),
      isDefault: (addresses ?? []).length === 0,
    })
    onChange({ deliveryAddressId: address.id })
    setShowNew(false)
    setStreet("")
    setPhone("")
  }

  if (isLoading) return <p className="text-sm text-gray-500">Chargement de vos adresses...</p>

  return (
    <div className="space-y-3">
      {(addresses ?? []).map((addr) => (
        <label
          key={addr.id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
            order.deliveryAddressId === addr.id
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="deliveryAddressId"
            className="sr-only"
            checked={order.deliveryAddressId === addr.id}
            onChange={() => onChange({ deliveryAddressId: addr.id })}
          />
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <span>
            <span className="block font-medium text-gray-900">{addr.label}</span>
            <span className="text-gray-500">
              {addr.street}, {addr.city}
              {addr.phone ? ` · ${addr.phone}` : ""}
            </span>
          </span>
        </label>
      ))}

      {addressError && <p className="text-sm text-red-500">{addressError}</p>}

      {showNew ? (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nom de l'adresse" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Domicile, Bureau..." />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+509 34 56 7890" />
          </div>
          <Input label="Adresse" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Quartier, rue, point de repère..." />
          <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!street.trim() || !phone.trim() || createAddress.isPending}
              isLoading={createAddress.isPending}
              onClick={handleCreate}
            >
              Enregistrer cette adresse
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Ajouter une adresse
        </Button>
      )}
    </div>
  )
}

function DeliveryOptions({ order, deliveryFee, onChange, addressError, proofError }: DeliveryOptionsProps) {
  const wantsProof = isProofPaymentMethod(order.paymentMethod)

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
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Adresse de livraison</span>
            <AddressPicker order={order} onChange={onChange} addressError={addressError} />
          </div>
          <Textarea
            label="Instructions de livraison (optionnel)"
            placeholder="Étage, couleur du portail, point de repère..."
            rows={2}
            value={order.deliveryInstructions}
            onChange={(e) => onChange({ deliveryInstructions: e.target.value })}
          />
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Comment allez-vous payer ?</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              !wantsProof ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="paymentMode"
              className="sr-only"
              checked={!wantsProof}
              onChange={() => onChange({ paymentMethod: "cash", paymentProofFile: null, paymentReference: "" })}
            />
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <span>
              <span className="block font-medium text-gray-900">Je paierai en personne</span>
              <span className="text-gray-500">Espèces ou virement, réglé sur place</span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              wantsProof ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="paymentMode"
              className="sr-only"
              checked={wantsProof}
              onChange={() => onChange({ paymentMethod: "moncash" })}
            />
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <span>
              <span className="block font-medium text-gray-900">Envoyer une preuve de paiement</span>
              <span className="text-gray-500">MonCash ou NatCash</span>
            </span>
          </label>
        </div>
      </div>

      {!wantsProof && (
        <div className="flex gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="inPersonMethod"
              checked={order.paymentMethod === "cash"}
              onChange={() => onChange({ paymentMethod: "cash" })}
            />
            Espèces
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="inPersonMethod"
              checked={order.paymentMethod === "transfer"}
              onChange={() => onChange({ paymentMethod: "transfer" })}
            />
            Virement bancaire
          </label>
        </div>
      )}

      {wantsProof && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="flex gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="proofMethod"
                checked={order.paymentMethod === "moncash"}
                onChange={() => onChange({ paymentMethod: "moncash" })}
              />
              MonCash
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="proofMethod"
                checked={order.paymentMethod === "natcash"}
                onChange={() => onChange({ paymentMethod: "natcash" })}
              />
              NatCash
            </label>
          </div>

          <Input
            label="Numéro de référence / transaction (optionnel)"
            value={order.paymentReference}
            onChange={(e) => onChange({ paymentReference: e.target.value })}
            placeholder="Ex: 8M2K9X..."
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Preuve de paiement</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-primary-400">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => onChange({ paymentProofFile: e.target.files?.[0] ?? null })}
              />
              {order.paymentProofFile ? (
                <>
                  <FileText className="h-5 w-5 shrink-0 text-primary-600" />
                  <span className="truncate text-sm text-gray-700">{order.paymentProofFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-500">Capture d'écran ou reçu (image ou PDF)</span>
                </>
              )}
            </label>
            {proofError && <p className="mt-1.5 text-sm text-red-500">{proofError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export { DeliveryOptions }
