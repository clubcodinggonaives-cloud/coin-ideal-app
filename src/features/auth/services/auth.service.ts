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
  async signUp(email: string, password: string, metadata: { firstName: string; lastName: string; phone?: string; role?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          phone: metadata.phone || null,
          role: metadata.role || "client",
        },
      },
    })
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
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
