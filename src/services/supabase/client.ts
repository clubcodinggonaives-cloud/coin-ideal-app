import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Whether real Supabase credentials are configured. Used to fail fast
 * instead of retrying network calls against the localhost fallback below —
 * see the `retry` config in `app/providers.tsx`.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  )
}

// `||`, not `??` — VITE_SUPABASE_URL is defined but empty ("") when the
// project's .env exists without real values, and `??` only falls back on
// null/undefined, not on an empty string. With `??` here, an empty-but-set
// var reached createClient() as "" and threw "supabaseUrl is required" at
// module load, white-screening the entire app before React could render.
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "placeholder-key"
)
