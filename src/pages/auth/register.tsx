import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react"
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { registerSchema, type RegisterFormData } from "@/lib/validators"

function RegisterPage() {
  const { signUp, isLoading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "client",
    },
  })

  const selectedRole = watch("role")

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null)
      await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription. Veuillez réessayer.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white">
              <span className="text-lg font-bold">CI</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Rejoignez COIN-IDEAL dès aujourd'hui
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.firstName?.message}
                {...register("firstName")}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>

            <Input
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Téléphone (optionnel)"
              type="tel"
              placeholder="+225 01 02 03 04"
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone?.message}
              {...register("phone")}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                helperText="Minimum 8 caractères"
                {...register("password")}
              />
            </div>

            <div className="relative">
              <Input
                label="Confirmer le mot de passe"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Je suis...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors ${
                    selectedRole === "client"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="client"
                    className="sr-only"
                    {...register("role")}
                  />
                  <div className="text-center">
                    <span className="block text-sm font-medium">Client</span>
                    <span className="text-xs text-gray-500">Je cherche des services</span>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors ${
                    selectedRole === "provider"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="provider"
                    className="sr-only"
                    {...register("role")}
                  />
                  <div className="text-center">
                    <span className="block text-sm font-medium">Prestataire</span>
                    <span className="text-xs text-gray-500">Je propose des services</span>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={authLoading}
            >
              {isSubmitting ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterPage
