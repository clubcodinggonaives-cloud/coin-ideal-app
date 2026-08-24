import { useState } from "react"
import { ClipboardList, CheckCircle, XCircle, Clock } from "lucide-react"
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
import { useServiceRequests, useUpdateRequestStatus } from "@/features/bookings/hooks/use-bookings"
import { formatDate, formatRelativeTime } from "@/utils/format"
import { parseDocumentOrderMessage } from "@/features/document-orders/utils/parse-order-message"
import { OrderMessageSummary } from "@/features/document-orders/components/order-message-summary"
import type { RequestStatus } from "@/types"

const TABS: { label: string; value: RequestStatus | "all" }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "pending" },
  { label: "Acceptées", value: "accepted" },
  { label: "Terminées", value: "completed" },
  { label: "Annulées", value: "cancelled" },
]

const statusConfig: Record<RequestStatus, { variant: "warning" | "info" | "success" | "destructive" | "secondary"; label: string }> = {
  pending: { variant: "warning", label: "En attente" },
  accepted: { variant: "info", label: "Acceptée" },
  rejected: { variant: "destructive", label: "Refusée" },
  completed: { variant: "success", label: "Terminée" },
  cancelled: { variant: "secondary", label: "Annulée" },
}

function ProviderRequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

function ProviderRequestsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("all")
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState("")

  const { data: requests, isLoading, error, refetch } = useServiceRequests(userId, "provider")
  const updateStatus = useUpdateRequestStatus()

  if (isLoading) return <ProviderRequestsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const filtered = activeTab === "all"
    ? requests || []
    : (requests || []).filter((r) => r.status === activeTab)

  const handleAccept = (requestId: string) => {
    updateStatus.mutate({ requestId, status: "accepted" })
  }

  const handleReject = () => {
    if (!rejectModal) return
    updateStatus.mutate(
      { requestId: rejectModal, status: "rejected", message: rejectMessage },
      { onSuccess: () => { setRejectModal(null); setRejectMessage("") } }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demandes reçues</h1>
        <p className="text-gray-500">Gérez les demandes de vos clients.</p>
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
            {tab.value !== "all" && requests && (
              <span className="ml-1.5 text-xs opacity-70">
                ({requests.filter((r) => r.status === tab.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
          title="Aucune demande"
          description={
            activeTab === "all"
              ? "Vous n'avez pas encore reçu de demande."
              : `Aucune demande avec le statut "${TABS.find((t) => t.value === activeTab)?.label}".`
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const config = statusConfig[request.status]
            const orderPayload = parseDocumentOrderMessage(request.message)
            return (
              <Card key={request.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar
                        src={request.client?.avatar_url}
                        alt={request.client ? `${request.client.first_name} ${request.client.last_name}` : "Client"}
                        fallback={request.client ? `${request.client.first_name} ${request.client.last_name}` : "C"}
                        size="md"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {request.client
                            ? `${request.client.first_name} ${request.client.last_name}`
                            : "Client"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {request.service?.name || "Service"}
                          {request.service?.category?.name && (
                            <span className="ml-1">· {request.service.category.name}</span>
                          )}
                        </p>
                        {orderPayload ? (
                          <OrderMessageSummary payload={orderPayload} />
                        ) : (
                          request.message && <p className="mt-1 text-sm text-gray-600">{request.message}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(request.created_at)}
                          </span>
                          {request.preferred_date && (
                            <span> Prévu : {formatDate(request.preferred_date)}</span>
                          )}
                          <span> Adresse : {request.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request.id)}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Accepter
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRejectModal(request.id)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectMessage("") }}
        title="Refuser la demande"
      >
        <div className="space-y-4">
          <Textarea
            label="Message de refus (optionnel)"
            value={rejectMessage}
            onChange={(e) => setRejectMessage(e.target.value)}
            placeholder="Expliquez pourquoi vous refusez cette demande..."
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectMessage("") }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateStatus.isPending}
            >
              Confirmer le refus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ProviderRequestsPage
