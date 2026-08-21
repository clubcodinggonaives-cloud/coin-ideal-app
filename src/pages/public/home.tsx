import { Link } from "react-router-dom"
import {
  Printer,
  Copy,
  Droplets,
  Upload,
  SlidersHorizontal,
  Receipt,
  Truck,
  ShieldCheck,
  Clock,
  MapPin,
  Wallet,
  ChevronRight,
} from "lucide-react"
import { Button, Card, CardContent, Skeleton } from "@/components/ui"
import { CategoryCard } from "@/components/shared/category-card"
import { usePopularCategories } from "@/features/categories/hooks/use-categories"
import { ROUTES, COMPANY } from "@/lib/constants"

const coreServices = [
  {
    icon: Printer,
    title: "Impression",
    description: "Noir & blanc ou couleur, formats A4/A3, simple face ou recto-verso. Envoyez votre fichier, on s'occupe du reste.",
  },
  {
    icon: Copy,
    title: "Copie",
    description: "Copie noir & blanc ou couleur de vos documents, à l'unité ou en grande quantité, avec ou sans finitions.",
  },
  {
    icon: Droplets,
    title: "Vente d'eau",
    description: "Découvrez nos produits d'eau disponibles à COIN-IDEAL — présentation, prix indicatifs et disponibilité.",
    href: ROUTES.WATER,
  },
]

const steps = [
  {
    icon: Upload,
    title: "Envoyez votre document",
    description: "Téléversez votre fichier (PDF, Word, JPG, PNG) directement depuis le site.",
  },
  {
    icon: SlidersHorizontal,
    title: "Choisissez vos options",
    description: "Format, couleur, recto/verso, nombre de copies et finitions selon vos besoins.",
  },
  {
    icon: Receipt,
    title: "Obtenez une estimation",
    description: "Le prix est calculé automatiquement selon nos tarifs en vigueur.",
  },
  {
    icon: Truck,
    title: "Retirez ou faites-vous livrer",
    description: "Récupérez votre commande à Ruelle Sajous ou faites-la livrer chez vous ou au bureau.",
  },
]

const advantages = [
  {
    icon: ShieldCheck,
    title: "Documents sécurisés",
    description: "Vos fichiers sont stockés de façon privée et ne sont jamais accessibles à d'autres clients.",
  },
  {
    icon: Clock,
    title: "Rapide & fiable",
    description: "Un suivi clair de votre commande, de la réception à la préparation jusqu'au retrait ou à la livraison.",
  },
  {
    icon: Wallet,
    title: "Paiement flexible",
    description: "Espèces, MonCash, NatCash ou virement — choisissez le moyen qui vous convient.",
  },
  {
    icon: MapPin,
    title: "À Gonaïves, pour vous",
    description: "Une entreprise locale, basée à Ruelle Sajous, au service des habitants et professionnels des Gonaïves.",
  },
]

function HomePage() {
  const { data: categories, isLoading: loadingCategories } = usePopularCategories()

  return (
    <div>
      <section className="relative overflow-hidden bg-primary-800 px-4 py-20 sm:px-6 lg:px-8">
        <img
          src="/hero.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/95 via-primary-800/90 to-primary-900/95" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100">
            <MapPin className="h-3.5 w-3.5" />
            {COMPANY.street}, {COMPANY.city}, {COMPANY.country}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Vos impressions. Vos copies. Simplement.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
            Envoyez vos documents en ligne, choisissez vos options, obtenez une estimation et récupérez
            votre commande chez COIN-IDEAL ou faites-la livrer.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.ORDER}>
              <Button size="xl" className="w-full bg-white text-primary-700 hover:bg-primary-50 sm:w-auto">
                <Printer className="h-5 w-5" />
                Commander une impression
              </Button>
            </Link>
            <Link to={ROUTES.SERVICES}>
              <Button
                size="xl"
                variant="outline"
                className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                Découvrir nos services
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Documents 100% sécurisés
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              Retrait gratuit ou livraison
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              Espèces, MonCash, NatCash
            </span>
          </div>
        </div>
      </section>

      {/* Services principaux */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Nos services</h2>
          <p className="mt-2 text-gray-500">Ce que COIN-IDEAL vous propose à Gonaïves</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {coreServices.map((service) => {
            const card = (
              <Card className="h-full text-center transition-shadow hover:shadow-md">
                <CardContent className="space-y-4 pt-8 pb-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <service.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </CardContent>
              </Card>
            )
            return service.href ? (
              <Link key={service.title} to={service.href}>
                {card}
              </Link>
            ) : (
              <Link key={service.title} to={ROUTES.SERVICES}>
                {card}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Catégories dynamiques (Supabase) */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Catégories de services</h2>
              <p className="mt-1 text-gray-500">Parcourez le détail de nos prestations</p>
            </div>
            <Link
              to={ROUTES.SERVICES}
              className="hidden items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500 sm:flex"
            >
              Voir tout <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loadingCategories ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">
              Le catalogue détaillé sera bientôt disponible.{" "}
              <Link to={ROUTES.CONTACT} className="font-medium text-primary-600 hover:underline">
                Contactez-nous
              </Link>{" "}
              pour un devis.
            </p>
          )}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Comment ça marche ?</h2>
          <p className="mt-2 text-gray-500">De l'envoi de votre document à la réception, en 4 étapes</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                <step.icon className="h-8 w-8" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white ring-2 ring-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to={ROUTES.HOW_IT_WORKS}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            En savoir plus sur le déroulement d'une commande <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Avantages */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Pourquoi COIN-IDEAL ?</h2>
            <p className="mt-2 text-gray-500">Une entreprise de confiance, au service des Gonaïves</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map((advantage, index) => (
              <Card key={index} className="text-center">
                <CardContent className="space-y-4 pt-6">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <advantage.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{advantage.title}</h3>
                  <p className="text-sm text-gray-500">{advantage.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-primary-700 px-8 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Prêt à envoyer votre document ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-100">
            Commandez votre impression ou copie en quelques minutes et choisissez le retrait au local
            ou la livraison.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to={ROUTES.ORDER}>
              <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                Commander maintenant
              </Button>
            </Link>
            <Link to={ROUTES.TARIFS} className="text-sm font-medium text-primary-200 hover:text-white">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
