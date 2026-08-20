import { useState } from "react"
import { MessageSquare } from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
  Rating,
  Pagination,
} from "@/components/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/services/supabase/client"
import { formatDate } from "@/utils/format"
import type { Review } from "@/types"
import { PAGE_SIZE } from "@/lib/constants"

function useAdminReviews(page: number) {
  return useQuery({
    queryKey: ["admin", "reviews", page],
    queryFn: async () => {
      const pageSize = PAGE_SIZE
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email), provider:provider_profiles!reviews_provider_id_fkey(business_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error
      const total = count ?? 0
      return {
        data: (data ?? []) as (Review & { reviewer: { first_name: string; last_name: string; email: string } | null; provider: { business_name: string } | null })[],
        count: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    },
  })
}

function useDeleteReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] })
    },
  })
}

function AdminReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-72" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

function AdminReviewsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useAdminReviews(page)
  const deleteReview = useDeleteReview()

  if (isLoading) return <AdminReviewsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const reviews = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modération des avis</h1>
        <p className="text-gray-500">Consultez et modérez les avis des utilisateurs.</p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-gray-400" />}
          title="Aucun avis"
          description="Aucun avis à modérer pour le moment."
        />
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Rating value={review.rating} size="sm" />
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {review.reviewer && (
                          <span>
                            Auteur : {review.reviewer.first_name} {review.reviewer.last_name} ({review.reviewer.email})
                          </span>
                        )}
                        {review.provider && (
                          <span>Prestataire : {review.provider.business_name}</span>
                        )}
                      </div>
                      {review.response && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="mb-1 text-xs font-medium text-gray-700">Réponse :</p>
                          <p className="text-sm text-gray-600">{review.response}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Supprimer cet avis ?")) {
                            deleteReview.mutate(review.id)
                          }
                        }}
                        disabled={deleteReview.isPending}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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

export default AdminReviewsPage
