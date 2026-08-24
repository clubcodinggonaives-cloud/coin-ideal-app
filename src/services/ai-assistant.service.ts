import { supabase } from "@/services/supabase/client"

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

/**
 * Appelle l'Edge Function `ai-assistant` — jamais l'API Gemini directement
 * (cahier des charges §6.2 : React → Edge Function → Gemini, jamais
 * React → Gemini). La clé Gemini n'existe que dans les secrets de la
 * fonction ; ce fichier ne la voit jamais et n'a aucun moyen de la voir.
 */
class AiAssistantService {
  async sendMessage(message: string, history: ChatTurn[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>("ai-assistant", {
      body: { message, history },
    })

    if (error) {
      // supabase-js surfaces non-2xx Edge Function responses as a generic
      // FunctionsHttpError without the JSON body attached in older
      // versions — try to recover the real message the function sent
      // (rate limit text, "temporairement indisponible", etc.) before
      // falling back to a generic one.
      const context = (error as { context?: Response }).context
      if (context) {
        try {
          const body = await context.clone().json()
          if (body?.error) throw new Error(body.error)
        } catch {
          // fall through to generic message below
        }
      }
      throw new Error("L'assistant est momentanément indisponible. Réessayez dans un instant.")
    }

    if (data?.error) {
      throw new Error(data.error)
    }
    if (!data?.reply) {
      throw new Error("L'assistant n'a pas pu générer de réponse.")
    }
    return data.reply
  }
}

export const aiAssistantService = new AiAssistantService()
