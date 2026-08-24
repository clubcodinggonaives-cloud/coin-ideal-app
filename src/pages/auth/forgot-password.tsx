import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, ArrowLeft } from "lucide-react"
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui"
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validators"
import { authService } from "@/features/auth/services/auth.service"
import { translateAuthError } from "@/features/auth/utils/translate-auth-error"
import { ROUTES } from "@/lib/constants"

function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      setSuccess(false)
      await authService.resetPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setError(translateAuthError(err, "Erreur lors de l'envoi. Veuillez réessayer."))
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
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
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
              Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.
            </Alert>
          )}

          {!success ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Adresse email"
                type="email"
                placeholder="votre@email.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccess(false)
                setError(null)
              }}
            >
              Renvoyer l'email
            </Button>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage
