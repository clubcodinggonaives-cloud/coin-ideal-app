import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { providersService } from "@/services/providers.service"

export function useProviders(page = 1) {
  return useQuery({
    queryKey: ["providers", page],
    queryFn: () => providersService.getProviders(page),
  })
}

export function useProvider(userId: string) {
  return useQuery({
    queryKey: ["provider", userId],
    queryFn: () => providersService.getProviderById(userId),
    enabled: !!userId,
  })
}

export function useRecommendedProviders(limit = 6) {
  return useQuery({
    queryKey: ["providers", "recommended", limit],
    queryFn: () => providersService.getRecommendedProviders(limit),
  })
}

export function useUpdateProviderProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<any> }) =>
      providersService.updateProviderProfile(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["provider", userId] })
    },
  })
}
