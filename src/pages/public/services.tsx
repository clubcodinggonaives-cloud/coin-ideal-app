import { useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { SlidersHorizontal, X } from "lucide-react"
import { Button, Select, Skeleton, EmptyState } from "@/components/ui"
import { ServiceCard } from "@/components/shared/service-card"
import { Pagination } from "@/components/ui/pagination"
import { useServices } from "@/features/services/hooks/use-services"
import { useCategories } from "@/features/categories/hooks/use-categories"
import type { SearchFilters } from "@/types"

const priceRanges = [
  { value: "", label: "Tous les prix" },
  { value: "0-100", label: "Moins de 100 HTG" },
  { value: "100-500", label: "100 - 500 HTG" },
  { value: "500-2000", label: "500 - 2 000 HTG" },
  { value: "2000-10000", label: "2 000 - 10 000 HTG" },
  { value: "10000+", label: "Plus de 10 000 HTG" },
]

const ratingOptions = [
  { value: "", label: "Toutes les notes" },
  { value: "4", label: "4 étoiles et plus" },
  { value: "3", label: "3 étoiles et plus" },
  { value: "2", label: "2 étoiles et plus" },
]

const sortOptions = [
  { value: "", label: "Trier par : Pertinence" },
  { value: "rating", label: "Trier par : Meilleures notes" },
  { value: "popular", label: "Trier par : Plus populaires" },
  { value: "price_asc", label: "Trier par : Prix croissant" },
  { value: "price_desc", label: "Trier par : Prix décroissant" },
]

function parsePriceRange(value: string): { min?: number; max?: number } {
  if (!value) return {}
  if (value === "10000+") return { min: 10000 }
  const [min, max] = value.split("-").map(Number)
  return { min, max }
}

function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const query = searchParams.get("q") || ""
  const category = searchParams.get("category") || ""
  const location = searchParams.get("location") || ""
  const priceRange = searchParams.get("price") || ""
  const minRating = searchParams.get("rating") || ""
  const isVerified = searchParams.get("verified") || ""
  const sortBy = searchParams.get("sort") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)

  const [localQuery, setLocalQuery] = useState(query)
  const [localLocation, setLocalLocation] = useState(location)
  // Garde la dernière valeur d'URL vue, pour détecter un changement externe
  // (navigation précédente/suivante) sans passer par un effet : la mise à
  // jour a lieu pendant le rendu plutôt qu'après, ce qui évite un rendu
  // en cascade inutile.
  const [syncedFromUrl, setSyncedFromUrl] = useState({ query, location })
  if (syncedFromUrl.query !== query || syncedFromUrl.location !== location) {
    setSyncedFromUrl({ query, location })
    setLocalQuery(query)
    setLocalLocation(location)
  }

  const { data: categories } = useCategories()

  const price = parsePriceRange(priceRange)

  const filters: SearchFilters = {
    query: query || undefined,
    category: category || undefined,
    location: location || undefined,
    minPrice: price.min,
    maxPrice: price.max,
    minRating: minRating ? Number(minRating) : undefined,
    isVerified: isVerified === "true" ? true : undefined,
    sortBy: (sortBy as SearchFilters["sortBy"]) || undefined,
    page,
  }

  const { data, isLoading, error } = useServices(filters)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(updates).forEach(([key, value]) => {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        })
        if (updates.page === undefined) {
          next.delete("page")
        }
        return next
      })
    },
    [setSearchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({
      q: localQuery,
      location: localLocation,
      page: "1",
    })
  }

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const clearFilters = () => {
    setSearchParams({})
  }

  const hasActiveFilters = category || priceRange || minRating || isVerified

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Rechercher un service..."
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Button type="submit" size="default">
                Rechercher
              </Button>
            </form>
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white">
                  !
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside
            className={`w-full shrink-0 space-y-6 lg:block lg:w-64 ${
              showFilters ? "block" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between lg:hidden">
              <h3 className="font-semibold text-gray-900">Filtres</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <Select
                label="Catégorie"
                placeholder="Toutes les catégories"
                options={[
                  { value: "", label: "Toutes les catégories" },
                  ...(categories?.map((c) => ({ value: c.id, label: c.name })) || []),
                ]}
                value={category}
                onChange={(e) => updateParams({ category: e.target.value, page: "1" })}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <Select
                label="Fourchette de prix"
                options={priceRanges}
                value={priceRange}
                onChange={(e) => updateParams({ price: e.target.value, page: "1" })}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <Select
                label="Note minimale"
                options={ratingOptions}
                value={minRating}
                onChange={(e) => updateParams({ rating: e.target.value, page: "1" })}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isVerified === "true"}
                  onChange={(e) => updateParams({ verified: e.target.checked ? "true" : "", page: "1" })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Prestataires vérifiés uniquement</span>
              </label>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                Effacer tous les filtres
              </Button>
            )}
          </aside>

          <main className="flex-1">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {data && (
                  <p className="text-sm text-gray-500">
                    {data.count} service{data.count > 1 ? "s" : ""} trouvé{data.count > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <Select
                aria-label="Trier les services"
                options={sortOptions}
                value={sortBy}
                onChange={(e) => updateParams({ sort: e.target.value, page: "1" })}
                className="w-full sm:w-56"
              />
            </div>

            {isLoading ? (
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
            ) : error ? (
              <EmptyState
                title="Erreur de chargement"
                description="Une erreur est survenue lors du chargement des services. Veuillez réessayer."
              />
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
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title="Aucun service trouvé"
                description={
                  hasActiveFilters || query
                    ? "Aucun service ne correspond à vos critères. Essayez de modifier vos filtres."
                    : "Aucun service n'est disponible pour le moment."
                }
                action={
                  hasActiveFilters
                    ? { label: "Effacer les filtres", onClick: clearFilters }
                    : undefined
                }
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default ServicesPage
