import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { bookingsService } from "@/services/bookings.service"
import type { RequestStatus, BookingStatus } from "@/types"

export function useServiceRequests(userId: string, role: "client" | "provider") {
  return useQuery({
    queryKey: ["service-requests", userId, role],
    queryFn: () => bookingsService.getServiceRequests(userId, role),
    enabled: !!userId,
  })
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bookingsService.createServiceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] })
    },
  })
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, status, message }: { requestId: string; status: RequestStatus; message?: string }) =>
      bookingsService.updateRequestStatus(requestId, status, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] })
    },
  })
}

export function useBookings(userId: string, role: "client" | "provider") {
  return useQuery({
    queryKey: ["bookings", userId, role],
    queryFn: () => bookingsService.getBookings(userId, role),
    enabled: !!userId,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bookingsService.createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["service-requests"] })
    },
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) =>
      bookingsService.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
    },
  })
}
