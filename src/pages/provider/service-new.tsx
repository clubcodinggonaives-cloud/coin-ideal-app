import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save, Upload } from "lucide-react"
import { Link } from "react-router-dom"
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
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { serviceSchema, type ServiceFormData } from "@/lib/validators"
import { supabase } from "@/services/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ROUTES } from "@/lib/constants"

function ServiceNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!user?.id) throw new Error("Non authentifié")

      const { data: service, error } = await supabase
        .from("services")
        .insert({
          provider_id: user.id,
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          price: data.price,
          price_unit: data.priceUnit || null,
          location: data.location,
          estimated_duration: data.estimatedDuration || null,
          conditions: data.conditions || null,
          is_active: true,
          is_verified: false,
          rating: 0,
          total_reviews: 0,
          total_orders: 0,
        })
        .select()
        .single()

      if (error) throw error
      return service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-services"] })
      navigate(ROUTES.PROVIDER_SERVICES)
    },
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Nouveau service</h1>
          <p className="text-gray-500">Créez un nouveau service à proposer.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du service</CardTitle>
        </CardHeader>
        <CardContent>
          {createService.isError && (
            <Alert variant="error" className="mb-4">
              Une erreur est survenue lors de la création du service.
            </Alert>
          )}

          <form
            onSubmit={handleSubmit((data) => createService.mutate(data))}
            className="space-y-4"
          >
            <Input
              label="Nom du service"
              {...register("name")}
              error={errors.name?.message}
              placeholder="Ex: Plomberie professionnelle"
            />

            <Textarea
              label="Description"
              {...register("description")}
              error={errors.description?.message}
              placeholder="Décrivez votre service en détail..."
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
                placeholder="0"
              />
              <Input
                label="Unité de prix"
                {...register("priceUnit")}
                error={errors.priceUnit?.message}
                placeholder="Ex: par heure, par jour"
              />
            </div>

            <Input
              label="Localisation"
              {...register("location")}
              error={errors.location?.message}
              placeholder="Ex: Ruelle Sajous, Gonaïves"
            />

            <Input
              label="Durée estimée"
              {...register("estimatedDuration")}
              error={errors.estimatedDuration?.message}
              placeholder="Ex: 2 heures, 1 jour"
            />

            <Textarea
              label="Conditions"
              {...register("conditions")}
              error={errors.conditions?.message}
              placeholder="Conditions particulières, prérequis..."
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
              <Button type="submit" disabled={createService.isPending}>
                {createService.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer le service
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

export default ServiceNewPage
