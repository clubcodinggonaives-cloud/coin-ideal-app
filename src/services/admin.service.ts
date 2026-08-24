import { supabase } from "@/services/supabase/client"
import type { Profile, ProviderProfile, Service, ServiceRequest, PaginatedResponse } from "@/types"
import { PAGE_SIZE } from "@/lib/constants"

/**
 * Même bug/correction que src/services/bookings.service.ts : provider_id
 * référence provider_profiles(id), pas profiles(id), donc PostgREST ne peut
 * pas intégrer `profiles` via un hint de FK direct côté provider.
 */
function flattenProvider<T extends { provider_profile?: { profiles: Profile } | null }>(
  row: T
): Omit<T, "provider_profile"> & { provider: Profile | null } {
  const { provider_profile, ...rest } = row
  return { ...rest, provider: provider_profile?.profiles ?? null }
}

class AdminService {
  async getStats(): Promise<{
    totalUsers: number
    totalProviders: number
    totalServices: number
    totalRequests: number
    totalBookings: number
  }> {
    const [users, providers, services, requests, bookings] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("provider_profiles").select("id", { count: "exact", head: true }),
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("service_requests").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
    ])

    return {
      totalUsers: users.count ?? 0,
      totalProviders: providers.count ?? 0,
      totalServices: services.count ?? 0,
      totalRequests: requests.count ?? 0,
      totalBookings: bookings.count ?? 0,
    }
  }

  async getUsers(page: number = 1): Promise<PaginatedResponse<Profile>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []) as Profile[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getProviders(
    page: number = 1
  ): Promise<PaginatedResponse<ProviderProfile & { profiles: Profile }>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("provider_profiles")
      .select("*, profiles:profiles(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []) as (ProviderProfile & { profiles: Profile })[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getAllServices(page: number = 1): Promise<PaginatedResponse<Service>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("services")
      .select("*, provider:provider_profiles(*), category:categories(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []) as Service[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getAllRequests(page: number = 1): Promise<PaginatedResponse<ServiceRequest>> {
    const pageSize = PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("service_requests")
      .select("*, service:services(*), client:profiles!service_requests_client_id_fkey(*), provider_profile:provider_profiles!service_requests_provider_id_fkey(profiles:profiles(*))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0

    return {
      data: (data ?? []).map((row) => flattenProvider(row)) as unknown as ServiceRequest[],
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async suspendUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "client", updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) throw error

    await supabase
      .from("provider_profiles")
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
  }

  async verifyProvider(userId: string): Promise<void> {
    const { error } = await supabase
      .from("provider_profiles")
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)

    if (error) throw error
  }
}

export const adminService = new AdminService()
