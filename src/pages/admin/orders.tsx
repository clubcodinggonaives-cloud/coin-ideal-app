import { useMemo, useState } from "react"
import { Package, Search } from "lucide-react"
import { Input, Select, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useAllOrders } from "@/features/orders/hooks/use-orders"
import { StaffOrderCard } from "@/features/orders/components/staff-order-card"
import { ORDER_STATUS_LABELS } from "@/lib/constants"
import type { OrderStatus } from "@/types"

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

function AdminOrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  )
}

/**
 * /admin/orders — vue complète (recherche, filtre par statut, détail,
 * paiement, retrait/livraison, document, historique) au-dessus des mêmes
 * données/actions que /provider/orders (StaffOrderCard, partagé). Les
 * changements de statut passent toujours par update_order_status() — voir
 * useUpdateOrderStatus() dans staff-order-card.tsx, jamais d'écriture
 * directe sur `orders` ici.
 */
function AdminOrdersPage() {
  const { data: orders, isLoading, error, refetch } = useAllOrders()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")

  const filtered = useMemo(() => {
    if (!orders) return []
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      if (!query) return true
      const clientName = `${order.client?.first_name ?? ""} ${order.client?.last_name ?? ""}`.toLowerCase()
      const clientEmail = (order.client?.email ?? "").toLowerCase()
      const serviceName = (order.service?.name ?? "").toLowerCase()
      return (
        order.id.toLowerCase().includes(query) ||
        clientName.includes(query) ||
        clientEmail.includes(query) ||
        serviceName.includes(query)
      )
    })
  }, [orders, search, statusFilter])

  if (isLoading) return <AdminOrdersSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
        <p className="text-gray-500">Toutes les commandes impression/copie — {orders?.length ?? 0} au total.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Rechercher par client, e-mail, service ou n° de commande..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="sm:max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-gray-400" />}
          title="Aucune commande"
          description={
            orders && orders.length > 0
              ? "Aucune commande ne correspond à votre recherche."
              : "Les commandes des clients apparaîtront ici."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <StaffOrderCard key={order.id} order={order} showClient />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminOrdersPage
