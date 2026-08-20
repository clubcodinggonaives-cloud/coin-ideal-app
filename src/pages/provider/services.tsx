import { Link } from "react-router-dom"
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Star,
} from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { formatCurrency } from "@/utils/format"
import { ROUTES } from "@/lib/constants"
import { supabase } from "@/services/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Service } from "@/types"

function useProviderServices(userId: string) {
  return useQuery({
    queryKey: ["provider-services", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, category:categories(*)")
        .eq("provider_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Service[]
    },
    enabled: !!userId,
  })
}

function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("services").delete().eq("id", serviceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-services"] })
    },
  })
}

function ServicesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  )
}

function ProviderServicesPage() {
  const { user } = useAuth()
  const userId = user?.id || ""

  const { data: services, isLoading, error, refetch } = useProviderServices(userId)
  const deleteService = useDeleteService()

  if (isLoading) return <ServicesSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes services</h1>
          <p className="text-gray-500">Gérez vos services proposés.</p>
        </div>
        <Link to={ROUTES.PROVIDER_SERVICE_NEW}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service
          </Button>
        </Link>
      </div>

      {!services || services.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-gray-400" />}
          title="Aucun service"
          description="Vous n'avez pas encore créé de service. Commencez dès maintenant !"
          action={{
            label: "Créer un service",
            onClick: () => {
              window.location.href = ROUTES.PROVIDER_SERVICE_NEW
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {service.images && service.images[0] ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <Briefcase className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {service.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {service.rating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="font-medium text-primary-600">
                        {formatCurrency(service.price)}
                        {service.price_unit && (
                          <span className="text-xs text-gray-500"> / {service.price_unit}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={service.is_active ? "success" : "secondary"}>
                    {service.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  <Link to={`${ROUTES.PROVIDER_SERVICE_EDIT}/${service.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) {
                        deleteService.mutate(service.id)
                      }
                    }}
                    disabled={deleteService.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProviderServicesPage
