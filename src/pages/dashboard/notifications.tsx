import {
  Bell,
  CheckCircle,
  MessageSquare,
  Star,
  AlertTriangle,
  Shield,
} from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/features/notifications/hooks/use-notifications"
import { formatRelativeTime } from "@/utils/format"
import type { NotificationType } from "@/types"

const typeIcons: Record<NotificationType, typeof Bell> = {
  new_request: AlertTriangle,
  request_accepted: CheckCircle,
  request_rejected: AlertTriangle,
  booking_confirmed: CheckCircle,
  booking_completed: Star,
  new_message: MessageSquare,
  new_review: Star,
  admin_notification: Shield,
}

const typeColors: Record<NotificationType, string> = {
  new_request: "text-blue-600 bg-blue-50",
  request_accepted: "text-green-600 bg-green-50",
  request_rejected: "text-red-600 bg-red-50",
  booking_confirmed: "text-green-600 bg-green-50",
  booking_completed: "text-amber-600 bg-amber-50",
  new_message: "text-blue-600 bg-blue-50",
  new_review: "text-amber-600 bg-amber-50",
  admin_notification: "text-purple-600 bg-purple-50",
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  )
}

function DashboardNotificationsPage() {
  const { user } = useAuth()
  const userId = user?.id || ""

  const { data: notifications, isLoading, error, refetch } = useNotifications(userId)
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  if (isLoading) return <NotificationsSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate(userId)}
            disabled={markAllAsRead.isPending}
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8 text-gray-400" />}
          title="Aucune notification"
          description="Vous n'avez aucune notification pour le moment."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type]
            const colorClass = typeColors[notification.type]
            return (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  !notification.is_read ? "border-primary-200 bg-primary-50/30" : ""
                }`}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className={`rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className={`text-sm ${
                            !notification.is_read
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                        )}
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead.mutate(notification.id)}
                      disabled={markAsRead.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardNotificationsPage
