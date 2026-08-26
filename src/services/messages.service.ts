import { supabase } from "@/services/supabase/client"
import type { MessageThread, Message } from "@/types"

class MessagesService {
  async getThreads(userId: string): Promise<MessageThread[]> {
    const { data, error } = await supabase
      .from("message_threads")
      .select("*, participant1:profiles!message_threads_participant_1_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at), participant2:profiles!message_threads_participant_2_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as MessageThread[]
  }

  async getMessages(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return (data ?? []) as Message[]
  }

  async sendMessage(threadId: string, content: string): Promise<Message> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content,
      })
      .select("*, sender:profiles(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)")
      .single()

    if (error) throw error

    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId)

    return message as Message
  }

  async createThread(otherUserId: string): Promise<MessageThread> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
      )
      .maybeSingle()

    if (existing) {
      const { data: thread, error } = await supabase
        .from("message_threads")
        .select("*, participant1:profiles!message_threads_participant_1_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at), participant2:profiles!message_threads_participant_2_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)")
        .eq("id", existing.id)
        .single()

      if (error) throw error
      return thread as MessageThread
    }

    const { data: thread, error } = await supabase
      .from("message_threads")
      .insert({
        participant_1: user.id,
        participant_2: otherUserId,
      })
      .select("*, participant1:profiles!message_threads_participant_1_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at), participant2:profiles!message_threads_participant_2_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)")
      .single()

    if (error) throw error
    return thread as MessageThread
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { data: threads, error: threadsError } = await supabase
      .from("message_threads")
      .select("id")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)

    if (threadsError) throw threadsError

    const threadIds = (threads ?? []).map((t: { id: string }) => t.id)

    if (threadIds.length === 0) return 0

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", userId)
      .eq("is_read", false)
      .in("thread_id", threadIds)

    if (error) throw error
    return count ?? 0
  }
}

export const messagesService = new MessagesService()
