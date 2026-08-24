import { useState } from "react"
import { aiAssistantService, type ChatTurn } from "@/services/ai-assistant.service"

const WELCOME_MESSAGE: ChatTurn = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant COIN-IDEAL. Je peux répondre à vos questions sur nos services d'impression, de copie et sur la commande en ligne. Comment puis-je vous aider ?",
}

interface PendingAttempt {
  text: string
  history: ChatTurn[]
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatTurn[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Snapshot of the failed attempt, so retry() replays the exact same
  // (text, history) pair rather than re-deriving history from `messages` —
  // which already contains the user's turn and would otherwise grow with
  // every retry and never match what was actually sent.
  const [lastAttempt, setLastAttempt] = useState<PendingAttempt | null>(null)

  const attempt = async ({ text, history }: PendingAttempt) => {
    setError(null)
    setIsLoading(true)
    try {
      const reply = await aiAssistantService.sendMessage(text, history)
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
      setLastAttempt(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
      setLastAttempt({ text, history })
    } finally {
      setIsLoading(false)
    }
  }

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    const history = messages.slice(-10)
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    void attempt({ text: trimmed, history })
  }

  const retry = () => {
    if (!lastAttempt || isLoading) return
    void attempt(lastAttempt)
  }

  return { messages, isLoading, error, send, retry }
}
