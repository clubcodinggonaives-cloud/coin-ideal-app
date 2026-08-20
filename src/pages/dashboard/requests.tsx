import { useState } from "react"
import { ClipboardList } from "lucide-react"
import { Card, CardContent, Badge, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useServiceRequests } from "@/features/bookings/hooks/use-bookings"
import { formatDate } from "@/utils/format"
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

function RequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

function DashboardRequestsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("all")

  const { data: requests, isLoading, error, refetch } = useServiceRequests(userId, "client")

  if (isLoading) return <RequestsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const filtered = activeTab === "all"
    ? requests || []
    : (requests || []).filter((r) => r.status === activeTab)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
        <p className="text-gray-500">Gérez vos demandes de services.</p>
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
              ? "Vous n'avez pas encore fait de demande de service."
              : `Aucune demande avec le statut "${TABS.find((t) => t.value === activeTab)?.label}".`
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const config = statusConfig[request.status]
            return (
              <Card key={request.id}>
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-gray-100 p-3">
                      <ClipboardList className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {request.service?.name || "Service"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.service?.category?.name && (
                          <span className="mr-2">{request.service.category.name}</span>
                        )}
                        {formatDate(request.created_at)}
                      </p>
                      {request.provider && (
                        <p className="text-xs text-gray-400">
                          Prestataire : {request.provider.first_name} {request.provider.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardRequestsPage
