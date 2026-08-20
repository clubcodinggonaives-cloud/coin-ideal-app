import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import { Spinner } from "@/components/ui/spinner"

const PublicLayout = lazy(() =>
  import("@/components/layout/dashboard-layout").then((m) => ({ default: m.PublicLayout }))
)
const DashboardLayout = lazy(() =>
  import("@/components/layout/dashboard-layout").then((m) => ({ default: m.DashboardLayout }))
)

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// Public pages
const Home = lazy(() => import("@/pages/public/home"))
const Services = lazy(() => import("@/pages/public/services"))
const ServiceDetail = lazy(() => import("@/pages/public/service-detail"))
const Category = lazy(() => import("@/pages/public/category"))
const Providers = lazy(() => import("@/pages/public/providers"))
const ProviderDetail = lazy(() => import("@/pages/public/provider-detail"))
const About = lazy(() => import("@/pages/public/about"))
const Contact = lazy(() => import("@/pages/public/contact"))
const NotFound = lazy(() => import("@/pages/not-found"))

// Auth pages
const Login = lazy(() => import("@/pages/auth/login"))
const Register = lazy(() => import("@/pages/auth/register"))
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"))
const ResetPassword = lazy(() => import("@/pages/auth/reset-password"))

// Dashboard pages
const DashboardOverview = lazy(() => import("@/pages/dashboard/overview"))
const DashboardRequests = lazy(() => import("@/pages/dashboard/requests"))
const DashboardBookings = lazy(() => import("@/pages/dashboard/bookings"))
const DashboardFavorites = lazy(() => import("@/pages/dashboard/favorites"))
const DashboardMessages = lazy(() => import("@/pages/dashboard/messages"))
const DashboardNotifications = lazy(() => import("@/pages/dashboard/notifications"))
const DashboardSettings = lazy(() => import("@/pages/dashboard/settings"))

// Provider pages
const ProviderDashboard = lazy(() => import("@/pages/provider/dashboard"))
const ProviderServices = lazy(() => import("@/pages/provider/services"))
const ProviderServiceNew = lazy(() => import("@/pages/provider/service-new"))
const ProviderServiceEdit = lazy(() => import("@/pages/provider/service-edit"))
const ProviderRequests = lazy(() => import("@/pages/provider/requests"))
const ProviderBookings = lazy(() => import("@/pages/provider/bookings"))
const ProviderEarnings = lazy(() => import("@/pages/provider/earnings"))
const ProviderReviews = lazy(() => import("@/pages/provider/reviews"))
const ProviderProfile = lazy(() => import("@/pages/provider/profile"))

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"))
const AdminUsers = lazy(() => import("@/pages/admin/users"))
const AdminProviders = lazy(() => import("@/pages/admin/providers"))
const AdminServices = lazy(() => import("@/pages/admin/services"))
const AdminCategories = lazy(() => import("@/pages/admin/categories"))
const AdminRequests = lazy(() => import("@/pages/admin/requests"))
const AdminReviews = lazy(() => import("@/pages/admin/reviews"))
const AdminSettings = lazy(() => import("@/pages/admin/settings"))

export const router = createBrowserRouter([
  // Public routes
  {
    element: <SuspenseWrapper><PublicLayout /></SuspenseWrapper>,
    children: [
      { path: "/", element: <SuspenseWrapper><Home /></SuspenseWrapper> },
      { path: "/services", element: <SuspenseWrapper><Services /></SuspenseWrapper> },
      { path: "/services/:category", element: <SuspenseWrapper><Category /></SuspenseWrapper> },
      { path: "/service/:id", element: <SuspenseWrapper><ServiceDetail /></SuspenseWrapper> },
      { path: "/providers", element: <SuspenseWrapper><Providers /></SuspenseWrapper> },
      { path: "/provider/:id", element: <SuspenseWrapper><ProviderDetail /></SuspenseWrapper> },
      { path: "/about", element: <SuspenseWrapper><About /></SuspenseWrapper> },
      { path: "/contact", element: <SuspenseWrapper><Contact /></SuspenseWrapper> },
    ],
  },

  // Auth routes (no layout)
  { path: "/auth/login", element: <SuspenseWrapper><Login /></SuspenseWrapper> },
  { path: "/auth/register", element: <SuspenseWrapper><Register /></SuspenseWrapper> },
  { path: "/auth/forgot-password", element: <SuspenseWrapper><ForgotPassword /></SuspenseWrapper> },
  { path: "/auth/reset-password", element: <SuspenseWrapper><ResetPassword /></SuspenseWrapper> },

  // Client dashboard
  {
    path: "/dashboard",
    element: <SuspenseWrapper><DashboardLayout variant="client" /></SuspenseWrapper>,
    children: [
      { index: true, element: <SuspenseWrapper><DashboardOverview /></SuspenseWrapper> },
      { path: "requests", element: <SuspenseWrapper><DashboardRequests /></SuspenseWrapper> },
      { path: "bookings", element: <SuspenseWrapper><DashboardBookings /></SuspenseWrapper> },
      { path: "favorites", element: <SuspenseWrapper><DashboardFavorites /></SuspenseWrapper> },
      { path: "messages", element: <SuspenseWrapper><DashboardMessages /></SuspenseWrapper> },
      { path: "notifications", element: <SuspenseWrapper><DashboardNotifications /></SuspenseWrapper> },
      { path: "settings", element: <SuspenseWrapper><DashboardSettings /></SuspenseWrapper> },
    ],
  },

  // Provider dashboard
  {
    path: "/provider",
    element: <SuspenseWrapper><DashboardLayout variant="provider" /></SuspenseWrapper>,
    children: [
      { path: "dashboard", element: <SuspenseWrapper><ProviderDashboard /></SuspenseWrapper> },
      { path: "services", element: <SuspenseWrapper><ProviderServices /></SuspenseWrapper> },
      { path: "services/new", element: <SuspenseWrapper><ProviderServiceNew /></SuspenseWrapper> },
      { path: "services/:id/edit", element: <SuspenseWrapper><ProviderServiceEdit /></SuspenseWrapper> },
      { path: "requests", element: <SuspenseWrapper><ProviderRequests /></SuspenseWrapper> },
      { path: "bookings", element: <SuspenseWrapper><ProviderBookings /></SuspenseWrapper> },
      { path: "earnings", element: <SuspenseWrapper><ProviderEarnings /></SuspenseWrapper> },
      { path: "reviews", element: <SuspenseWrapper><ProviderReviews /></SuspenseWrapper> },
      { path: "profile", element: <SuspenseWrapper><ProviderProfile /></SuspenseWrapper> },
    ],
  },

  // Admin dashboard
  {
    path: "/admin",
    element: <SuspenseWrapper><DashboardLayout variant="admin" /></SuspenseWrapper>,
    children: [
      { index: true, element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper> },
      { path: "users", element: <SuspenseWrapper><AdminUsers /></SuspenseWrapper> },
      { path: "providers", element: <SuspenseWrapper><AdminProviders /></SuspenseWrapper> },
      { path: "services", element: <SuspenseWrapper><AdminServices /></SuspenseWrapper> },
      { path: "categories", element: <SuspenseWrapper><AdminCategories /></SuspenseWrapper> },
      { path: "requests", element: <SuspenseWrapper><AdminRequests /></SuspenseWrapper> },
      { path: "reviews", element: <SuspenseWrapper><AdminReviews /></SuspenseWrapper> },
      { path: "settings", element: <SuspenseWrapper><AdminSettings /></SuspenseWrapper> },
    ],
  },

  // 404
  { path: "*", element: <SuspenseWrapper><NotFound /></SuspenseWrapper> },
])
