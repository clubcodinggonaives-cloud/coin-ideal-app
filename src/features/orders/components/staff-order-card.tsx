import { useState } from "react"
import { Package, Wallet, FileText, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, Badge, Button, Modal, Input, Select } from "@/components/ui"
import { useUpdateOrderStatus } from "@/features/orders/hooks/use-orders"
import { useRecordPayment } from "@/features/orders/hooks/use-payments"
import { OrderStatusTimeline } from "@/features/orders/components/order-status-timeline"
import { uploadsService } from "@/services/uploads.service"
import { formatCurrency, formatDate } from "@/utils/format"
import { ORDER_STATUS_LABELS, PAYMENT_METHODS } from "@/lib/constants"
import type { Order, OrderStatus, PaymentMethod } from "@/types"

export const STATUS_BADGE_VARIANT: Record<OrderStatus, "warning" | "info" | "success" | "destructive" | "secondary"> = {
  en_attente: "warning",
  confirmee: "info",
  en_preparation: "info",
  prete: "success",
  en_livraison: "info",
  livree: "success",
  retiree: "success",
  annulee: "destructive",
}

/**
 * Prochaine étape valide côté personnel — miroir de la logique de
 * `update_order_status()` (supabase/migrations/00028), pour l'affichage du
 * bouton uniquement. La transition réelle est toujours revalidée côté
 * serveur par la fonction RPC.
 */
export function nextStatus(order: Order): OrderStatus | null {
  switch (order.status) {
    case "en_attente":
      return "confirmee"
    case "confirmee":
      return "en_preparation"
    case "en_preparation":
      return "prete"
    case "prete":
      return order.reception_method === "delivery" ? "en_livraison" : "retiree"
    case "en_livraison":
      return "livree"
    default:
      return null
  }
}

function DocumentLink({ filePath, fileName }: { filePath: string | null; fileName: string | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!filePath || !fileName) return null

  const handleOpen = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = await uploadsService.getOrderDocumentUrl(filePath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setError("Impossible d'ouvrir le document.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        {fileName}
        <ExternalLink className="h-3 w-3" />
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function RecordPaymentModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [amount, setAmount] = useState(String(order.total))
  const [method, setMethod] = useState<PaymentMethod>(order.preferred_payment_method ?? "cash")
  const [reference, setReference] = useState("")
  const recordPayment = useRecordPayment()

  const handleSubmit = () => {
    recordPayment.mutate(
      { orderId: order.id, amount: Number(amount), method, reference: reference || null, status: "confirmed" },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal isOpen onClose={onClose} title="Enregistrer un paiement">
      <div className="space-y-4">
        <Input type="number" min={0} label="Montant (HTG)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select
          label="Moyen de paiement"
          options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        />
        <Input
          label="Référence (optionnel)"
          placeholder="N° de transaction MonCash/NatCash..."
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {recordPayment.isError && <p className="text-sm text-red-500">Impossible d'enregistrer le paiement. Réessayez.</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={recordPayment.isPending}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  )
}

interface StaffOrderCardProps {
  order: Order
  /** Affiché pour l'admin (vue multi-commandes) mais pas pour le staff sur /provider/orders — COIN-IDEAL n'a qu'un provider aujourd'hui. */
  showClient?: boolean
}

function StaffOrderCard({ order, showClient = false }: StaffOrderCardProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const updateStatus = useUpdateOrderStatus()
  const next = nextStatus(order)

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <Package className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{order.service?.name ?? "Commande"}</h3>
              <p className="text-sm text-gray-500">
                #{order.id.slice(0, 8)} · {formatDate(order.created_at)} ·{" "}
                {order.reception_method === "delivery" ? "Livraison" : "Retrait au local"}
              </p>
              {showClient && order.client && (
                <p className="text-sm text-gray-500">
                  Client : {order.client.first_name} {order.client.last_name} ({order.client.email})
                </p>
              )}
              <p className="mt-0.5 text-sm font-semibold text-primary-700">{formatCurrency(order.total)}</p>
            </div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <OrderStatusTimeline order={order} />
        </div>

        {(order.items ?? []).length > 0 && (
          <div className="space-y-1 border-t border-gray-100 pt-3">
            {order.items!.map((item) => (
              <DocumentLink key={item.id} filePath={item.file_path} fileName={item.file_name} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {next && (
            <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: next })} isLoading={updateStatus.isPending}>
              Passer à « {ORDER_STATUS_LABELS[next]} »
            </Button>
          )}
          {order.status !== "annulee" && !["livree", "retiree"].includes(order.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus.mutate({ orderId: order.id, status: "annulee" })}
              isLoading={updateStatus.isPending}
            >
              Annuler
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setPaymentModalOpen(true)}>
            <Wallet className="h-4 w-4" />
            Enregistrer un paiement
          </Button>
        </div>
      </CardContent>
      {paymentModalOpen && <RecordPaymentModal order={order} onClose={() => setPaymentModalOpen(false)} />}
    </Card>
  )
}

export { StaffOrderCard }
