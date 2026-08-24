import { useState } from "react"
import { Package, FileText, ExternalLink, Loader2, ChevronDown } from "lucide-react"
import { Card, CardContent, Badge, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMyOrders } from "@/features/orders/hooks/use-orders"
import { OrderStatusTimeline } from "@/features/orders/components/order-status-timeline"
import { uploadsService } from "@/services/uploads.service"
import { formatCurrency, formatDate } from "@/utils/format"
import { ORDER_STATUS_LABELS, ROUTES } from "@/lib/constants"
import { cn } from "@/utils/cn"
import { Link, useNavigate } from "react-router-dom"
import type { Order, OrderStatus } from "@/types"

const STATUS_BADGE_VARIANT: Record<OrderStatus, "warning" | "info" | "success" | "destructive" | "secondary"> = {
  en_attente: "warning",
  confirmee: "info",
  en_preparation: "info",
  prete: "success",
  en_livraison: "info",
  livree: "success",
  retiree: "success",
  annulee: "destructive",
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
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

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)

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
                Commande #{order.id.slice(0, 8)} · {formatDate(order.created_at)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-primary-700">{formatCurrency(order.total)}</p>
            </div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <OrderStatusTimeline order={order} />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Masquer les détails" : "Voir les détails"}
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-gray-100 pt-3 text-sm">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-700">
                  {item.pages} page{item.pages > 1 ? "s" : ""} × {item.copies} copie{item.copies > 1 ? "s" : ""} ·{" "}
                  {item.color === "color" ? "Couleur" : "Noir & blanc"} ·{" "}
                  {item.sided === "duplex" ? "Recto-verso" : "Simple face"}
                </p>
                {(item.finishings ?? []).length > 0 && (
                  <p className="mt-1 text-gray-500">
                    Finitions : {item.finishings!.map((f) => f.finishing_option?.label ?? f.finishing_id).join(", ")}
                  </p>
                )}
                <div className="mt-2">
                  <DocumentLink filePath={item.file_path} fileName={item.file_name} />
                </div>
              </div>
            ))}

            {order.reception_method === "delivery" && order.delivery_address && (
              <p className="text-gray-500">
                Livraison : {order.delivery_address.street}, {order.delivery_address.city}
              </p>
            )}

            {(order.payments ?? []).length > 0 && (
              <div>
                <p className="font-medium text-gray-700">Paiements</p>
                <ul className="mt-1 space-y-1 text-gray-500">
                  {order.payments!.map((p) => (
                    <li key={p.id}>
                      {formatCurrency(p.amount)} · {p.method} ·{" "}
                      {p.status === "confirmed" ? "confirmé" : p.status === "pending" ? "en attente" : p.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardOrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id || ""

  const { data: orders, isLoading, error, refetch } = useMyOrders(userId)

  if (isLoading) return <OrdersSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
          <p className="text-gray-500">Impression, copie — suivez l'avancement de vos commandes.</p>
        </div>
        <Link to={ROUTES.ORDER}>
          <Button size="sm">Nouvelle commande</Button>
        </Link>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-gray-400" />}
          title="Aucune commande"
          description="Vous n'avez pas encore commandé d'impression ou de copie."
          action={{ label: "Commander maintenant", onClick: () => navigate(ROUTES.ORDER) }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardOrdersPage
