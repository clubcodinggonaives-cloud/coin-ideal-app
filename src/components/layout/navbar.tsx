import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Menu, X, Bell, LogOut, Settings, LayoutDashboard, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/lib/constants"

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { profile, signOut, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.HOME)
    setUserMenuOpen(false)
  }

  const navLinks = [
    { label: "Services", href: ROUTES.SERVICES },
    { label: "Tarifs", href: ROUTES.TARIFS },
    { label: "Comment ça marche", href: ROUTES.HOW_IT_WORKS },
    { label: "Vente d'eau", href: ROUTES.WATER },
    { label: "À propos", href: ROUTES.ABOUT },
    { label: "Contact", href: ROUTES.CONTACT },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="COIN-IDEAL Multi-Service" className="h-10 w-10 object-contain" />
          <span className="hidden text-lg font-bold text-gray-900 sm:block">
            COIN-IDEAL
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <Link to={ROUTES.ORDER} className="hidden lg:block">
            <Button size="default">Commander</Button>
          </Link>
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <Link
                to={ROUTES.DASHBOARD_NOTIFICATIONS}
                className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                >
                  <Avatar
                    src={profile?.avatar_url}
                    alt={profile ? `${profile.first_name} ${profile.last_name}` : ""}
                    fallback={profile ? `${profile.first_name} ${profile.last_name}` : "U"}
                    size="sm"
                  />
                  <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                      {profile && (
                        <div className="border-b border-gray-100 px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {profile.first_name} {profile.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{profile.email}</p>
                          <Badge variant="secondary" className="mt-1.5 text-xs">
                            {profile.role === "admin" ? "Administrateur" : profile.role === "provider" ? "Prestataire" : "Client"}
                          </Badge>
                        </div>
                      )}
                      <div className="py-1">
                        <Link
                          to={ROUTES.DASHBOARD}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Tableau de bord
                        </Link>
                        {profile?.role === "provider" && (
                          <Link
                            to={ROUTES.PROVIDER_DASHBOARD}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Espace prestataire
                          </Link>
                        )}
                        {profile?.role === "admin" && (
                          <Link
                            to={ROUTES.ADMIN}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="h-4 w-4" />
                            Administration
                          </Link>
                        )}
                        <Link
                          to={ROUTES.DASHBOARD_SETTINGS}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Paramètres
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button variant="ghost" onClick={() => navigate(ROUTES.LOGIN)}>
                Connexion
              </Button>
              <Button onClick={() => navigate(ROUTES.REGISTER)}>
                S'inscrire
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          <div className="space-y-1 px-4 py-3">
            <Link to={ROUTES.ORDER} className="block lg:hidden" onClick={() => setMobileOpen(false)}>
              <Button className="w-full">Commander</Button>
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate(ROUTES.LOGIN)
                    setMobileOpen(false)
                  }}
                >
                  Connexion
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    navigate(ROUTES.REGISTER)
                    setMobileOpen(false)
                  }}
                >
                  S'inscrire
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export { Navbar }
