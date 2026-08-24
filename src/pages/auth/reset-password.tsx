import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react"
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui"
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validators"
import { authService } from "@/features/auth/services/auth.service"
import { ROUTES } from "@/lib/constants"

function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null)
      setSuccess(false)
      await authService.updatePassword(data.password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du mot de passe.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Link to={ROUTES.HOME}>
              <img src="/logo.png" alt="COIN-IDEAL Multi-Service" className="h-14 w-14 object-contain" />
            </Link>
          </div>
          <CardTitle className="text-2xl">Réinitialiser le mot de passe</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Entrez votre nouveau mot de passe
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p>Votre mot de passe a été réinitialisé avec succès.</p>
              </div>
            </Alert>
          )}

          {!success ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Input
                  label="Nouveau mot de passe"
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

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Mise à jour..." : "Réinitialiser le mot de passe"}
              </Button>
            </form>
          ) : (
            <Link to="/auth/login">
              <Button
                type="button"
                variant="default"
                className="w-full"
              >
                Se connecter
              </Button>
            </Link>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link
                to="/auth/login"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Retour à la connexion
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPasswordPage
