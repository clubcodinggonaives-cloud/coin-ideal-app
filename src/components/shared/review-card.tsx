import { Card, CardContent } from "@/components/ui/card"
import { Rating } from "@/components/ui/rating"
import { Avatar } from "@/components/ui/avatar"
import { formatRelativeTime } from "@/utils/format"
import type { Review, Profile } from "@/types"

interface ReviewCardProps {
  review: Review
  reviewer?: Profile
}

function ReviewCard({ review, reviewer }: ReviewCardProps) {
  const displayName = reviewer
    ? `${reviewer.first_name} ${reviewer.last_name}`
    : "Utilisateur"

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={reviewer?.avatar_url}
              alt={displayName}
              fallback={displayName}
              size="md"
            />
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(review.created_at)}
              </p>
            </div>
          </div>
          <Rating value={review.rating} size="sm" />
        </div>

        <p className="text-sm text-gray-600">{review.comment}</p>

        {review.response && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs font-medium text-gray-700">Réponse du prestataire :</p>
            <p className="text-sm text-gray-600">{review.response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { ReviewCard }
