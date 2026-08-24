import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, RotateCcw, Loader2, Bot, User } from "lucide-react"
import { useAiChat } from "@/features/ai-assistant/hooks/use-ai-chat"
import { cn } from "@/utils/cn"

/**
 * Widget de chat flottant — cahier des charges §7 ("Assistant IA" listé
 * parmi les pages du site public) et §18 (critère d'acceptation : "la
 * clé Gemini n'est pas exposée côté client"). Ce composant ne parle
 * jamais à Gemini directement — uniquement à ai-assistant.service.ts, qui
 * appelle l'Edge Function. Responsive : plein écran sur mobile, panneau
 * ancré en bas à droite à partir de `sm`.
 */
function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const { messages, isLoading, error, send, retry } = useAiChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    send(input)
    setInput("")
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-700"
          aria-label="Ouvrir l'assistant COIN-IDEAL"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed inset-0 z-40 flex flex-col bg-white",
            "sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[32rem] sm:w-96 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl"
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-primary-600 px-4 py-3 sm:rounded-t-2xl">
            <div className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Assistant COIN-IDEAL</p>
                <p className="text-xs text-primary-100">Impression, copie, commandes</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Fermer l'assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex items-start gap-2", msg.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    msg.role === "user" ? "bg-gray-200 text-gray-600" : "bg-primary-50 text-primary-600"
                  )}
                >
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary-600 text-white"
                      : "rounded-tl-sm bg-gray-100 text-gray-800"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">L'assistant réfléchit...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={retry}
                  className="mt-1.5 inline-flex items-center gap-1 font-medium text-red-800 hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-gray-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              maxLength={500}
              disabled={isLoading}
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export { ChatWidget }
