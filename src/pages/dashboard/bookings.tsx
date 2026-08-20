import { useState } from "react"
import { Calendar, Clock, MapPin } from "lucide-react"
import { Card, CardContent, Badge, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useBookings } from "@/features/bookings/hooks/use-bookings"
import { formatDate, formatCurrency } from "@/utils/format"
import type { BookingStatus } from "@/types"

const TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "pending" },
  { label: "Confirmées", value: "confirmed" },
  { label: "En cours", value: "in_progress" },
  { label: "Terminées", value: "completed" },
]

const statusConfig: Record<BookingStatus, { variant: "warning" | "info" | "success" | "destructive" | "secondary"; label: string }> = {
  pending: { variant: "warning", label: "En attente" },
  confirmed: { variant: "info", label: "Confirmée" },
  in_progress: { variant: "info", label: "En cours" },
  completed: { variant: "success", label: "Terminée" },
  cancelled: { variant: "destructive", label: "Annulée" },
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  )
}

function DashboardBookingsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all")

  const { data: bookings, isLoading, error, refetch } = useBookings(userId, "client")

  if (isLoading) return <BookingsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const filtered = activeTab === "all"
    ? bookings || []
    : (bookings || []).filter((b) => b.status === activeTab)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
        <p className="text-gray-500">Suivez l'état de vos réservations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            {tab.value !== "all" && bookings && (
              <span className="ml-1.5 text-xs opacity-70">
                ({bookings.filter((b) => b.status === tab.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8 text-gray-400" />}
          title="Aucune réservation"
          description={
            activeTab === "all"
              ? "Vous n'avez pas encore de réservation."
              : `Aucune réservation avec le statut "${TABS.find((t) => t.value === activeTab)?.label}".`
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const config = statusConfig[booking.status]
            return (
              <Card key={booking.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-gray-100 p-3">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {booking.service?.name || "Service"}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(booking.scheduled_date)}
                          </span>
                          {booking.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {booking.scheduled_time}
                            </span>
                          )}
                          {booking.service?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {booking.service.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-600">
                        {formatCurrency(booking.total_price)}
                      </span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardBookingsPage
