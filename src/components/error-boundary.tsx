import { Component, type ReactNode } from "react"
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Un seul signal transitoire, dev-only, connu : la course entre le
 * réoptimiseur de dépendances de Vite et l'import() d'une route lazy pas
 * encore visitée pendant la session (confirmée par test — voir
 * docs/phase-5/REACT_QUERY_RUNTIME_ERROR_REPORT.md, section "Evidence").
 * Ce n'est PAS un correctif qui masque l'erreur : elle reste loggée en
 * entier dans la console ; on évite juste de laisser l'utilisateur bloqué
 * sur une page morte pour un problème qu'un simple rechargement résout
 * déjà — exactement ce que Vite fait lui-même nativement pour les échecs
 * de fetch d'import dynamique, étendu ici au seul autre signal observé qui
 * n'est pas déjà couvert par ce mécanisme natif. Ne s'active jamais en
 * production (pas de réoptimiseur de dépendances sur un bundle statique).
 */
const TRANSIENT_DEV_SIGNATURE = /Cannot read properties of null.*useContext/i
const RELOAD_GUARD_KEY = "coin-ideal:route-error-auto-reload"

function describeError(error: unknown): { title: string; detail: string } {
  if (isRouteErrorResponse(error)) {
    return { title: `Erreur ${error.status}`, detail: error.statusText || String(error.data ?? "") }
  }
  if (error instanceof Error) {
    return { title: error.name || "Erreur", detail: error.stack || error.message }
  }
  return { title: "Erreur inconnue", detail: String(error) }
}

function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { title, detail } = describeError(error)

  // Toujours loggé — jamais supprimé, seulement affiché différemment à l'utilisateur.
  console.error("[RouteErrorBoundary]", error)

  if (import.meta.env.DEV && TRANSIENT_DEV_SIGNATURE.test(detail)) {
    const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY)
    if (!alreadyReloaded) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1")
      window.location.reload()
      return null
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-gray-500">
        Quelque chose s&apos;est mal passé en chargeant cette page. Vous pouvez réessayer ou
        retourner à l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/")}>
          Retour à l&apos;accueil
        </Button>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
      {import.meta.env.DEV && (
        <details className="mt-4 max-w-2xl text-left text-xs text-gray-400">
          <summary className="cursor-pointer text-gray-500">{title} (détails, dev uniquement)</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{detail}</pre>
        </details>
      )}
    </div>
  )
}

interface AppErrorBoundaryState {
  error: Error | null
}

/**
 * Filet de sécurité racine — pour toute erreur qui se produirait en dehors
 * de l'arbre du routeur (ex. dans `Providers` lui-même), là où l'`errorElement`
 * de React Router ne peut pas intervenir. Le cas rapporté (useSubmitContactMessage)
 * est capturé par `RouteErrorBoundary` via les `errorElement` du routeur, pas
 * par celui-ci — ce composant est un filet supplémentaire, pas le correctif.
 */
class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[AppErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">L&apos;application n&apos;a pas pu démarrer</h1>
          <p className="max-w-md text-sm text-gray-500">
            Veuillez recharger la page. Si le problème persiste, contactez le support.
          </p>
          <Button onClick={() => window.location.reload()}>Recharger</Button>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-w-2xl overflow-x-auto whitespace-pre-wrap text-left text-xs text-gray-400">
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export { RouteErrorBoundary, AppErrorBoundary }
