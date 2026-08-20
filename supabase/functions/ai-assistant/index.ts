// Assistant IA COIN-IDEAL — proxy sécurisé vers l'API Gemini.
//
// Cahier des charges §6 : l'assistant aide à l'information et à
// l'orientation du client (FAQ impression/copie, explication des options,
// aide au choix de service, fonctionnement d'une commande, retrait/
// livraison, questions générales sur la vente d'eau) ; il ne remplace pas
// l'administration humaine et ne doit JAMAIS avoir accès à la clé Gemini
// depuis le navigateur.
//
// Architecture imposée (§6.2) :
//   React → (ce endpoint) → API Gemini → réponse → React
//
// Ce fichier est un SCAFFOLD volontairement minimal — voir "Limites"
// en bas de fichier avant de le brancher à une UI de chat.
//
// Déploiement :
//   supabase functions deploy ai-assistant
//   supabase secrets set GEMINI_API_KEY=your_real_key_here
//
// La clé n'existe QUE dans les secrets de la fonction (jamais dans .env,
// jamais dans un fichier VITE_*, jamais commitée).

import { createClient } from "jsr:@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const MAX_MESSAGE_LENGTH = 500
const MAX_HISTORY_MESSAGES = 10

// Rate limit très simple, par instance de fonction (mémoire, pas partagée
// entre instances/régions). Suffisant pour dissuader un abus grossier en
// MVP ; une vraie limite distribuée (ex. table `ai_conversations` avec
// horodatage, ou un compteur Redis/Upstash) reste à faire — voir "Limites".
const requestLog = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 10

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  requestLog.set(key, timestamps)
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS
}

interface ChatRequestBody {
  message: string
  history?: { role: "user" | "assistant"; content: string }[]
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

/**
 * Contexte métier contrôlé (cahier des charges §6.3) : uniquement des
 * données réelles et publiques — jamais de données privées d'un client,
 * jamais de fichier client, jamais de champ inventé. Les tarifs viennent
 * en direct de la base ; les informations fixes (adresse, ville) sont
 * définies ici en un seul endroit plutôt que dupliquées dans le prompt.
 *
 * IMPORTANT : n'ajoute ici que des faits vérifiés. Si une information
 * (horaires officiels, numéro de téléphone) n'est pas encore confirmée,
 * elle doit rester absente plutôt qu'inventée — l'assistant doit dire
 * qu'il ne sait pas, pas deviner.
 */
async function buildBusinessContext(): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return "Aucune donnée de service disponible pour le moment."
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data: services } = await supabase
    .from("services")
    .select("name, description, price, price_unit, category:categories(name)")
    .eq("is_active", true)
    .limit(50)

  const catalogue =
    services && services.length > 0
      ? services
          .map((s) => {
            const category = Array.isArray(s.category) ? s.category[0] : s.category
            return `- ${s.name} (${category?.name ?? "Autre"}) : ${s.price} HTG${s.price_unit ? ` / ${s.price_unit}` : ""}${s.description ? ` — ${s.description}` : ""}`
          })
          .join("\n")
      : "Aucun tarif n'est encore publié."

  return [
    "Entreprise : COIN-IDEAL Multi-Service.",
    "Adresse : Ruelle Sajous, Gonaïves, Haïti.",
    "Activité principale : impression et copie de documents. Activité secondaire : vente d'eau (vitrine, pas de commande en ligne).",
    "Retrait au local : gratuit. Livraison : payante, à domicile ou au bureau.",
    "Moyens de paiement possibles : espèces, MonCash, NatCash, virement.",
    "Catalogue et tarifs actifs :",
    catalogue,
  ].join("\n")
}

