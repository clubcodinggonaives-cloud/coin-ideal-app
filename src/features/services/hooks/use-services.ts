import { useQuery } from "@tanstack/react-query"
import { servicesService } from "@/services/services.service"
import type { SearchFilters } from "@/types"

export function useServices(filters: SearchFilters = {}) {
  return useQuery({
    queryKey: ["services", filters],
    queryFn: () => servicesService.getServices(filters),
  })
}

export function useService(id: string) {
  return useQuery({
    queryKey: ["service", id],
    queryFn: () => servicesService.getServiceById(id),
    enabled: !!id,
  })
}

export function usePopularServices(limit = 8) {
  return useQuery({
    queryKey: ["services", "popular", limit],
    queryFn: () => servicesService.getPopularServices(limit),
  })
}

export function useServiceSearch(query: string, location?: string) {
  return useQuery({
    queryKey: ["services", "search", query, location],
    queryFn: () => servicesService.searchServices(query, location),
    enabled: query.length >= 2,
  })
}
