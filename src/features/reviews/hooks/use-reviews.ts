import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { reviewsService } from "@/services/reviews.service"

export function useProviderReviews(providerId: string) {
  return useQuery({
    queryKey: ["reviews", "provider", providerId],
    queryFn: () => reviewsService.getReviewsByProvider(providerId),
    enabled: !!providerId,
  })
}

export function useServiceReviews(serviceId: string) {
  return useQuery({
    queryKey: ["reviews", "service", serviceId],
    queryFn: () => reviewsService.getReviewsByService(serviceId),
    enabled: !!serviceId,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reviewsService.createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
    },
  })
}

export function useRespondToReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      reviewsService.respondToReview(reviewId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
    },
  })
}
