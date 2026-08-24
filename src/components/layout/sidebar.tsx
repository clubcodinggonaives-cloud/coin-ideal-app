import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Heart,
  MessageSquare,
  Bell,
  Settings,
  Star,
  Wallet,
  User,
  Briefcase,
  Users,
  FolderOpen,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  X,
  Mail,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/utils/cn"
import { useState } from "react"

interface SidebarLink {
  label: string
  href: string
  icon: React.ReactNode
}

const clientLinks: SidebarLink[] = [
  { label: "Vue d'ensemble", href: ROUTES.DASHBOARD, icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Mes commandes", href: ROUTES.DASHBOARD_ORDERS, icon: <Package className="h-5 w-5" /> },
  { label: "Mes demandes", href: ROUTES.DASHBOARD_REQUESTS, icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Mes réservations", href: ROUTES.DASHBOARD_BOOKINGS, icon: <CalendarCheck className="h-5 w-5" /> },
  { label: "Favoris", href: ROUTES.DASHBOARD_FAVORITES, icon: <Heart className="h-5 w-5" /> },
  { label: "Messages", href: ROUTES.DASHBOARD_MESSAGES, icon: <MessageSquare className="h-5 w-5" /> },
  { label: "Notifications", href: ROUTES.DASHBOARD_NOTIFICATIONS, icon: <Bell className="h-5 w-5" /> },
  { label: "Paramètres", href: ROUTES.DASHBOARD_SETTINGS, icon: <Settings className="h-5 w-5" /> },
]

const providerLinks: SidebarLink[] = [
  { label: "Vue d'ensemble", href: ROUTES.PROVIDER_DASHBOARD, icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Commandes", href: ROUTES.PROVIDER_ORDERS, icon: <Package className="h-5 w-5" /> },
  { label: "Mes services", href: ROUTES.PROVIDER_SERVICES, icon: <Briefcase className="h-5 w-5" /> },
  { label: "Demandes", href: ROUTES.PROVIDER_REQUESTS, icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Réservations", href: ROUTES.PROVIDER_BOOKINGS, icon: <CalendarCheck className="h-5 w-5" /> },
  { label: "Revenus", href: ROUTES.PROVIDER_EARNINGS, icon: <Wallet className="h-5 w-5" /> },
  { label: "Avis", href: ROUTES.PROVIDER_REVIEWS, icon: <Star className="h-5 w-5" /> },
  { label: "Profil professionnel", href: ROUTES.PROVIDER_PROFILE, icon: <User className="h-5 w-5" /> },
]

const adminLinks: SidebarLink[] = [
  { label: "Vue d'ensemble", href: ROUTES.ADMIN, icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Utilisateurs", href: ROUTES.ADMIN_USERS, icon: <Users className="h-5 w-5" /> },
  { label: "Prestataires", href: ROUTES.ADMIN_PROVIDERS, icon: <Briefcase className="h-5 w-5" /> },
  { label: "Services", href: ROUTES.ADMIN_SERVICES, icon: <FileText className="h-5 w-5" /> },
  { label: "Catégories", href: ROUTES.ADMIN_CATEGORIES, icon: <FolderOpen className="h-5 w-5" /> },
  { label: "Tarifs", href: ROUTES.ADMIN_PRICING, icon: <Tag className="h-5 w-5" /> },
  { label: "Commandes", href: ROUTES.ADMIN_ORDERS, icon: <Package className="h-5 w-5" /> },
  { label: "Messages", href: ROUTES.ADMIN_MESSAGES, icon: <Mail className="h-5 w-5" /> },
  { label: "Demandes", href: ROUTES.ADMIN_REQUESTS, icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Avis", href: ROUTES.ADMIN_REVIEWS, icon: <Star className="h-5 w-5" /> },
  { label: "Paramètres", href: ROUTES.ADMIN_SETTINGS, icon: <Shield className="h-5 w-5" /> },
]

interface DashboardSidebarProps {
  variant?: "client" | "provider" | "admin"
  /**
   * Bug trouvé pendant l'audit visuel Playwright de la Phase 4 : cette
   * sidebar n'avait jamais de comportement mobile — elle restait grande
   * ouverte en permanence, écrasant le contenu de la page dans une colonne
   * de ~140px sur téléphone (voir docs/phase-4/PHASE_4_REPORT.md, capture
   * dashboard-orders_320x800). En dessous de `lg`, elle devient un tiroir
   * hors-écran contrôlé par ces deux props ; à `lg` et au-delà, comportement
   * desktop inchangé (le `collapsed` local ci-dessous reste indépendant).
   */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function DashboardSidebar({ variant = "client", mobileOpen = false, onMobileClose }: DashboardSidebarProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const links = variant === "admin" ? adminLinks : variant === "provider" ? providerLinks : clientLinks

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : "Utilisateur"

  return (
    <>
      {/* Backdrop — mobile drawer only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white transition-all",
          // Mobile: fixed off-canvas drawer, slides in from the left.
          "fixed left-0 top-16 bottom-0 z-50 w-72 -translate-x-full lg:static lg:inset-auto lg:z-auto lg:translate-x-0",
          mobileOpen && "translate-x-0",
          // Desktop: sticky column, width driven by the existing collapse toggle.
          "lg:sticky lg:top-16",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-2 lg:hidden">
          <span className="px-2 text-sm font-semibold text-gray-500">Menu</span>
          <button
            onClick={onMobileClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* User info */}
        {!collapsed && (
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile?.avatar_url}
              alt={displayName}
              fallback={displayName}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{profile?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {links.map((link) => {
          const isActive =
            link.href === ROUTES.DASHBOARD ||
            link.href === ROUTES.PROVIDER_DASHBOARD ||
            link.href === ROUTES.ADMIN
              ? location.pathname === link.href
              : location.pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? link.label : undefined}
            >
              {link.icon}
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

        {/* Collapse button — desktop only; mobile uses the drawer's own close (X) button above. */}
        <div className="hidden border-t border-gray-100 p-2 lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}

export { DashboardSidebar }
