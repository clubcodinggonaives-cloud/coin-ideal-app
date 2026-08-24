import { Package } from "lucide-react"
import { Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useAllOrders } from "@/features/orders/hooks/use-orders"
import { StaffOrderCard } from "@/features/orders/components/staff-order-card"

function ProviderOrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  )
}

function ProviderOrdersPage() {
  const { data: orders, isLoading, error, refetch } = useAllOrders()

  if (isLoading) return <ProviderOrdersSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
        <p className="text-gray-500">Impression, copie — traitement des commandes reçues.</p>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-gray-400" />}
          title="Aucune commande"
          description="Les commandes des clients apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <StaffOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProviderOrdersPage
