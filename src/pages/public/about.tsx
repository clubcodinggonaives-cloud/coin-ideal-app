import { Link } from "react-router-dom"
import { Zap, ShieldCheck, MapPin, Users } from "lucide-react"
import { Button, Card, CardContent } from "@/components/ui"
import { COMPANY, ROUTES } from "@/lib/constants"

const values = [
  {
    icon: Zap,
    title: "Rapidité",
    description:
      "Envoyez votre document en ligne et suivez chaque étape, de la réception à la préparation.",
  },
  {
    icon: ShieldCheck,
    title: "Confiance",
    description: "Vos fichiers sont stockés de façon privée, accessibles uniquement à COIN-IDEAL et à vous.",
  },
  {
    icon: MapPin,
    title: "Proximité",
    description: `Une entreprise locale, basée à ${COMPANY.street}, ${COMPANY.city}, au service du quartier.`,
  },
  {
    icon: Users,
    title: "Accessibilité",
    description:
      "Des services pensés pour les habitants, étudiants, professionnels, entreprises et institutions des Gonaïves.",
  },
]

function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-700 to-primary-800 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">À propos de COIN-IDEAL</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
            L'impression et la copie, plus rapides et plus accessibles, aux Gonaïves.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Notre mission</h2>
        <div className="mt-6 space-y-4 text-gray-600">
          <p>
            COIN-IDEAL Multi-Service est une entreprise basée à {COMPANY.street}, {COMPANY.city},{" "}
            {COMPANY.country}, dirigée par {COMPANY.owner}. Notre activité principale est l'impression et
            la copie de documents ; nous proposons également la vente d'eau.
          </p>
          <p>
            Notre mission est simple : rendre les services d'impression et de copie plus rapides et plus
            accessibles aux habitants, étudiants, professionnels, entreprises et institutions des
            Gonaïves. Commandez vos impressions et copies depuis chez vous, payez, puis récupérez vos
            documents chez COIN-IDEAL ou faites-les livrer à votre domicile ou à votre bureau.
          </p>
          <p>
            Nous continuons à développer nos services pour mieux répondre aux besoins de notre
            communauté, avec un souci constant de rapidité, de confidentialité et de proximité.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Nos valeurs</h2>
            <p className="mt-2 text-gray-500">Les principes qui guident notre travail au quotidien</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="space-y-4 pt-6">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{value.title}</h3>
                  <p className="text-sm text-gray-500">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {COMPANY.owner.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{COMPANY.owner}</h3>
              <p className="text-sm text-primary-600">Propriétaire, COIN-IDEAL Multi-Service</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="bg-primary-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">Une question ? Une commande ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">
            Contactez-nous ou envoyez directement votre document pour obtenir une estimation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to={ROUTES.ORDER}>
              <Button size="lg">Commander une impression</Button>
            </Link>
            <Link to={ROUTES.CONTACT}>
              <Button variant="outline" size="lg">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
