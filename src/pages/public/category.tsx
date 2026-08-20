import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Skeleton, EmptyState } from "@/components/ui"
import { ServiceCard } from "@/components/shared/service-card"
import { Pagination } from "@/components/ui/pagination"
import { useCategory } from "@/features/categories/hooks/use-categories"
import { useServices } from "@/features/services/hooks/use-services"
import { ROUTES } from "@/lib/constants"
import type { SearchFilters } from "@/types"

function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState(1)

  const { data: category, isLoading: loadingCategory, error: categoryError } = useCategory(slug || "")

  const filters: SearchFilters = {
    category: category?.id,
    page,
  }

  const { data, isLoading: loadingServices } = useServices(filters)

  if (loadingCategory) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="mb-8 h-4 w-96" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white">
                <Skeleton className="aspect-[16/10] rounded-t-xl" />
                <div className="space-y-3 p-6">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (categoryError || !category) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title="Catégorie introuvable"
            description="La catégorie que vous recherchez n'existe pas ou a été supprimée."
            action={{ label: "Voir les services", onClick: () => window.location.href = ROUTES.SERVICES }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={ROUTES.HOME} className="hover:text-gray-700">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={ROUTES.SERVICES} className="hover:text-gray-700">Services</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">{category.name}</span>
          </nav>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">{category.name}</h1>
          {category.description && (
            <p className="mt-2 max-w-2xl text-gray-500">{category.description}</p>
          )}
          {data && (
            <p className="mt-1 text-sm text-gray-400">
              {data.count} service{data.count > 1 ? "s" : ""} disponible{data.count > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loadingServices ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white">
                <Skeleton className="aspect-[16/10] rounded-t-xl" />
                <div className="space-y-3 p-6">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((service) => (
                <ServiceCard key={service.id} service={service} />
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
            title="Aucun service dans cette catégorie"
            description="Aucun service n'est disponible dans cette catégorie pour le moment."
            action={{ label: "Voir tous les services", onClick: () => window.location.href = ROUTES.SERVICES }}
          />
        )}
      </div>
    </div>
  )
}

export default CategoryPage
