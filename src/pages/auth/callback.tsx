import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { dashboardPathForRole } from "@/features/auth/utils/dashboard-path"
import { ROUTES } from "@/lib/constants"

/**
 * Destination de `redirectTo` pour signInWithGoogle (auth.service.ts).
 * Cette route n'existait pas du tout avant — Supabase établissait bien la
 * session (detectSessionInUrl traite le retour OAuth sur n'importe quelle
 * page), mais React Router faisait tomber `/auth/callback` sur le
 * catch-all "*" (NotFoundPage, qui affiche littéralement "404"), d'où
 * l'erreur vue même en étant connecté.
 */
function AuthCallbackPage() {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      navigate(dashboardPathForRole(profile?.role), { replace: true })
    } else {
      navigate(ROUTES.LOGIN, { replace: true, state: { oauthError: true } })
    }
  }, [isLoading, isAuthenticated, profile, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner size="lg" />
    </div>
  )
}

export default AuthCallbackPage
