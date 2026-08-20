import { useState } from "react"
import { Skeleton, EmptyState } from "@/components/ui"
import { ProviderCard } from "@/components/shared/provider-card"
import { Pagination } from "@/components/ui/pagination"
import { useProviders } from "@/features/providers/hooks/use-providers"

function ProvidersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useProviders(page)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">Prestataires</h1>
          <p className="mt-1 text-gray-500">
            Découvrez nos prestataires vérifiés et leurs services
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <Skeleton className="mx-auto h-20 w-20 rounded-full" />
                <Skeleton className="mx-auto mt-4 h-5 w-32" />
                <Skeleton className="mx-auto mt-2 h-4 w-24" />
                <Skeleton className="mx-auto mt-2 h-4 w-20" />
                <Skeleton className="mx-auto mt-4 h-6 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title="Erreur de chargement"
            description="Une erreur est survenue lors du chargement des prestataires."
          />
        ) : data && data.data.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {data.count} prestataire{data.count > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={(p) => {
                  setPage(p)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="Aucun prestataire"
            description="Aucun prestataire n'est disponible pour le moment."
          />
        )}
      </div>
    </div>
  )
}

export default ProvidersPage
