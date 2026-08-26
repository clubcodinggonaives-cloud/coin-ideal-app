// Inscription — crée le compte avec l'email déjà confirmé (email_confirm:
// true via l'API admin, clé service_role réservée à cette fonction), sans
// jamais envoyer l'email de confirmation par défaut de Supabase.
//
// Pourquoi : le compte GoTrue par défaut du projet limite les emails de
// confirmation à 2/heure (config.toml, valeur locale jamais alignée avec le
// projet distant) — un vrai blocage en test comme en usage réel si
// plusieurs personnes s'inscrivent la même heure. Plutôt que de pousser la
// config globale du projet (site_url/redirect_urls du fichier local
// pointent vers 127.0.0.1, les pousser tel quel casserait les redirections
// OAuth/production), cette fonction contourne uniquement l'envoi d'email à
// l'inscription, sans toucher à aucun réglage global du projet.
//
// L'approbation admin (provider_profiles.is_verified) reste le vrai
// filtre de confiance pour les prestataires — la confirmation email n'en a
// jamais été un ici.
//
// Déploiement : supabase functions deploy register
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement
// par la plateforme Edge Functions — jamais définies manuellement, jamais
// exposées au client.)

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  }
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } })
}

interface RegisterBody {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role?: string
  proposedServices?: string
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin")
  const headers = corsHeaders(origin)

  if (req.method === "OPTIONS") return new Response(null, { headers })
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405, headers)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("register: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured")
    return jsonResponse({ error: "Inscription temporairement indisponible." }, 503, headers)
  }

  let body: RegisterBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Requête invalide." }, 400, headers)
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""

  if (!email || !password || !firstName || !lastName) {
    return jsonResponse({ error: "Champs requis manquants." }, 400, headers)
  }
  if (password.length < 8) {
    return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400, headers)
  }

  // Jamais 'admin' -- seul un choix explicite de 'provider' est honoré,
  // même liste blanche que handle_new_user() (00054) côté base.
  const role = body.role === "provider" ? "provider" : "client"

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: body.phone || null,
      role,
      proposed_services: role === "provider" ? body.proposedServices || null : null,
    },
  })

  if (error) {
    const message = error.message === "A user with this email address has already been registered"
      ? "Un compte existe déjà avec cette adresse email."
      : "Erreur lors de l'inscription. Veuillez réessayer."
    console.error("register: createUser failed", error.message)
    return jsonResponse({ error: message }, error.status === 422 ? 409 : 500, headers)
  }

  console.log("register: account created", { userId: data.user.id, role })
  return jsonResponse({ success: true }, 200, headers)
})
