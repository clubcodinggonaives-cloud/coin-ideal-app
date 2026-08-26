import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { translateAuthError } from "@/features/auth/utils/translate-auth-error"
import { dashboardPathForRole } from "@/features/auth/utils/dashboard-path"
import { consumeIdleTimeoutFlag } from "@/features/auth/hooks/use-idle-timeout"
import { loginSchema, type LoginFormData } from "@/lib/validators"
import { ROUTES } from "@/lib/constants"

function LoginPage() {
  const { signIn, signInWithGoogle, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const state = location.state as { oauthError?: boolean } | null
    if (state?.oauthError) {
      setError("La connexion avec Google a échoué. Veuillez réessayer.")
    } else if (consumeIdleTimeoutFlag()) {
      setError("Votre session a expiré après une période d'inactivité.")
    }
  }, [location.state])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      setSuccess(null)
      const { profile } = await signIn(data.email, data.password)
      // BUG FOUND VIA E2E (Phase 4): this component previously never
      // navigated after a successful signIn — the user stayed stuck on
      // /auth/login with no feedback and no way forward except manually
      // typing a URL. `from` supports the redirect-back-after-login pattern
      // already used elsewhere (e.g. src/pages/order/document.tsx) and takes
      // priority; otherwise land on the dashboard matching the account's
      // actual role instead of always the client one.
      const from = (location.state as { from?: Location } | null)?.from
      navigate(from?.pathname ?? dashboardPathForRole(profile?.role), { replace: true })
    } catch (err) {
      setError(translateAuthError(err, "Erreur de connexion. Veuillez réessayer."))
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      await signInWithGoogle()
    } catch (err) {
      setError(translateAuthError(err, "Erreur de connexion avec Google."))
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
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Connectez-vous à votre compte COIN-IDEAL
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" onClose={() => setSuccess(null)} className="mb-6">
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
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
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={authLoading}
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || authLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuer avec Google
          </Button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <Link
              to="/auth/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
