import { Link } from "react-router-dom"
import { MapPin, Clock, BadgeCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rating } from "@/components/ui/rating"
import { ROUTES } from "@/lib/constants"
import { formatCurrency } from "@/utils/format"
import type { Service } from "@/types"

interface ServiceCardProps {
  service: Service
}

function ServiceCard({ service }: ServiceCardProps) {
  const provider = service.provider

  return (
    <Link to={`${ROUTES.SERVICE_DETAIL}/${service.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary-500/20">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-gray-100">
          {service.images && service.images[0] ? (
            <img
              src={service.images[0]}
              alt={service.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <span className="text-4xl">🔧</span>
            </div>
          )}
          {service.is_verified && (
            <div className="absolute left-3 top-3">
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="h-3 w-3" />
                Vérifié
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="space-y-3">
          <div>
            <h3 className="line-clamp-1 font-semibold text-gray-900 group-hover:text-primary-600">
              {service.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {service.description}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{service.location}</span>
          </div>

          {service.estimated_duration && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{service.estimated_duration}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <Rating value={service.rating} count={service.total_reviews} size="sm" />
            <div className="text-right">
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(service.price)}
              </span>
              {service.price_unit && (
                <span className="text-xs text-gray-500"> / {service.price_unit}</span>
              )}
            </div>
          </div>

          {provider && (
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                {provider.user_id?.charAt(0).toUpperCase() || "P"}
              </div>
              <span className="text-sm text-gray-600">
                {provider.business_name || "Prestataire"}
              </span>
              {provider.is_verified && (
                <BadgeCheck className="h-4 w-4 text-primary-500" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export { ServiceCard }
