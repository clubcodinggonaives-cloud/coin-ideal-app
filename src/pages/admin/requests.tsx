import { useState } from "react"
import { ClipboardList, Search } from "lucide-react"
import {
  Card,
  CardContent,
  Badge,
  Input,
  Skeleton,
  EmptyState,
  ErrorState,
  Pagination,
  ResponsiveTableScroll,
  TableScrollHint,
  STICKY_COL_CLASS,
} from "@/components/ui"
import { useAdminRequests } from "@/features/admin/hooks/use-admin"
import { formatDate } from "@/utils/format"
import { cn } from "@/utils/cn"
import type { RequestStatus } from "@/types"

const statusConfig: Record<RequestStatus, { variant: "warning" | "info" | "success" | "destructive" | "secondary"; label: string }> = {
  pending: { variant: "warning", label: "En attente" },
  accepted: { variant: "info", label: "Acceptée" },
  rejected: { variant: "destructive", label: "Refusée" },
  completed: { variant: "success", label: "Terminée" },
  cancelled: { variant: "secondary", label: "Annulée" },
}

function AdminRequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function AdminRequestsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, error, refetch } = useAdminRequests(page)

  if (isLoading) return <AdminRequestsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const requests = data?.data || []
  const filtered = search
    ? requests.filter(
        (r) =>
          r.client?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.client?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.service?.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.provider?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.provider?.last_name?.toLowerCase().includes(search.toLowerCase())
      )
    : requests

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demandes</h1>
        <p className="text-gray-500">Toutes les demandes de services de la plateforme.</p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Rechercher une demande..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
          title="Aucune demande"
          description={search ? "Aucune demande ne correspond à votre recherche." : "Aucune demande enregistrée."}
        />
      ) : (
        <>
          <Card>
            <TableScrollHint />
            <CardContent className="p-0">
              <ResponsiveTableScroll>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className={cn("px-4 py-3 font-medium text-gray-500", STICKY_COL_CLASS)}>Client</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Prestataire</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Service</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((req) => {
                    const config = statusConfig[req.status]
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className={cn("px-4 py-3 text-gray-900", STICKY_COL_CLASS)}>
                          {req.client
                            ? `${req.client.first_name} ${req.client.last_name}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {req.provider
                            ? `${req.provider.first_name} ${req.provider.last_name}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {req.service?.name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(req.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </ResponsiveTableScroll>
            </CardContent>
          </Card>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}

export default AdminRequestsPage
