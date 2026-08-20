import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  MapPin,
  Clock,
  BadgeCheck,
  Heart,
  Send,
  ChevronRight,
  FileText,
  Calendar,
  ImageOff,
} from "lucide-react"
import { Button, Skeleton, Rating, Badge, Card, CardContent, EmptyState, Avatar } from "@/components/ui"
import { ReviewCard } from "@/components/shared/review-card"
import { useService } from "@/features/services/hooks/use-services"
import { useServiceReviews } from "@/features/reviews/hooks/use-reviews"
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/hooks/use-favorites"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/lib/constants"
import { formatCurrency } from "@/utils/format"

function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [selectedImage, setSelectedImage] = useState(0)

  const { data: service, isLoading: loadingService, error: serviceError } = useService(id || "")
  const { data: reviews = [], isLoading: loadingReviews } = useServiceReviews(id || "")
  const { data: isFav, isLoading: loadingFav } = useIsFavorite(user?.id || "", id || "")
  const toggleFav = useToggleFavorite(user?.id || "", id || "")

  if (loadingService) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="mb-6 aspect-video w-full rounded-xl" />
          <Skeleton className="mb-4 h-8 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-6 h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (serviceError || !service) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Service introuvable"
            description="Ce service n'existe pas ou n'est plus disponible."
            action={{ label: "Voir les services", onClick: () => navigate(ROUTES.SERVICES) }}
          />
        </div>
      </div>
    )
  }

  const provider = service.provider
  const hasImages = service.images && service.images.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={ROUTES.HOME} className="hover:text-gray-700">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={ROUTES.SERVICES} className="hover:text-gray-700">Services</Link>
            <ChevronRight className="h-4 w-4" />
            {service.category && (
              <>
                <Link to={`${ROUTES.SERVICES}/${service.category.slug}`} className="hover:text-gray-700">
                  {service.category.name}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="truncate text-gray-900">{service.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {hasImages ? (
              <div className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={service.images![selectedImage]}
                    alt={service.name}
                    className="h-full w-full object-cover"
                  />
                  {service.is_verified && (
                    <div className="absolute left-3 top-3">
                      <Badge variant="success" className="gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        Vérifié
                      </Badge>
                    </div>
                  )}
                </div>
                {service.images!.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {service.images!.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                          i === selectedImage ? "border-primary-500" : "border-transparent"
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100">
                <div className="text-center text-gray-400">
                  <ImageOff className="mx-auto h-12 w-12" />
                  <p className="mt-2 text-sm">Aucune image</p>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Rating value={service.rating} count={service.total_reviews} size="lg" />
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  <span>{service.location}</span>
                </div>
                {service.estimated_duration && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{service.estimated_duration}</span>
                  </div>
                )}
                {service.category && (
                  <Badge variant="secondary">{service.category.name}</Badge>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                <p className="mt-3 whitespace-pre-line text-gray-600">{service.description}</p>
              </CardContent>
            </Card>

            {service.conditions && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <FileText className="h-5 w-5" />
                    Conditions
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-gray-600">{service.conditions}</p>
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Avis ({reviews.length})
              </h2>
              {loadingReviews ? (
                <div className="mt-4 space-y-4">
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
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      reviewer={review.reviewer}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">Aucun avis pour ce service.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <span className="text-3xl font-bold text-primary-600">
                    {formatCurrency(service.price)}
                  </span>
                  {service.price_unit && (
                    <span className="text-sm text-gray-500"> / {service.price_unit}</span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {service.estimated_duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Durée estimée : {service.estimated_duration}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{service.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{service.total_orders} commande{service.total_orders > 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {isAuthenticated ? (
                    <Button className="w-full" size="lg">
                      <Send className="h-4 w-4" />
                      Demander ce service
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => navigate(ROUTES.LOGIN)}
                    >
                      <Send className="h-4 w-4" />
                      Se connecter pour demander
                    </Button>
                  )}
                  {isAuthenticated && user && (
                    <Button
                      variant={isFav ? "default" : "outline"}
                      className="w-full"
                      size="lg"
                      onClick={() => toggleFav.mutate()}
                      disabled={toggleFav.isPending || loadingFav}
                    >
                      <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                      {isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                    </Button>
                  )}
                </div>

                {provider && (
                  <Link
                    to={`${ROUTES.PROVIDER_DETAIL}/${provider.user_id}`}
                    className="group flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                  >
                    <Avatar
                      src={null}
                      fallback={provider.business_name || "P"}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="truncate font-medium text-gray-900 group-hover:text-primary-600">
                          {provider.business_name || "Prestataire"}
                        </p>
                        {provider.is_verified && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-primary-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Rating value={provider.rating} count={provider.total_reviews} size="sm" />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-500" />
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailPage
