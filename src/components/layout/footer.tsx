import { Link } from "react-router-dom"
import { Phone, MapPin } from "lucide-react"
import { ROUTES, APP_NAME, COMPANY, SOCIAL_LINKS } from "@/lib/constants"
import { WhatsAppIcon, FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons/social-icons"

const SOCIALS = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
] as const

function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: "Services",
      links: [
        { label: "Impression & copie", href: ROUTES.SERVICES },
        { label: "Vente d'eau", href: ROUTES.WATER },
        { label: "Tarifs", href: ROUTES.TARIFS },
        { label: "Comment ça marche", href: ROUTES.HOW_IT_WORKS },
      ],
    },
    {
      title: "Entreprise",
      links: [
        { label: "À propos", href: ROUTES.ABOUT },
        { label: "Contact", href: ROUTES.CONTACT },
        { label: "Espace client", href: ROUTES.DASHBOARD },
      ],
    },
    {
      title: "Légal",
      links: [
        { label: "Conditions d'utilisation", href: "#" },
        { label: "Politique de confidentialité", href: "#" },
        { label: "Mentions légales", href: "#" },
      ],
    },
  ]

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to={ROUTES.HOME} className="flex items-center gap-2">
              <img src="/logo.png" alt={APP_NAME} className="h-10 w-10 object-contain" />
              <span className="text-lg font-bold text-gray-900">{APP_NAME}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-500">
              Impression, copie et vente d'eau à {COMPANY.city}, {COMPANY.country}. Commandez en ligne,
              retirez au local ou faites-vous livrer.
            </p>
            <div className="mt-4 space-y-2">
              <a
                href={`https://wa.me/${COMPANY.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp : +509 41 00 2675
              </a>
              {COMPANY.phone && (
                <a href={`tel:${COMPANY.phone}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600">
                  <Phone className="h-4 w-4" />
                  {COMPANY.phone}
                </a>
              )}
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 shrink-0" />
                {COMPANY.street}, {COMPANY.city}, {COMPANY.country}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              {SOCIALS.map(({ key, label, Icon }) => {
                const href = SOCIAL_LINKS[key]
                return href ? (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    key={key}
                    aria-label={`${label} (lien à venir)`}
                    title={`${label} — lien à venir`}
                    className="cursor-default text-gray-300"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                )
              })}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-500 hover:text-primary-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          &copy; {currentYear} {APP_NAME}. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}

export { Footer }
