import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { favoritesService } from "@/services/favorites.service"

export function useFavorites(userId: string) {
  return useQuery({
    queryKey: ["favorites", userId],
    queryFn: () => favoritesService.getFavorites(userId),
    enabled: !!userId,
  })
}

export function useToggleFavorite(userId: string, serviceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const isFav = await favoritesService.isFavorite(userId, serviceId)
      if (isFav) {
        await favoritesService.removeFavorite(userId, serviceId)
        return false
      } else {
        await favoritesService.addFavorite(userId, serviceId)
        return true
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useIsFavorite(userId: string, serviceId: string) {
  return useQuery({
    queryKey: ["favorites", "check", userId, serviceId],
    queryFn: () => favoritesService.isFavorite(userId, serviceId),
    enabled: !!userId && !!serviceId,
  })
}
