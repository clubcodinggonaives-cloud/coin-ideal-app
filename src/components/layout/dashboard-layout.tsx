import { useState } from "react"
import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Menu } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { DashboardSidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useIdleTimeout } from "@/features/auth/hooks/use-idle-timeout"
import { usePin } from "@/features/auth/hooks/use-pin"
import { PinGate } from "@/pages/auth/pin"
import { Spinner } from "@/components/ui/spinner"
import { ChatWidget } from "@/features/ai-assistant/components/chat-widget"

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Cahier des charges §7 : l'assistant IA fait partie du site public. */}
      <ChatWidget />
    </div>
  )
}

function DashboardLayout({ variant = "client" }: { variant?: "client" | "provider" | "admin" }) {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isProtectedVariant = variant === "admin" || variant === "provider"
  const { elevated, refreshElevated } = usePin()

  // Idle timeout: admin/provider only, per this phase's brief -- client
  // session behavior is deliberately unchanged. Hook itself no-ops when
  // `enabled` is false, so it's safe to call unconditionally here.
  useIdleTimeout(isProtectedVariant && isAuthenticated)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (variant === "admin" && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }
  if (variant === "provider" && profile?.role !== "provider" && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }

  // PIN step-up: after the role check above (so a wrong-role user gets the
  // existing redirect, not a PIN prompt for a workspace they can't use
  // anyway), before rendering any admin/provider content.
  if (isProtectedVariant && !elevated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <PinGate onUnlocked={refreshElevated} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <DashboardSidebar
          variant={variant}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm lg:hidden"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { PublicLayout, DashboardLayout }
