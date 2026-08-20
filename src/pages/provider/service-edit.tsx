import { useEffect } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save, Upload } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Alert,
  Spinner,
  Skeleton,
  ErrorState,
} from "@/components/ui"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { serviceSchema, type ServiceFormData } from "@/lib/validators"
import { supabase } from "@/services/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ROUTES } from "@/lib/constants"
import type { Service } from "@/types"

function useServiceToEdit(serviceId: string) {
  return useQuery({
    queryKey: ["service-edit", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single()
      if (error) throw error
      return data as Service
    },
    enabled: !!serviceId,
  })
}

function ServiceEditSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[600px] rounded-xl" />
    </div>
  )
}

function ServiceEditPage() {
  const { id } = useParams<{ id: string }>()
  const serviceId = id || ""
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: service, isLoading, error, refetch } = useServiceToEdit(serviceId)
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        description: service.description,
        categoryId: service.category_id,
        price: service.price,
        priceUnit: service.price_unit || "",
        location: service.location,
        estimatedDuration: service.estimated_duration || "",
        conditions: service.conditions || "",
      })
    }
  }, [service, reset])

  const updateService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const { error } = await supabase
        .from("services")
        .update({
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          price: data.price,
          price_unit: data.priceUnit || null,
          location: data.location,
          estimated_duration: data.estimatedDuration || null,
          conditions: data.conditions || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-services"] })
      navigate(ROUTES.PROVIDER_SERVICES)
    },
  })

  if (isLoading) return <ServiceEditSkeleton />
  if (error || !service) return <ErrorState onRetry={refetch} />

  const categoryOptions = (categories || []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={ROUTES.PROVIDER_SERVICES}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le service</h1>
          <p className="text-gray-500">{service.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du service</CardTitle>
        </CardHeader>
        <CardContent>
          {updateService.isError && (
            <Alert variant="error" className="mb-4">
              Une erreur est survenue lors de la mise à jour.
            </Alert>
          )}

          <form
            onSubmit={handleSubmit((data) => updateService.mutate(data))}
            className="space-y-4"
          >
            <Input
              label="Nom du service"
              {...register("name")}
              error={errors.name?.message}
            />

            <Textarea
              label="Description"
              {...register("description")}
              error={errors.description?.message}
              rows={4}
            />

            <Select
              label="Catégorie"
              {...register("categoryId")}
              error={errors.categoryId?.message}
              options={categoryOptions}
              placeholder="Sélectionnez une catégorie"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Prix"
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                error={errors.price?.message}
              />
              <Input
                label="Unité de prix"
                {...register("priceUnit")}
                error={errors.priceUnit?.message}
              />
            </div>

            <Input
              label="Localisation"
              {...register("location")}
              error={errors.location?.message}
            />

            <Input
              label="Durée estimée"
              {...register("estimatedDuration")}
              error={errors.estimatedDuration?.message}
            />

            <Textarea
              label="Conditions"
              {...register("conditions")}
              error={errors.conditions?.message}
              rows={3}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Photos du service
              </label>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Glissez vos photos ici ou cliquez pour parcourir
                </p>
                <p className="mt-1 text-xs text-gray-400">PNG, JPG jusqu'à 5 Mo</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to={ROUTES.PROVIDER_SERVICES}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={updateService.isPending || !isDirty}>
                {updateService.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ServiceEditPage
