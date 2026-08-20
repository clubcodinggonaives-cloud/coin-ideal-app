import { useState, useRef, useEffect } from "react"
import { MessageSquare, Send, ArrowLeft } from "lucide-react"
import {
  Button,
  Input,
  Skeleton,
  EmptyState,
  ErrorState,
  Avatar,
} from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  useMessageThreads,
  useMessages,
  useSendMessage,
} from "@/features/messages/hooks/use-messages"
import { formatRelativeTime } from "@/utils/format"
import type { MessageThread } from "@/types"

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  )
}

function DashboardMessagesPage() {
  const { user } = useAuth()
  const userId = user?.id || ""
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: threads, isLoading: loadingThreads, error: threadsError, refetch: refetchThreads } = useMessageThreads(userId)
  const { data: messages, isLoading: loadingMessages } = useMessages(selectedThread || "")
  const sendMessage = useSendMessage()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim() || !selectedThread) return
    sendMessage.mutate(
      { threadId: selectedThread, content: newMessage.trim() },
      {
        onSuccess: () => setNewMessage(""),
      }
    )
  }

  const getOtherParticipant = (thread: MessageThread) => {
    if (thread.participant1 && thread.participant_1 === userId) return thread.participant1
    if (thread.participant2 && thread.participant_2 === userId) return thread.participant2
    return thread.participant1?.id === userId ? thread.participant1 : thread.participant2
  }

  if (loadingThreads) return <MessagesSkeleton />
  if (threadsError) return <ErrorState onRetry={refetchThreads} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">Échangez avec vos prestataires et clients.</p>
      </div>

      <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-gray-200 lg:grid-cols-3">
        <div
          className={`border-r border-gray-200 ${
            selectedThread ? "hidden lg:block" : ""
          }`}
        >
          <div className="border-b border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="overflow-y-auto">
            {!threads || threads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8 text-gray-400" />}
                title="Aucune conversation"
                description="Vous n'avez pas encore de messages."
                className="py-8"
              />
            ) : (
              threads.map((thread) => {
                const other = getOtherParticipant(thread)
                const displayName = other
                  ? `${other.first_name} ${other.last_name}`
                  : "Utilisateur"
                const isActive = selectedThread === thread.id
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread.id)}
                    className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                      isActive ? "bg-primary-50" : ""
                    }`}
                  >
                    <Avatar
                      src={other?.avatar_url}
                      alt={displayName}
                      fallback={displayName}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {formatRelativeTime(thread.last_message_at)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div
          className={`flex flex-col ${
            !selectedThread ? "hidden lg:flex" : ""
          }`}
        >
          {selectedThread ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 p-4">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => setSelectedThread(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold text-gray-900">Conversation</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-3/4 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const isOwn = msg.sender_id === userId
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs rounded-lg px-4 py-2 ${
                            isOwn
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`mt-1 text-xs ${
                              isOwn ? "text-primary-200" : "text-gray-400"
                            }`}
                          >
                            {formatRelativeTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="hidden flex-col items-center justify-center text-center lg:flex">
              <MessageSquare className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                Sélectionnez une conversation pour commencer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardMessagesPage
