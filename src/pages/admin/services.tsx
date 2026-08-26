import { useState } from "react"
import { Link } from "react-router-dom"
import { Briefcase, Plus, Search } from "lucide-react"
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Skeleton,
  EmptyState,
  ErrorState,
  Pagination,
  ResponsiveTableScroll,
  TableScrollHint,
  STICKY_COL_CLASS,
} from "@/components/ui"
import { useAdminServices } from "@/features/admin/hooks/use-admin"
import { formatCurrency, formatDate } from "@/utils/format"
import { cn } from "@/utils/cn"
import { ROUTES } from "@/lib/constants"

function AdminServicesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function AdminServicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, error, refetch } = useAdminServices(page)

  if (isLoading) return <AdminServicesSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const services = data?.data || []
  const filtered = search
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.location.toLowerCase().includes(search.toLowerCase())
      )
    : services

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500">Consultez et gérez tous les services de la plateforme.</p>
        </div>
        <Link to={ROUTES.ADMIN_SERVICE_NEW}>
          <Button>
            <Plus className="h-4 w-4" />
            Ajouter un service
          </Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Rechercher un service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-gray-400" />}
          title="Aucun service"
          description={search ? "Aucun service ne correspond à votre recherche." : "Aucun service enregistré."}
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
                    <th className={cn("px-4 py-3 font-medium text-gray-500", STICKY_COL_CLASS)}>Nom</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Prestataire</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Catégorie</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Prix</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className={cn("px-4 py-3", STICKY_COL_CLASS)}>
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.location}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {service.provider?.business_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {service.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(service.price)}
                        {service.price_unit && (
                          <span className="text-xs text-gray-500"> / {service.price_unit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={service.is_active ? "success" : "secondary"}>
                          {service.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(service.created_at)}
                      </td>
                    </tr>
                  ))}
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

export default AdminServicesPage
