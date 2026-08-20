import { useQuery } from "@tanstack/react-query"
import { categoriesService } from "@/services/categories.service"

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getCategories(),
  })
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => categoriesService.getCategoryBySlug(slug),
    enabled: !!slug,
  })
}

export function usePopularCategories() {
  return useQuery({
    queryKey: ["categories", "popular"],
    queryFn: () => categoriesService.getPopularCategories(),
  })
}
