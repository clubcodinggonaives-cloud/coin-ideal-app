import { supabase } from "@/services/supabase/client"
import type {
  ServiceRequest,
  Booking,
  Profile,
  RequestStatus,
  BookingStatus,
} from "@/types"
import type { ServiceRequestFormData } from "@/lib/validators"

/**
 * client_id/provider_id on service_requests and bookings point to different
 * tables (client_id -> profiles, provider_id -> provider_profiles), so
 * PostgREST can't embed a flat `profiles` row for the provider side off a
 * single FK hint the way it can for the client side. Fetch it nested under
 * provider_profiles instead, then flatten here so callers keep working with
 * `provider: Profile` as before.
 */
function flattenProvider<T extends { provider_profile?: { profiles: Profile } | null }>(
  row: T
): Omit<T, "provider_profile"> & { provider: Profile | null } {
  const { provider_profile, ...rest } = row
  return { ...rest, provider: provider_profile?.profiles ?? null }
}

class BookingsService {
  async getServiceRequests(
    userId: string,
    role: "client" | "provider"
  ): Promise<ServiceRequest[]> {
    const column = role === "client" ? "client_id" : "provider_id"

    const { data, error } = await supabase
      .from("service_requests")
      .select("*, service:services(*, category:categories(*), provider:provider_profiles(*, profiles:profiles(*))), client:profiles!service_requests_client_id_fkey(*), provider_profile:provider_profiles!service_requests_provider_id_fkey(profiles:profiles(*))")
      .eq(column, userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []).map((row) => flattenProvider(row)) as unknown as ServiceRequest[]
  }

  async createServiceRequest(
    data: ServiceRequestFormData & { providerId: string }
  ): Promise<ServiceRequest> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    const { data: request, error } = await supabase
      .from("service_requests")
      .insert({
        client_id: user.id,
        service_id: data.serviceId,
        provider_id: data.providerId,
        message: data.message,
        preferred_date: data.preferredDate ?? null,
        preferred_time: data.preferredTime ?? null,
        address: data.address,
      })
      .select("*, service:services(*), client:profiles!service_requests_client_id_fkey(*), provider_profile:provider_profiles!service_requests_provider_id_fkey(profiles:profiles(*))")
      .single()

    if (error) throw error
    return flattenProvider(request) as unknown as ServiceRequest
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    message?: string
  ): Promise<ServiceRequest> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (message !== undefined) {
      updateData.response_message = message
    }

    const { data, error } = await supabase
      .from("service_requests")
      .update(updateData)
      .eq("id", requestId)
      .select("*, service:services(*), client:profiles!service_requests_client_id_fkey(*), provider_profile:provider_profiles!service_requests_provider_id_fkey(profiles:profiles(*))")
      .single()

    if (error) throw error
    return flattenProvider(data) as unknown as ServiceRequest
  }

  async getBookings(
    userId: string,
    role: "client" | "provider"
  ): Promise<Booking[]> {
    const column = role === "client" ? "client_id" : "provider_id"

    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*, category:categories(*), provider:provider_profiles(*, profiles:profiles(*))), client:profiles!bookings_client_id_fkey(*), provider_profile:provider_profiles!bookings_provider_id_fkey(profiles:profiles(*))")
      .eq(column, userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []).map((row) => flattenProvider(row)) as unknown as Booking[]
  }

  async createBooking(data: {
    requestId: string
    scheduledDate: string
    scheduledTime?: string
  }): Promise<Booking> {
    const { data: request, error: reqError } = await supabase
      .from("service_requests")
      .select("*, service:services(price)")
      .eq("id", data.requestId)
      .single()

    if (reqError) throw reqError

    const serviceRequest = request as ServiceRequest & {
      service: { price: number } | null
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        request_id: data.requestId,
        client_id: serviceRequest.client_id,
        provider_id: serviceRequest.provider_id,
        service_id: serviceRequest.service_id,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime ?? null,
        total_price: serviceRequest.service?.price ?? 0,
      })
      .select("*, service:services(*), client:profiles!bookings_client_id_fkey(*), provider_profile:provider_profiles!bookings_provider_id_fkey(profiles:profiles(*))")
      .single()

    if (error) throw error
    return flattenProvider(booking) as unknown as Booking
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus
  ): Promise<Booking> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select("*, service:services(*), client:profiles!bookings_client_id_fkey(*), provider_profile:provider_profiles!bookings_provider_id_fkey(profiles:profiles(*))")
      .single()

    if (error) throw error
    return flattenProvider(data) as unknown as Booking
  }
}

export const bookingsService = new BookingsService()
