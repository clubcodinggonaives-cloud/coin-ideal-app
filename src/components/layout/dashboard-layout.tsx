import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { DashboardSidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Spinner } from "@/components/ui/spinner"

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function DashboardLayout({ variant = "client" }: { variant?: "client" | "provider" | "admin" }) {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const location = useLocation()

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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <DashboardSidebar variant={variant} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { PublicLayout, DashboardLayout }
