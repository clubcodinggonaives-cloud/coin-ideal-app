import {
  Users,
  Briefcase,
  ClipboardList,
  Calendar,
  Settings,
} from "lucide-react"
import {
  Card,
  CardContent,
  Skeleton,
  ErrorState,
} from "@/components/ui"
import { useAdminStats } from "@/features/admin/hooks/use-admin"

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function AdminDashboardPage() {
  const { data: stats, isLoading, error, refetch } = useAdminStats()

  if (isLoading) return <AdminDashboardSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const statCards = [
    {
      label: "Utilisateurs",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Prestataires",
      value: stats?.totalProviders || 0,
      icon: Briefcase,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Services",
      value: stats?.totalServices || 0,
      icon: Settings,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Demandes",
      value: stats?.totalRequests || 0,
      icon: ClipboardList,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Réservations",
      value: stats?.totalBookings || 0,
      icon: Calendar,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500">Vue d'ensemble de la plateforme COIN-IDEAL.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboardPage
