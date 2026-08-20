export const APP_NAME = "COIN-IDEAL"
export const APP_DESCRIPTION = "Plateforme multi-services - Trouvez les meilleurs prestataires pour tous vos besoins"
export const APP_URL = import.meta.env.VITE_SUPABASE_URL ? "" : "http://localhost:5173"

export const ROUTES = {
  HOME: "/",
  SERVICES: "/services",
  SERVICE_DETAIL: "/service",
  CATEGORY: "/services",
  PROVIDERS: "/providers",
  PROVIDER_DETAIL: "/provider",
  ABOUT: "/about",
  CONTACT: "/contact",

  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",

  DASHBOARD: "/dashboard",
  DASHBOARD_REQUESTS: "/dashboard/requests",
  DASHBOARD_BOOKINGS: "/dashboard/bookings",
  DASHBOARD_FAVORITES: "/dashboard/favorites",
  DASHBOARD_MESSAGES: "/dashboard/messages",
  DASHBOARD_NOTIFICATIONS: "/dashboard/notifications",
  DASHBOARD_SETTINGS: "/dashboard/settings",

  PROVIDER_DASHBOARD: "/provider/dashboard",
  PROVIDER_SERVICES: "/provider/services",
  PROVIDER_SERVICE_NEW: "/provider/services/new",
  PROVIDER_SERVICE_EDIT: "/provider/services",
  PROVIDER_REQUESTS: "/provider/requests",
  PROVIDER_BOOKINGS: "/provider/bookings",
  PROVIDER_EARNINGS: "/provider/earnings",
  PROVIDER_REVIEWS: "/provider/reviews",
  PROVIDER_PROFILE: "/provider/profile",

  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_PROVIDERS: "/admin/providers",
  ADMIN_SERVICES: "/admin/services",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_REQUESTS: "/admin/requests",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_SETTINGS: "/admin/settings",
} as const

export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  SERVICE_IMAGES: "service-images",
  PROVIDER_DOCUMENTS: "provider-documents",
} as const

export const PAGE_SIZE = 12

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const
