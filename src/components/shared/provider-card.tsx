import { Link } from "react-router-dom"
import { MapPin, BadgeCheck, Briefcase } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rating } from "@/components/ui/rating"
import { Avatar } from "@/components/ui/avatar"
import { ROUTES } from "@/lib/constants"
import type { ProviderProfile, Profile } from "@/types"

interface ProviderCardProps {
  provider: ProviderProfile
  profile?: Profile
}

function ProviderCard({ provider, profile }: ProviderCardProps) {
  const displayName = provider.business_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Prestataire"

  return (
    <Link to={`${ROUTES.PROVIDER_DETAIL}/${provider.user_id}`}>
      <Card className="group cursor-pointer text-center transition-all hover:shadow-md hover:ring-2 hover:ring-primary-500/20">
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-center">
            <Avatar
              src={profile?.avatar_url}
              alt={displayName}
              fallback={displayName}
              size="xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
                {displayName}
              </h3>
              {provider.is_verified && (
                <BadgeCheck className="h-4.5 w-4.5 text-primary-500" />
              )}
            </div>
            {provider.specialties && provider.specialties.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {provider.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Rating value={provider.rating} count={provider.total_reviews} size="sm" />
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            {provider.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{provider.location}</span>
              </div>
            )}
            {provider.total_completed > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{provider.total_completed} prestations</span>
              </div>
            )}
          </div>

          {provider.is_available && (
            <Badge variant="success" className="mx-auto">
              Disponible
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export { ProviderCard }
