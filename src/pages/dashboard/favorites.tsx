import { Heart } from "lucide-react"
import { Button, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { ServiceCard } from "@/components/shared/service-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useFavorites } from "@/features/favorites/hooks/use-favorites"
import { favoritesService } from "@/services/favorites.service"
import { useMutation, useQueryClient } from "@tanstack/react-query"

function useRemoveFavorite(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (serviceId: string) => favoritesService.removeFavorite(userId, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

function FavoritesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/10] rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardFavoritesPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const { data: favorites, isLoading, error, refetch } = useFavorites(userId)
  const removeFavorite = useRemoveFavorite(userId)

  if (isLoading) return <FavoritesSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const services = (favorites || []).map((f) => f.service).filter(Boolean)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
        <p className="text-gray-500">Retrouvez les services que vous avez sauvegardés.</p>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8 text-gray-400" />}
          title="Aucun favori"
          description="Vous n'avez pas encore ajouté de services en favoris. Parcourez nos services et cliquez sur le cœur pour les sauvegarder."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites?.map((fav) =>
            fav.service ? (
              <div key={fav.id} className="relative">
                <ServiceCard service={fav.service} />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2 z-10"
                  onClick={() => removeFavorite.mutate(fav.service_id)}
                  disabled={removeFavorite.isPending}
                >
                  Retirer
                </Button>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardFavoritesPage
