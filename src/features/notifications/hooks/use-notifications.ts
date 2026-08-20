import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationsService } from "@/services/notifications.service"

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsService.getNotifications(userId),
    enabled: !!userId,
  })
}

export function useUnreadNotificationCount(userId: string) {
  return useQuery({
    queryKey: ["notifications", "unread-count", userId],
    queryFn: () => notificationsService.getUnreadCount(userId),
    enabled: !!userId,
    refetchInterval: 30000,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
