import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { authService, type AuthUser } from "@/features/auth/services/auth.service"
import type { Profile } from "@/types"

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata: { firstName: string; lastName: string; phone?: string; role?: string }) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const profileData = await authService.getProfile(userId)
    setProfile(profileData)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await authService.getSession()
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || "" })
          await loadProfile(session.user.id)
        }
      } catch {
        // Session not available
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" })
        await loadProfile(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const data = await authService.signIn(email, password)
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || "" })
      await loadProfile(data.user.id)
    }
  }

  const signUp = async (email: string, password: string, metadata: { firstName: string; lastName: string; phone?: string; role?: string }) => {
    const data = await authService.signUp(email, password, metadata)
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || "" })
      await loadProfile(data.user.id)
    }
  }

  const signOut = async () => {
    await authService.signOut()
    setUser(null)
    setProfile(null)
  }

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle()
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
