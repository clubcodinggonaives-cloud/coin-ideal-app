import { useState } from "react"
import { Star, MessageSquare } from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
  Textarea,
  Rating,
} from "@/components/ui"
import { ReviewCard } from "@/components/shared/review-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProvider } from "@/features/providers/hooks/use-providers"
import { useProviderReviews, useRespondToReview } from "@/features/reviews/hooks/use-reviews"

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

function ProviderReviewsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")

  const { data: provider } = useProvider(userId)
  const { data: reviews, isLoading, error, refetch } = useProviderReviews(userId)
  const respondToReview = useRespondToReview()

  if (isLoading) return <ReviewsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const handleRespond = () => {
    if (!respondingTo || !responseText.trim()) return
    respondToReview.mutate(
      { reviewId: respondingTo, response: responseText.trim() },
      {
        onSuccess: () => {
          setRespondingTo(null)
          setResponseText("")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avis reçus</h1>
        <p className="text-gray-500">Consultez et répondez aux avis de vos clients.</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <div className="flex flex-col items-center">
            <p className="text-4xl font-bold text-gray-900">
              {provider?.rating?.toFixed(1) || "0.0"}
            </p>
            <Rating value={provider?.rating || 0} size="md" />
            <p className="mt-1 text-sm text-gray-500">
              {provider?.total_reviews || 0} avis
            </p>
          </div>
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = (reviews || []).filter((r) => Math.round(r.rating) === stars).length
              const total = (reviews || []).length || 1
              return (
                <div key={stars} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-gray-500">{stars}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-400">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!reviews || reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-gray-400" />}
          title="Aucun avis"
          description="Vous n'avez pas encore reçu d'avis de vos clients."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id}>
              <ReviewCard review={review} reviewer={review.reviewer || undefined} />
              {!review.response && (
                <div className="mt-2 ml-12">
                  {respondingTo === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Écrivez votre réponse..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleRespond}
                          disabled={!responseText.trim() || respondToReview.isPending}
                        >
                          Répondre
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRespondingTo(null); setResponseText("") }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      <MessageSquare className="mr-1 h-3.5 w-3.5" />
                      Répondre
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProviderReviewsPage
