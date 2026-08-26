import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminService } from "@/services/admin.service"

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminService.getStats(),
  })
}

export function useAdminUsers(page = 1) {
  return useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => adminService.getUsers(page),
  })
}

export function useAdminProviders(page = 1) {
  return useQuery({
    queryKey: ["admin", "providers", page],
    queryFn: () => adminService.getProviders(page),
  })
}

export function useAdminServices(page = 1) {
  return useQuery({
    queryKey: ["admin", "services", page],
    queryFn: () => adminService.getAllServices(page),
  })
}

export function useAdminProviderOptions() {
  return useQuery({
    queryKey: ["admin", "providers", "options"],
    queryFn: () => adminService.getAllProvidersForSelect(),
  })
}

export function useAdminRequests(page = 1) {
  return useQuery({
    queryKey: ["admin", "requests", page],
    queryFn: () => adminService.getAllRequests(page),
  })
}

export function useSuspendUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminService.suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })
}

export function useVerifyProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminService.verifyProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] })
    },
  })
}
