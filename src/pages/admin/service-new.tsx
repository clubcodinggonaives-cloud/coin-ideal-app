import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save, Upload, X } from "lucide-react"
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
import { useAdminProviderOptions } from "@/features/admin/hooks/use-admin"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { serviceSchema, type ServiceFormData } from "@/lib/validators"
import { supabase } from "@/services/supabase/client"
import { uploadsService } from "@/services/uploads.service"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ROUTES } from "@/lib/constants"
import { slugify } from "@/utils/helpers"
import { useServiceImagePicker } from "@/features/services/hooks/use-service-image-picker"

/**
 * Pendant de provider/service-new.tsx, mais pour l'admin : ce dernier n'a
 * pas forcément (et n'a pas besoin d'avoir) son propre provider_profiles --
 * il choisit à quel prestataire rattacher le service. RLS
 * (services_admin_all / service_images_admin_all, 00055) autorise cet
 * insert pour is_admin(), là où services_insert_own l'aurait bloqué.
 */
function ServiceNewAdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: providers, isLoading: providersLoading } = useAdminProviderOptions()
  const imagePicker = useServiceImagePicker()
  const [providerId, setProviderId] = useState("")
  const [providerError, setProviderError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const { data: service, error } = await supabase
        .from("services")
        .insert({
          provider_id: providerId,
          slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
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

      for (let i = 0; i < imagePicker.files.length; i++) {
        const url = await uploadsService.uploadServiceImage(service.id, imagePicker.files[i])
        await supabase.from("service_images").insert({ service_id: service.id, url, sort_order: i })
      }

      return service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] })
      navigate(ROUTES.ADMIN_SERVICES)
    },
  })

  const categoryOptions = (categories || []).map((c) => ({ value: c.id, label: c.name }))
  const providerOptions = (providers || []).map((p) => ({
    value: p.id,
    label: p.business_name || "Prestataire sans nom",
  }))

  const onSubmit = (data: ServiceFormData) => {
    if (!providerId) {
      setProviderError("Sélectionnez un prestataire.")
      return
    }
    setProviderError(null)
    createService.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={ROUTES.ADMIN_SERVICES}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau service</h1>
          <p className="text-gray-500">Ajoutez un service pour l&apos;un des prestataires de la plateforme.</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Prestataire"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              error={providerError ?? undefined}
              options={providerOptions}
              placeholder={providersLoading ? "Chargement..." : "Sélectionnez un prestataire"}
              disabled={providersLoading}
            />

            <Input
              label="Nom du service"
              {...register("name")}
              error={errors.name?.message}
              placeholder="Ex: Impression noir et blanc"
            />

            <Textarea
              label="Description"
              {...register("description")}
              error={errors.description?.message}
              placeholder="Décrivez le service en détail..."
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
                placeholder="Ex: par page, par heure"
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
              {imagePicker.previews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {imagePicker.previews.map((url, i) => (
                    <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => imagePicker.removeAt(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Retirer cette photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400">
                <input
                  ref={imagePicker.inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => imagePicker.addFiles(e.target.files)}
                />
                <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">Glissez vos photos ici ou cliquez pour parcourir</p>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP jusqu&apos;à 5 Mo — max 5 photos</p>
              </label>
              {imagePicker.error && <p className="mt-1.5 text-sm text-red-600">{imagePicker.error}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to={ROUTES.ADMIN_SERVICES}>
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

export default ServiceNewAdminPage
