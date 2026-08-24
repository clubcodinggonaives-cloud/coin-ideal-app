import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
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
  Skeleton,
  ErrorState,
} from "@/components/ui"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { serviceSchema, type ServiceFormData } from "@/lib/validators"
import { supabase } from "@/services/supabase/client"
import { uploadsService } from "@/services/uploads.service"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ROUTES } from "@/lib/constants"
import type { Service } from "@/types"

interface ServiceImageRow {
  id: string
  url: string
  sort_order: number
}

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

function useServiceImages(serviceId: string) {
  return useQuery({
    queryKey: ["service-images", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_images")
        .select("id, url, sort_order")
        .eq("service_id", serviceId)
        .order("sort_order", { ascending: true })
      if (error) throw error
      return (data ?? []) as ServiceImageRow[]
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
  const { data: images } = useServiceImages(serviceId)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadsService.uploadServiceImage(serviceId, file)
      const nextSortOrder = images?.length ?? 0
      const { error: insertError } = await supabase
        .from("service_images")
        .insert({ service_id: serviceId, url, sort_order: nextSortOrder })
      if (insertError) throw insertError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-images", serviceId] })
      queryClient.invalidateQueries({ queryKey: ["provider-services"] })
    },
  })

  const deleteImage = useMutation({
    mutationFn: async (image: ServiceImageRow) => {
      const { error: deleteError } = await supabase.from("service_images").delete().eq("id", image.id)
      if (deleteError) throw deleteError

      // best-effort: le fichier storage n'est plus référencé, mais on ne
      // fait pas échouer la suppression si ce nettoyage rate (chemin déjà
      // supprimé, URL d'un ancien format, etc.)
      const match = image.url.match(/\/service-images\/(.+)$/)
      if (match) {
        await uploadsService.deleteFile("service-images", decodeURIComponent(match[1])).catch(() => {})
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-images", serviceId] })
      queryClient.invalidateQueries({ queryKey: ["provider-services"] })
    },
  })

  const handleImageSelect = async (fileList: FileList | null) => {
    if (!fileList) return
    setImageError(null)
    const files = Array.from(fileList).slice(0, 5 - (images?.length ?? 0))
    if (files.length === 0) {
      setImageError("Maximum 5 photos par service.")
      return
    }
    setIsUploadingImage(true)
    try {
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setImageError("Format non supporté. Utilisez JPG, PNG ou WEBP.")
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setImageError(`"${file.name}" dépasse 5 Mo.`)
          continue
        }
        await uploadImage.mutateAsync(file)
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Erreur lors du téléversement.")
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ""
    }
  }

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
              {images && images.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {images.map((image) => (
                    <div key={image.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deleteImage.mutate(image)}
                        disabled={deleteImage.isPending}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Supprimer cette photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={isUploadingImage || (images?.length ?? 0) >= 5}
                  onChange={(e) => handleImageSelect(e.target.files)}
                />
                {isUploadingImage ? (
                  <Spinner className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                ) : (
                  <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                )}
                <p className="text-sm text-gray-500">
                  {isUploadingImage ? "Téléversement..." : "Glissez vos photos ici ou cliquez pour parcourir"}
                </p>
                <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP jusqu'à 5 Mo — max 5 photos</p>
              </label>
              {imageError && <p className="mt-1.5 text-sm text-red-600">{imageError}</p>}
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
