import { supabase } from "@/services/supabase/client"
import type { Service, SearchFilters, PaginatedResponse } from "@/types"
import { PAGE_SIZE } from "@/lib/constants"

const SERVICE_SELECT =
  "*, provider:provider_profiles(*), category:categories(*), service_images(url, sort_order)"

/**
 * `service_images` existe (table + RLS + bucket) mais n'était joint nulle
 * part — service-card.tsx et service-detail.tsx lisent tous deux
 * `service.images`, qui restait donc toujours vide/undefined en pratique.
 * Aplati ici en un simple `string[]` trié par sort_order, au niveau du
 * service plutôt que du composant, pour que la forme `Service` reste celle
 * attendue par l'UI existante.
 */
export function withFlattenedImages<T extends { service_images?: { url: string; sort_order: number }[] | null }>(
  row: T
): Omit<T, "service_images"> & { images: string[] } {
  const { service_images, ...rest } = row
  const images = (service_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.url)
  return { ...rest, images }
}

class ServicesService {
  async getServices(filters: SearchFilters = {}): Promise<PaginatedResponse<Service>> {
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("services")
      .select(SERVICE_SELECT, { count: "exact" })
      .eq("is_active", true)

    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
    }

    if (filters.category) {
      query = query.eq("category_id", filters.category)
    }

    if (filters.location) {
      query = query.ilike("location", `%${filters.location}%`)
    }

    if (filters.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice)
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice)
    }

    if (filters.minRating !== undefined) {
      query = query.gte("rating", filters.minRating)
    }

    if (filters.isVerified !== undefined) {
      query = query.eq("is_verified", filters.isVerified)
    }

    switch (filters.sortBy) {
      case "price_asc":
        query = query.order("price", { ascending: true })
        break
      case "price_desc":
        query = query.order("price", { ascending: false })
        break
      case "rating":
        query = query.order("rating", { ascending: false })
        break
      case "popular":
        query = query.order("total_orders", { ascending: false })
        break
      default:
        query = query.order("created_at", { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []).map(withFlattenedImages) as unknown as Service[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getServiceById(id: string): Promise<Service> {
    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("id", id)
      .single()

    if (error) throw error
    return withFlattenedImages(data) as unknown as Service
  }

  async getServicesByCategory(
    categorySlug: string,
    page: number = 1
  ): Promise<PaginatedResponse<Service>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single()

    if (catError) throw catError

    const { data, error, count } = await supabase
      .from("services")
      .select(SERVICE_SELECT, { count: "exact" })
      .eq("category_id", category.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []).map(withFlattenedImages) as unknown as Service[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getPopularServices(limit: number = 8): Promise<Service[]> {
    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("is_active", true)
      .order("total_orders", { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []).map(withFlattenedImages) as unknown as Service[]
  }

  async searchServices(query: string, location?: string): Promise<Service[]> {
    let dbQuery = supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("is_active", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order("rating", { ascending: false })
      .limit(20)

    if (location) {
      dbQuery = dbQuery.ilike("location", `%${location}%`)
    }

    const { data, error } = await dbQuery

    if (error) throw error
    return (data ?? []).map(withFlattenedImages) as unknown as Service[]
  }
}

export const servicesService = new ServicesService()
