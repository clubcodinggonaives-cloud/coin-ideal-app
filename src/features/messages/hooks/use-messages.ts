import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { messagesService } from "@/services/messages.service"

export function useMessageThreads(userId: string) {
  return useQuery({
    queryKey: ["message-threads", userId],
    queryFn: () => messagesService.getThreads(userId),
    enabled: !!userId,
  })
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => messagesService.getMessages(threadId),
    enabled: !!threadId,
    refetchInterval: 10000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      messagesService.sendMessage(threadId, content),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] })
      queryClient.invalidateQueries({ queryKey: ["message-threads"] })
    },
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: messagesService.createThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] })
    },
  })
}
