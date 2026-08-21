import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Save } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Skeleton,
  Alert,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProvider, useUpdateProviderProfile } from "@/features/providers/hooks/use-providers"

interface ProviderProfileForm {
  businessName: string
  description: string
  specialties: string
  experienceYears: number
  location: string
  isAvailable: boolean
}

function ProviderProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function ProviderProfilePage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const { data: provider, isLoading } = useProvider(userId)
  const updateProfile = useUpdateProviderProfile()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProviderProfileForm>()

  useEffect(() => {
    if (provider) {
      reset({
        businessName: provider.business_name || "",
        description: provider.description || "",
        specialties: provider.specialties?.join(", ") || "",
        experienceYears: provider.experience_years || 0,
        location: provider.location || "",
        isAvailable: provider.is_available,
      })
    }
  }, [provider, reset])

  if (isLoading || !provider) return <ProviderProfileSkeleton />

  const onSubmit = (data: ProviderProfileForm) => {
    updateProfile.mutate({
      userId,
      data: {
        business_name: data.businessName || null,
        description: data.description || null,
        specialties: data.specialties
          ? data.specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        experience_years: data.experienceYears || null,
        location: data.location || null,
        is_available: data.isAvailable,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil prestataire</h1>
        <p className="text-gray-500">Gérez les informations publiques de votre activité.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du business</CardTitle>
        </CardHeader>
        <CardContent>
          {updateProfile.isError && (
            <Alert variant="error" className="mb-4">
              Une erreur est survenue lors de la mise à jour.
            </Alert>
          )}
          {updateProfile.isSuccess && (
            <Alert variant="success" className="mb-4">
              Profil mis à jour avec succès.
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nom du business"
              {...register("businessName")}
              error={errors.businessName?.message}
              placeholder="Ex: COIN-IDEAL Multi-Service"
            />

            <Textarea
              label="Description"
              {...register("description")}
              error={errors.description?.message}
              placeholder="Décrivez votre activité..."
              rows={4}
            />

            <Input
              label="Spécialités"
              {...register("specialties")}
              error={errors.specialties?.message}
              placeholder="Ex: plomberie, électricité, maçonnerie (séparées par des virgules)"
              helperText="Séparez les spécialités par des virgules"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Années d'expérience"
                type="number"
                {...register("experienceYears", { valueAsNumber: true })}
                error={errors.experienceYears?.message}
              />
              <Input
                label="Localisation"
                {...register("location")}
                error={errors.location?.message}
                placeholder="Ex: Ruelle Sajous, Gonaïves"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  {...register("isAvailable")}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {watch("isAvailable") ? "Disponible" : "Non disponible"}
                </p>
                <p className="text-xs text-gray-500">
                  Indiquez si vous acceptez actuellement de nouvelles demandes.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProviderProfilePage
