import { Link } from "react-router-dom"
import { Building2, Tag, FolderOpen, Wallet, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "@/components/ui"
import { ChangePinCard } from "@/features/auth/components/change-pin-card"
import { COMPANY, PAYMENT_METHODS, ROUTES } from "@/lib/constants"

/**
 * Il n'existe pas de table "platform_settings" séparée dans ce schéma --
 * les vrais réglages de la plateforme sont déjà chacun sur leur propre
 * page (tarifs/frais de livraison : settings, 00028, géré par
 * /admin/pricing ; catégories : /admin/categories). Cette page était un
 * pur placeholder ("Page en construction") ; plutôt qu'inventer une table
 * de configuration qui n'existe pas, elle sert maintenant de vue
 * d'ensemble honnête : les infos d'entreprise actuelles (lecture seule,
 * definies dans src/lib/constants.ts) + des raccourcis vers les réglages
 * qui existent déjà ailleurs.
 */
function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Vue d&apos;ensemble des informations et réglages de la plateforme.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            Informations de l&apos;entreprise
          </CardTitle>
          <CardDescription>
            Définies dans le code (src/lib/constants.ts) — modifiables uniquement par un changement de code, pas
            depuis cette page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Nom</p>
            <p className="text-sm text-gray-900">{COMPANY.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Propriétaire</p>
            <p className="text-sm text-gray-900">{COMPANY.owner}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Adresse</p>
            <p className="text-sm text-gray-900">
              {COMPANY.street}, {COMPANY.city}, {COMPANY.country}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
            <p className="text-sm text-gray-900">{COMPANY.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Téléphone</p>
            <p className="text-sm text-gray-900">{COMPANY.phone || "Non renseigné"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">WhatsApp</p>
            <p className="text-sm text-gray-900">+{COMPANY.whatsapp}</p>
          </div>
        </CardContent>
      </Card>

      <ChangePinCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-600" />
            Moyens de paiement acceptés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <li key={m.value} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                {m.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-50 p-2.5 text-primary-600">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Tarifs et frais de livraison</p>
                <p className="text-sm text-gray-500">Prix, majoration couleur, frais forfaitaire</p>
              </div>
            </div>
            <Link to={ROUTES.ADMIN_PRICING}>
              <Button variant="ghost" size="icon-sm" aria-label="Gérer les tarifs">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-50 p-2.5 text-primary-600">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Catégories de services</p>
                <p className="text-sm text-gray-500">Organisation du catalogue public</p>
              </div>
            </div>
            <Link to={ROUTES.ADMIN_CATEGORIES}>
              <Button variant="ghost" size="icon-sm" aria-label="Gérer les catégories">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminSettingsPage
