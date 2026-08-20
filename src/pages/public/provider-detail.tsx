import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  MapPin,
  BadgeCheck,
  Briefcase,
  Clock,
  MessageSquare,
  Send,
  ChevronRight,
  Star,
  Wrench,
} from "lucide-react"
import { Button, Skeleton, Rating, Badge, Card, CardContent, EmptyState, Avatar } from "@/components/ui"
import { ReviewCard } from "@/components/shared/review-card"
import { ServiceCard } from "@/components/shared/service-card"
import { useProvider } from "@/features/providers/hooks/use-providers"
import { useProviderReviews } from "@/features/reviews/hooks/use-reviews"
import { useServices } from "@/features/services/hooks/use-services"
import { ROUTES } from "@/lib/constants"

function ProviderDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [showAllServices] = useState(false)

  const { data: provider, isLoading: loadingProvider, error: providerError } = useProvider(userId || "")
  const { data: reviews = [], isLoading: loadingReviews } = useProviderReviews(userId || "")
  const { data: servicesData, isLoading: loadingServices } = useServices({
    page: 1,
    pageSize: showAllServices ? 100 : 6,
  })

  const providerServices = servicesData?.data.filter((s) => s.provider_id === userId)

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Skeleton className="h-32 w-32 shrink-0 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (providerError || !provider) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Prestataire introuvable"
            description="Ce prestataire n'existe pas ou n'est plus disponible."
            action={{ label: "Voir les prestataires", onClick: () => navigate(ROUTES.PROVIDERS) }}
          />
        </div>
      </div>
    )
  }

  const displayName =
    provider.business_name || `Prestataire`
  const displaySpecialties = provider.specialties || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={ROUTES.HOME} className="hover:text-gray-700">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={ROUTES.PROVIDERS} className="hover:text-gray-700">Prestataires</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">{displayName}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Avatar
                fallback={displayName}
                size="xl"
              />

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                  {provider.is_verified && (
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      Vérifié
                    </Badge>
                  )}
                  {provider.is_available && (
                    <Badge variant="secondary">Disponible</Badge>
                  )}
                </div>

                {displaySpecialties.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {displaySpecialties.map((specialty) => (
                      <Badge key={specialty} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 sm:justify-start">
                  <Rating value={provider.rating} count={provider.total_reviews} size="md" />
                  {provider.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{provider.location}</span>
                    </div>
                  )}
                  {provider.experience_years != null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{provider.experience_years} an{provider.experience_years > 1 ? "s" : ""} d'expérience</span>
                    </div>
                  )}
                  {provider.total_completed > 0 && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{provider.total_completed} prestations</span>
                    </div>
                  )}
                </div>

                {provider.description && (
                  <p className="mt-4 max-w-2xl text-gray-600">{provider.description}</p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg">
                    <MessageSquare className="h-4 w-4" />
                    Contacter
                  </Button>
                  <Button variant="outline" size="lg">
                    <Send className="h-4 w-4" />
                    Demander un service
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <Wrench className="h-5 w-5" />
                Services proposés
              </h2>
            </div>
            {loadingServices ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
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
            ) : providerServices && providerServices.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {providerServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun service publié pour le moment.</p>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-6">
              <Star className="h-5 w-5" />
              Avis ({reviews.length})
            </h2>
            {loadingReviews ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    reviewer={review.reviewer}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun avis pour ce prestataire.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProviderDetailPage
