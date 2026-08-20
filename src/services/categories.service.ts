import { supabase } from "@/services/supabase/client"
import type { Category } from "@/types"

class CategoriesService {
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error
    return (data ?? []) as Category[]
  }

  async getCategoryBySlug(slug: string): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) throw error
    return data as Category
  }

  async getPopularCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*, services!inner(id)")
      .eq("is_active", true)

    if (error) throw error

    const categories = (data ?? []).map((cat: Record<string, unknown>) => ({
      ...cat,
      services: undefined,
      service_count: Array.isArray(cat.services) ? cat.services.length : 0,
    })) as unknown as Category[]

    return categories.sort((a, b) => (b.service_count ?? 0) - (a.service_count ?? 0))
  }
}

export const categoriesService = new CategoriesService()
