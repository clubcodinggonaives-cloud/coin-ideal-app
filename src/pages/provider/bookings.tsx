import { useState } from "react"
import { Calendar, Clock, CheckCircle, Play, XCircle } from "lucide-react"
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
  Avatar,
  Modal,
  Textarea,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useBookings, useUpdateBookingStatus } from "@/features/bookings/hooks/use-bookings"
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

function ProviderBookingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

function ProviderBookingsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all")
  const [cancelModal, setCancelModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  const { data: bookings, isLoading, error, refetch } = useBookings(userId, "provider")
  const updateBookingStatus = useUpdateBookingStatus()

  if (isLoading) return <ProviderBookingsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const filtered = activeTab === "all"
    ? bookings || []
    : (bookings || []).filter((b) => b.status === activeTab)

  const getNextAction = (status: BookingStatus): { label: string; nextStatus: BookingStatus; icon: typeof CheckCircle } | null => {
    switch (status) {
      case "pending":
        return { label: "Confirmer", nextStatus: "confirmed", icon: CheckCircle }
      case "confirmed":
        return { label: "Commencer", nextStatus: "in_progress", icon: Play }
      case "in_progress":
        return { label: "Terminer", nextStatus: "completed", icon: CheckCircle }
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
        <p className="text-gray-500">Gérez les réservations de vos clients.</p>
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
            const nextAction = getNextAction(booking.status)
            return (
              <Card key={booking.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar
                        src={booking.client?.avatar_url}
                        alt={booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : "Client"}
                        fallback={booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : "C"}
                        size="md"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {booking.client
                            ? `${booking.client.first_name} ${booking.client.last_name}`
                            : "Client"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {booking.service?.name || "Service"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(booking.scheduled_date)}
                          </span>
                          {booking.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.scheduled_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-600">
                        {formatCurrency(booking.total_price)}
                      </span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <div className="flex gap-2">
                        {nextAction && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateBookingStatus.mutate({
                                bookingId: booking.id,
                                status: nextAction.nextStatus,
                              })
                            }
                            disabled={updateBookingStatus.isPending}
                          >
                            <nextAction.icon className="mr-1 h-3.5 w-3.5" />
                            {nextAction.label}
                          </Button>
                        )}
                        {booking.status !== "completed" && booking.status !== "cancelled" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCancelModal(booking.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={!!cancelModal}
        onClose={() => { setCancelModal(null); setCancelReason("") }}
        title="Annuler la réservation"
      >
        <div className="space-y-4">
          <Textarea
            label="Raison de l'annulation (optionnel)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Expliquez pourquoi vous annulez..."
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setCancelModal(null); setCancelReason("") }}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelModal) {
                  updateBookingStatus.mutate(
                    { bookingId: cancelModal, status: "cancelled" },
                    { onSuccess: () => { setCancelModal(null); setCancelReason("") } }
                  )
                }
              }}
              disabled={updateBookingStatus.isPending}
            >
              Confirmer l'annulation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ProviderBookingsPage
