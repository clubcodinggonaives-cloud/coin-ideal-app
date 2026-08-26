import { supabase } from "@/services/supabase/client"
import type { Profile } from "@/types"

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  profile: Profile | null
}

class AuthService {
  /**
   * Passe par l'Edge Function `register` (clé service_role, jamais exposée
   * ici) plutôt que `supabase.auth.signUp()` directement : celui-ci envoie
   * toujours l'email de confirmation par défaut du projet, limité à 2/heure
   * (config.toml jamais aligné avec le projet distant — voir le commentaire
   * de la fonction). `admin.createUser({ email_confirm: true })` crée le
   * compte déjà confirmé, sans email du tout, puis on se connecte
   * immédiatement avec les mêmes identifiants pour obtenir une vraie
   * session — le trigger handle_new_user() (00054/00057) tourne de la même
   * façon quelle que soit l'API qui a inséré la ligne dans auth.users.
   */
  async signUp(
    email: string,
    password: string,
    metadata: { firstName: string; lastName: string; phone?: string; role?: string; proposedServices?: string }
  ) {
    const { data: fnData, error: fnError } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
      "register",
      {
        body: {
          email,
          password,
          firstName: metadata.firstName,
          lastName: metadata.lastName,
          phone: metadata.phone,
          role: metadata.role || "client",
          proposedServices: metadata.proposedServices,
        },
      }
    )

    if (fnError) {
      const context = (fnError as { context?: Response }).context
      let serverMessage: string | undefined
      if (context) {
        try {
          const responseBody = await context.clone().json()
          serverMessage = responseBody?.error
        } catch {
          // fall through to the generic message below
        }
      }
      throw new Error(serverMessage || "Erreur lors de l'inscription. Veuillez réessayer.")
    }
    if (fnData?.error) throw new Error(fnData.error)

    return this.signIn(email, password)
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async getProfile(userId: string): Promise<Profile | null> {
    // Explicit column list -- never pin_hash/failed_pin_attempts/
    // pin_locked_until (Phase 6 PIN security columns, 00060). Those must
    // never reach the browser, even for the user's own row; pin_set_at
    // alone is enough for the UI to know whether a PIN has been configured.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at")
      .eq("id", userId)
      .single()

    if (error || !data) return null
    return data as Profile
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error
    return data as Profile
  }

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  }

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  }

  onAuthStateChange(callback: (event: string, session: { user: { id: string; email?: string } | null } | null) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabase.auth.onAuthStateChange((event: any, session: any) => {
      callback(event, session)
    })
  }
}

export const authService = new AuthService()
