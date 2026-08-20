import { DollarSign, TrendingUp, Calendar, CheckCircle } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useBookings } from "@/features/bookings/hooks/use-bookings"
import { formatCurrency, formatDate } from "@/utils/format"

function EarningsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function ProviderEarningsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""

  const { data: bookings, isLoading, error, refetch } = useBookings(userId, "provider")

  if (isLoading) return <EarningsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const completedBookings = (bookings || []).filter((b) => b.status === "completed")
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.total_price, 0)

  const now = new Date()
  const thisMonth = completedBookings.filter((b) => {
    const d = new Date(b.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisWeek = completedBookings.filter((b) => {
    const d = new Date(b.created_at)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo
  })

  const monthRevenue = thisMonth.reduce((sum, b) => sum + b.total_price, 0)
  const weekRevenue = thisWeek.reduce((sum, b) => sum + b.total_price, 0)

  const stats = [
    {
      label: "Revenu total",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Ce mois-ci",
      value: formatCurrency(monthRevenue),
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Cette semaine",
      value: formatCurrency(weekRevenue),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenus</h1>
        <p className="text-gray-500">Suivez vos revenus et prestations terminées.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prestations terminées</CardTitle>
        </CardHeader>
        <CardContent>
          {completedBookings.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="h-8 w-8 text-gray-400" />}
              title="Aucune prestation terminée"
              description="Vos revenus apparaîtront ici une fois vos premières prestations terminées."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 font-medium text-gray-500">Client</th>
                    <th className="pb-3 font-medium text-gray-500">Service</th>
                    <th className="pb-3 font-medium text-gray-500">Date</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completedBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="py-3 text-gray-900">
                        {booking.client
                          ? `${booking.client.first_name} ${booking.client.last_name}`
                          : "Client"}
                      </td>
                      <td className="py-3 text-gray-600">
                        {booking.service?.name || "Service"}
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDate(booking.completed_at || booking.created_at)}
                      </td>
                      <td className="py-3 text-right font-medium text-green-600">
                        {formatCurrency(booking.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProviderEarningsPage
