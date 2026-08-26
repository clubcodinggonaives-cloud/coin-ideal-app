import { useState } from "react"
import { Briefcase, FileText, Search, ShieldCheck, ShieldOff, Star } from "lucide-react"
import {
  Card,
  CardContent,
  Button,
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
import { useAdminProviders, useVerifyProvider } from "@/features/admin/hooks/use-admin"
import { formatDate } from "@/utils/format"
import { cn } from "@/utils/cn"
import { uploadsService } from "@/services/uploads.service"

function AdminProvidersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function AdminProvidersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [documentLoadingId, setDocumentLoadingId] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useAdminProviders(page)
  const verifyProvider = useVerifyProvider()

  const handleViewDocument = async (userId: string) => {
    setDocumentLoadingId(userId)
    try {
      const files = await uploadsService.listProviderDocuments(userId)
      if (files.length === 0) {
        window.alert("Aucune pièce légale n'a été téléversée par ce prestataire.")
        return
      }
      const url = await uploadsService.getProviderDocumentUrl(files[files.length - 1].path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      window.alert("Impossible de charger le document pour le moment.")
    } finally {
      setDocumentLoadingId(null)
    }
  }

  if (isLoading) return <AdminProvidersSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const providers = data?.data || []
  const filtered = search
    ? providers.filter(
        (p) =>
          p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.profiles?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.profiles?.last_name?.toLowerCase().includes(search.toLowerCase())
      )
    : providers

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prestataires</h1>
        <p className="text-gray-500">Gérez les comptes prestataires de la plateforme.</p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Rechercher un prestataire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-gray-400" />}
          title="Aucun prestataire"
          description={search ? "Aucun prestataire ne correspond à votre recherche." : "Aucun prestataire enregistré."}
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
                    <th className="px-4 py-3 font-medium text-gray-500">Business</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Note</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Vérifié</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Inscrit le</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className={cn("px-4 py-3", STICKY_COL_CLASS)}>
                        <p className="font-medium text-gray-900">
                          {provider.profiles
                            ? `${provider.profiles.first_name} ${provider.profiles.last_name}`
                            : "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {provider.business_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {provider.rating?.toFixed(1) || "0.0"}
                          <span className="text-xs text-gray-500">
                            ({provider.total_reviews})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={provider.is_verified ? "success" : "secondary"}>
                          {provider.is_verified ? "Vérifié" : "Non vérifié"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(provider.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(provider.user_id)}
                            disabled={documentLoadingId === provider.user_id}
                            aria-label="Voir la pièce légale"
                            title="Voir la pièce légale"
                          >
                            <FileText className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              verifyProvider.mutate({ userId: provider.user_id, isVerified: !provider.is_verified })
                            }
                            disabled={verifyProvider.isPending}
                            aria-label={provider.is_verified ? "Retirer la vérification" : "Vérifier ce prestataire"}
                            title={provider.is_verified ? "Retirer la vérification" : "Vérifier ce prestataire"}
                          >
                            {provider.is_verified ? (
                              <ShieldOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
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

export default AdminProvidersPage
