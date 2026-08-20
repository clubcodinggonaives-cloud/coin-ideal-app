import { Link } from "react-router-dom"
import {
  Briefcase,
  ClipboardList,
  CheckCircle,
  DollarSign,
  Star,
  Plus,
  ArrowRight,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
  ErrorState,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProvider } from "@/features/providers/hooks/use-providers"
import { useServiceRequests } from "@/features/bookings/hooks/use-bookings"
import { useBookings } from "@/features/bookings/hooks/use-bookings"
import { formatCurrency, formatRelativeTime } from "@/utils/format"
import { ROUTES } from "@/lib/constants"

function ProviderDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function ProviderDashboardPage() {
  const { user } = useAuth()
  const userId = user?.id || ""

  const { data: provider, isLoading: loadingProvider, error: providerError, refetch } = useProvider(userId)
  const { data: requests, isLoading: loadingRequests } = useServiceRequests(userId, "provider")
  const { data: bookings, isLoading: loadingBookings } = useBookings(userId, "provider")

  const isLoading = loadingProvider || loadingRequests || loadingBookings
  if (isLoading) return <ProviderDashboardSkeleton />
  if (providerError || !provider) return <ErrorState onRetry={refetch} />

  const activeRequests = requests?.filter((r) => r.status === "pending" || r.status === "accepted").length || 0
  const completedJobs = bookings?.filter((b) => b.status === "completed").length || 0
  const totalRevenue = bookings
    ?.filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.total_price, 0) || 0

  const stats = [
    { label: "Services actifs", value: provider.total_completed || 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Demandes actives", value: activeRequests, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Jobs terminés", value: completedJobs, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Revenu total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Note moyenne", value: provider.rating?.toFixed(1) || "0.0", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  const recentRequests = (requests || []).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500">Bienvenue sur votre espace prestataire.</p>
        </div>
        <Link to={ROUTES.PROVIDER_SERVICE_NEW}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Demandes récentes</CardTitle>
            <Link
              to={ROUTES.PROVIDER_REQUESTS}
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              Aucune demande récente.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gray-100 p-2">
                      <ClipboardList className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.client
                          ? `${req.client.first_name} ${req.client.last_name}`
                          : "Client"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {req.service?.name || "Service"} · {formatRelativeTime(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      req.status === "completed"
                        ? "success"
                        : req.status === "cancelled" || req.status === "rejected"
                        ? "destructive"
                        : req.status === "accepted"
                        ? "info"
                        : "warning"
                    }
                  >
                    {req.status}
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

export default ProviderDashboardPage