const SYSTEM_INSTRUCTION = `Tu es l'assistant virtuel de COIN-IDEAL, une entreprise d'impression, de copie et de vente d'eau à Gonaïves, Haïti.

Règles strictes :
- Réponds uniquement à partir du CONTEXTE METIER fourni ci-dessous. N'invente jamais un prix, un horaire, une politique ou une information qui n'y figure pas.
- Si une information manque dans le contexte, dis clairement que tu ne l'as pas et oriente vers le formulaire de commande (/commander) ou la page contact.
- Le prix final, le paiement et l'état d'une commande sont toujours confirmés par COIN-IDEAL, pas par toi — présente tes montants comme des estimations.
- Ne demande et ne traite jamais de document ou fichier client dans cette conversation.
- Réponds en français, de façon brève et concrète.`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405)
  }

  if (!GEMINI_API_KEY) {
    console.error("ai-assistant: GEMINI_API_KEY is not configured")
    return jsonResponse(
      { error: "Assistant temporairement indisponible. Contactez-nous directement." },
      503
    )
  }

  // Identifie l'appelant pour la limite de débit : l'utilisateur authentifié
  // si présent, sinon l'adresse IP transmise par la plateforme d'edge.
  const authHeader = req.headers.get("authorization") ?? ""
  const rateLimitKey = authHeader || req.headers.get("x-forwarded-for") || "anonymous"

  if (isRateLimited(rateLimitKey)) {
    return jsonResponse(
      { error: "Trop de messages envoyés. Merci de patienter une minute avant de réessayer." },
      429
    )
  }

  let body: ChatRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Requête invalide." }, 400)
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return jsonResponse({ error: "Le message ne peut pas être vide." }, 400)
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `Le message est trop long (${MAX_MESSAGE_LENGTH} caractères maximum).` },
      400
    )
  }

  // Le client ne choisit jamais le modèle ni le system prompt — seule la
  // question de l'utilisateur et un historique bref (pas de configuration
  // sensible) traversent la frontière réseau.
  const history = Array.isArray(body.history)
    ? body.history.slice(-MAX_HISTORY_MESSAGES).map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: String(turn.content).slice(0, MAX_MESSAGE_LENGTH) }],
      }))
    : []

  const businessContext = await buildBusinessContext()

  try {
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nCONTEXTE METIER:\n${businessContext}` }],
          },
          contents: [...history, { role: "user", parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      console.error("ai-assistant: Gemini API error", geminiResponse.status)
      return jsonResponse(
        { error: "L'assistant est momentanément indisponible. Réessayez dans un instant." },
        502
      )
    }

    const data = await geminiResponse.json()
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!reply) {
      return jsonResponse(
        { error: "L'assistant n'a pas pu générer de réponse. Réessayez ou contactez-nous." },
        502
      )
    }

    // Journalisation minimale (§6.5) : pas de contenu de message, pas de
    // données personnelles — seulement la trace qu'un appel a eu lieu.
    console.log("ai-assistant: request served", { messageLength: message.length })

    return jsonResponse({ reply })
  } catch (err) {
    console.error("ai-assistant: unexpected error", err)
    return jsonResponse({ error: "Une erreur inattendue est survenue." }, 500)
  }
})

// =============================================================================
// LIMITES CONNUES DE CE SCAFFOLD (à traiter avant mise en production réelle) :
//
// 1. Rate limiting en mémoire locale à l'instance — pas fiable à l'échelle,
//    pas persistant entre redéploiements. À remplacer par un compteur en
//    base (ex. une table `ai_rate_limits` ou `ai_conversations` comme
//    suggéré au cahier des charges §11) si l'usage réel le justifie.
// 2. Pas d'authentification requise : l'assistant est appelable par tout
//    visiteur du site public, conformément à sa présence dans la section
//    "Site public" du cahier des charges (§7). S'il doit un jour répondre
//    sur des données spécifiques à un client connecté (ex. état de SA
//    commande), cela demande une vérification de session Supabase ici
//    (`supabase.auth.getUser(token)`) et une requête scoping strictement
//    ses propres données — non implémenté, non nécessaire pour les cas
//    d'usage listés au §6.4 qui sont tous des questions générales.
// 3. Pas de persistance de conversation (`ai_conversations`/`ai_messages`,
//    §11) — chaque appel est sans état ; l'historique vit uniquement côté
//    client tant qu'une UI ne le construit pas.
// 4. Aucune UI de chat n'a été construite pour appeler cet endpoint —
//    volontaire (§18 de la Phase 3 : "ne pas construire l'UI Gemini trop
//    tôt"). Avant de la construire, confirmer avec le propriétaire du
//    produit le ton, les cas de transfert vers un humain, et les horaires
//    réels à publier dans buildBusinessContext().
// =============================================================================
