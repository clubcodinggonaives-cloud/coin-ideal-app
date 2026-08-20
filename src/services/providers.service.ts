import { supabase } from "@/services/supabase/client"
import type { ProviderProfile, PaginatedResponse } from "@/types"
import { PAGE_SIZE } from "@/lib/constants"

class ProvidersService {
  async getProviders(page: number = 1): Promise<PaginatedResponse<ProviderProfile>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("provider_profiles")
      .select("*", { count: "exact" })
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []) as ProviderProfile[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getProviderById(userId: string): Promise<ProviderProfile> {
    const { data, error } = await supabase
      .from("provider_profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error) throw error
    return data as ProviderProfile
  }

  async getRecommendedProviders(limit: number = 6): Promise<ProviderProfile[]> {
    const { data, error } = await supabase
      .from("provider_profiles")
      .select("*")
      .eq("is_verified", true)
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .order("total_reviews", { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as ProviderProfile[]
  }

  async updateProviderProfile(
    userId: string,
    data: Partial<ProviderProfile>
  ): Promise<ProviderProfile> {
    const { data: updated, error } = await supabase
      .from("provider_profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return updated as ProviderProfile
  }
}

export const providersService = new ProvidersService()
