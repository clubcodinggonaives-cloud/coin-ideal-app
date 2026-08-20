export const APP_NAME = "COIN-IDEAL"
export const APP_DESCRIPTION = "Impression, copie et vente d'eau à Gonaïves, Haïti — commandez en ligne, payez, puis retirez ou faites-vous livrer."
export const APP_URL = import.meta.env.VITE_SUPABASE_URL ? "" : "http://localhost:5173"

/**
 * Coordonnées officielles de l'entreprise, telles que définies dans le
 * cahier des charges. Toute valeur non confirmée reste vide plutôt que
 * d'être inventée — les écrans qui les consomment doivent gérer ce cas
 * (ex. masquer le champ ou afficher "à venir") au lieu d'afficher une
 * fausse coordonnée.
 */
export const COMPANY = {
  name: "COIN-IDEAL Multi-Service",
  owner: "GUY Petit-Homme",
  street: "Ruelle Sajous",
  city: "Gonaïves",
  country: "Haïti",
  email: "contact@coin-ideal.com",
  phone: "", // TODO: numéro de téléphone officiel à renseigner
  whatsapp: "", // TODO: numéro WhatsApp officiel à renseigner
} as const

export const CURRENCY = "HTG"

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "moncash", label: "MonCash" },
  { value: "natcash", label: "NatCash" },
  { value: "transfer", label: "Virement" },
] as const

export const ROUTES = {
  HOME: "/",
  SERVICES: "/services",
  SERVICE_DETAIL: "/service",
  CATEGORY: "/services",
  TARIFS: "/tarifs",
  HOW_IT_WORKS: "/comment-ca-marche",
  WATER: "/vente-eau",
  ORDER: "/commander",
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
  ORDER_DOCUMENTS: "order-documents",
} as const

/** Formats de fichiers acceptés pour une commande d'impression/copie (cahier des charges §4.2). */
export const ORDER_FILE_ACCEPT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"] as const
export const ORDER_FILE_MAX_SIZE_MB = 20

export const PAGE_SIZE = 12

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const
