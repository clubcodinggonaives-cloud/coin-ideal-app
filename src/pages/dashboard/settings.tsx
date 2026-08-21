import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save, Upload } from "lucide-react"
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
import { authService } from "@/features/auth/services/auth.service"
import { profileSchema, type ProfileFormData } from "@/lib/validators"

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function DashboardSettingsPage() {
  const { user, profile, refreshProfile } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone || "",
        bio: profile.bio || "",
      })
    }
  }, [profile, reset])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return
    await authService.updateProfile(user.id, {
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      bio: data.bio || null,
    })
    await refreshProfile()
  }

  if (!profile) return <SettingsSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Gérez votre profil et vos préférences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo de profil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.first_name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
                  {profile.first_name?.charAt(0)}
                  {profile.last_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Changer la photo
              </Button>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG. Max 2 Mo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Prénom"
                {...register("firstName")}
                error={errors.firstName?.message}
              />
              <Input
                label="Nom"
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Téléphone"
              type="tel"
              {...register("phone")}
              error={errors.phone?.message}
              placeholder="+509 XX XX XXXX"
            />

            <Textarea
              label="Bio"
              {...register("bio")}
              error={errors.bio?.message}
              placeholder="Parlez-nous de vous..."
              rows={4}
            />

            <Input label="Email" value={profile.email} disabled helperText="L'email ne peut pas être modifié." />

            {isDirty && (
              <Alert variant="info">
                Vous avez des modifications non enregistrées.
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardSettingsPage
