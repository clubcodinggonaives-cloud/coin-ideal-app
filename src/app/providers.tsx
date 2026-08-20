import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/features/auth/hooks/use-auth"
import { isSupabaseConfigured } from "@/services/supabase/client"
import { useState, type ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            // Without real Supabase credentials, every query hits the
            // localhost fallback and fails — retrying it just delays the
            // UI settling into its error/empty state (observed: 6+ retries,
            // 20+ seconds, skeletons never clearing). Fail fast instead.
            retry: isSupabaseConfigured ? 1 : false,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
