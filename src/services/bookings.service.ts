import { supabase } from "@/services/supabase/client"
import type {
  ServiceRequest,
  Booking,
  RequestStatus,
  BookingStatus,
} from "@/types"
import type { ServiceRequestFormData } from "@/lib/validators"

class BookingsService {
  async getServiceRequests(
    userId: string,
    role: "client" | "provider"
  ): Promise<ServiceRequest[]> {
    const column = role === "client" ? "client_id" : "provider_id"

    const { data, error } = await supabase
      .from("service_requests")
      .select("*, service:services(*, category:categories(*), provider:provider_profiles(*, profiles:profiles(*))), client:profiles!service_requests_client_id_fkey(*), provider:profiles!service_requests_provider_id_fkey(*)")
      .eq(column, userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as ServiceRequest[]
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
      .select("*, service:services(*), client:profiles!service_requests_client_id_fkey(*), provider:profiles!service_requests_provider_id_fkey(*)")
      .single()

    if (error) throw error
    return request as ServiceRequest
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
      .select("*, service:services(*), client:profiles!service_requests_client_id_fkey(*), provider:profiles!service_requests_provider_id_fkey(*)")
      .single()

    if (error) throw error
    return data as ServiceRequest
  }

  async getBookings(
    userId: string,
    role: "client" | "provider"
  ): Promise<Booking[]> {
    const column = role === "client" ? "client_id" : "provider_id"

    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*, category:categories(*), provider:provider_profiles(*, profiles:profiles(*))), client:profiles!bookings_client_id_fkey(*), provider:profiles!bookings_provider_id_fkey(*)")
      .eq(column, userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Booking[]
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
      .select("*, service:services(*), client:profiles!bookings_client_id_fkey(*), provider:profiles!bookings_provider_id_fkey(*)")
      .single()

    if (error) throw error
    return booking as Booking
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
      .select("*, service:services(*), client:profiles!bookings_client_id_fkey(*), provider:profiles!bookings_provider_id_fkey(*)")
      .single()

    if (error) throw error
    return data as Booking
  }
}

export const bookingsService = new BookingsService()
