import { useServices } from "@/features/services/hooks/use-services"

/**
 * Catalogue de services utilisable pour une commande (impression, copie,
 * finitions...). Réutilise le hook et le service Supabase existants
 * plutôt que d'introduire une source de données parallèle.
 */
export function useDocumentOrderServices() {
  return useServices({ pageSize: 50 })
}
