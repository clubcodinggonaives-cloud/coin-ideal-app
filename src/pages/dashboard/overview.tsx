import { Link } from "react-router-dom"
import {
  ClipboardList,
  Calendar,
  Heart,
  ArrowRight,
  Clock,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, Skeleton, Badge } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useServiceRequests } from "@/features/bookings/hooks/use-bookings"
import { useBookings } from "@/features/bookings/hooks/use-bookings"
import { useFavorites } from "@/features/favorites/hooks/use-favorites"
import { formatRelativeTime } from "@/utils/format"
import { ROUTES } from "@/lib/constants"

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function DashboardOverviewPage() {
  const { user, profile } = useAuth()
  const userId = user?.id || ""

  const { data: requests, isLoading: loadingRequests } = useServiceRequests(userId, "client")
  const { data: bookings, isLoading: loadingBookings } = useBookings(userId, "client")
  const { data: favorites, isLoading: loadingFavorites } = useFavorites(userId)

  const isLoading = loadingRequests || loadingBookings || loadingFavorites

  if (isLoading) return <OverviewSkeleton />

  const activeRequests = requests?.filter((r) => r.status === "pending" || r.status === "accepted").length || 0
  const upcomingBookings = bookings?.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  ).length || 0
  const favoritesCount = favorites?.length || 0

  const stats = [
    {
      label: "Demandes actives",
      value: activeRequests,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Réservations à venir",
      value: upcomingBookings,
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Favoris",
      value: favoritesCount,
      icon: Heart,
      color: "text-red-500",
      bg: "bg-red-50",
    },
  ]

  const recentActivity = [
    ...(requests || []).slice(0, 3).map((r) => ({
      id: r.id,
      type: "request" as const,
      title: `Demande pour ${r.service?.name || "un service"}`,
      status: r.status,
      date: r.created_at,
    })),
    ...(bookings || []).slice(0, 3).map((b) => ({
      id: b.id,
      type: "booking" as const,
      title: `Réservation pour ${b.service?.name || "un service"}`,
      status: b.status,
      date: b.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {profile?.first_name || "Utilisateur"} 👋
        </h1>
        <p className="text-gray-500">
          Voici un aperçu de votre activité sur COIN-IDEAL.
        </p>
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
          <div className="flex items-center justify-between">
            <CardTitle>Activité récente</CardTitle>
            <Link
              to={ROUTES.DASHBOARD_REQUESTS}
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              Aucune activité récente.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gray-100 p-2">
                      {activity.type === "request" ? (
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Calendar className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(activity.date)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      activity.status === "completed" || activity.status === "confirmed"
                        ? "success"
                        : activity.status === "cancelled" || activity.status === "rejected"
                        ? "destructive"
                        : activity.status === "accepted" || activity.status === "in_progress"
                        ? "info"
                        : "warning"
                    }
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardOverviewPage
