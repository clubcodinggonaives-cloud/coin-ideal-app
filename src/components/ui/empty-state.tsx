import { AlertCircle, Inbox, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        {icon || <Inbox className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

function ErrorState({
  title = "Une erreur s'est produite",
  message = "Veuillez réessayer ultérieurement.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  )
}

interface SearchEmptyProps {
  query?: string
  className?: string
}

function SearchEmpty({ query, className }: SearchEmptyProps) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-gray-400" />}
      title="Aucun résultat trouvé"
      description={
        query
          ? `Aucun résultat pour "${query}". Essayez avec d'autres termes.`
          : "Aucun résultat trouvé. Essayez avec d'autres filtres."
      }
      className={className}
    />
  )
}

export { EmptyState, ErrorState, SearchEmpty }
