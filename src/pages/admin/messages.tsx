import { useState } from "react"
import { Mail, MailOpen, Archive, ChevronDown } from "lucide-react"
import { Card, CardContent, Badge, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useContactMessages, useUpdateContactMessageStatus } from "@/features/contact/hooks/use-contact"
import { formatDate } from "@/utils/format"
import { cn } from "@/utils/cn"
import type { ContactMessage, ContactMessageStatus } from "@/types"

const STATUS_BADGE: Record<ContactMessageStatus, { variant: "warning" | "secondary" | "success"; label: string }> = {
  new: { variant: "warning", label: "Nouveau" },
  read: { variant: "secondary", label: "Lu" },
  archived: { variant: "success", label: "Archivé" },
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}

function MessageRow({ message }: { message: ContactMessage }) {
  const [expanded, setExpanded] = useState(false)
  const updateStatus = useUpdateContactMessageStatus()

  const handleExpand = () => {
    setExpanded((e) => !e)
    // Marquer "lu" au premier affichage du détail, pas avant — matche le
    // comportement attendu (le fait de consulter un message le marque lu).
    if (!expanded && message.status === "new") {
      updateStatus.mutate({ id: message.id, status: "read" })
    }
  }

  return (
    <Card className={cn(message.status === "new" && "border-primary-200 bg-primary-50/30")}>
      <CardContent className="space-y-3 py-4">
        <button type="button" onClick={handleExpand} className="flex w-full items-start justify-between gap-3 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-gray-100 p-2.5">
              {message.status === "new" ? (
                <Mail className="h-4 w-4 text-primary-600" />
              ) : (
                <MailOpen className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div>
              <p className={cn("text-sm", message.status === "new" ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                {message.subject}
              </p>
              <p className="text-xs text-gray-500">
                {message.name} · {message.email} · {formatDate(message.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[message.status].variant}>{STATUS_BADGE[message.status].label}</Badge>
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", expanded && "rotate-180")} />
          </div>
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{message.message}</p>
            {message.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: message.id, status: "archived" })}>
                <Archive className="h-4 w-4" />
                Archiver
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AdminMessagesPage() {
  const { data: messages, isLoading, error, refetch } = useContactMessages()

  if (isLoading) return <MessagesSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const unreadCount = (messages ?? []).filter((m) => m.status === "new").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages de contact</h1>
        <p className="text-gray-500">
          {unreadCount > 0 ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}` : "Tous les messages sont lus."}
        </p>
      </div>

      {!messages || messages.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8 text-gray-400" />}
          title="Aucun message"
          description="Les messages envoyés depuis la page Contact apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminMessagesPage
