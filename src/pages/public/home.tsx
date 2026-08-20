import { Link } from "react-router-dom"
import {
  Search,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Shield,
  CreditCard,
  Star,
  ChevronRight,
} from "lucide-react"
import { Button, Card, CardContent, Skeleton } from "@/components/ui"
import { SearchBar } from "@/components/shared/search-bar"
import { ServiceCard } from "@/components/shared/service-card"
import { ProviderCard } from "@/components/shared/provider-card"
import { CategoryCard } from "@/components/shared/category-card"
import { usePopularCategories } from "@/features/categories/hooks/use-categories"
import { usePopularServices } from "@/features/services/hooks/use-services"
import { useRecommendedProviders } from "@/features/providers/hooks/use-providers"
import { ROUTES } from "@/lib/constants"

const steps = [
  {
    icon: Search,
    title: "Recherchez",
    description: "Parcourez nos catégories ou utilisez la barre de recherche pour trouver le service qui vous convient.",
  },
  {
    icon: CheckCircle,
    title: "Choisissez",
    description: "Comparez les prestataires, consultez les avis et choisissez le meilleur professionnel pour votre besoin.",
  },
  {
    icon: Sparkles,
    title: "Profitez",
    description: "Contactez le prestataire, convenez des modalités et profitez d'un service de qualité.",
  },
]

const advantages = [
  {
    icon: Shield,
    title: "Prestataires vérifiés",
    description: "Tous nos prestataires sont vérifiés et approuvés pour garantir un service de confiance.",
  },
  {
    icon: Star,
    title: "Avis authentiques",
    description: "Consultez les avis de vrais clients pour prendre des décisions éclairées.",
  },
  {
    icon: CreditCard,
    title: "Tarifs transparents",
    description: "Pas de frais cachés. Comparez les prix et choisissez selon votre budget.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie intégrée",
    description: "Échangez directement avec les prestataires via notre plateforme sécurisée.",
  },
]

const testimonials = [
  {
    name: "Aminata K.",
    rating: 5,
    comment: "J'ai trouvé un plombier excellent en quelques minutes. Le service était rapide et le prix très raisonnable. Je recommande vivement COIN-IDEAL !",
  },
  {
    name: "Moussa D.",
    rating: 5,
    comment: "En tant que prestataire, cette plateforme m'a permis de trouver de nouveaux clients facilement. L'interface est intuitive et le support est réactif.",
  },
  {
    name: "Fatou S.",
    rating: 4,
    comment: "Super application pour trouver des prestataires de confiance dans mon quartier. Les avis m'ont vraiment aidé à faire le bon choix.",
  },
]

function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="aspect-[16/10] rounded-t-xl" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  )
}

function SkeletonProviderCard() {
  return (
    <Card>
      <div className="space-y-4 p-6 text-center">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto h-5 w-32" />
        <Skeleton className="mx-auto h-4 w-24" />
        <Skeleton className="mx-auto h-4 w-20" />
      </div>
    </Card>
  )
}

function HomePage() {
  const { data: categories, isLoading: loadingCategories } = usePopularCategories()
  const { data: services, isLoading: loadingServices } = usePopularServices(8)
  const { data: providers, isLoading: loadingProviders } = useRecommendedProviders(6)

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Trouvez le prestataire idéal pour tous vos besoins
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
            COIN-IDEAL est la plateforme qui met en relation les meilleurs prestataires de services
            avec les clients qui ont besoin d'eux. Simple, rapide et fiable.
          </p>
          <div className="mt-10">
            <SearchBar variant="hero" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-primary-200">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Prestataires vérifiés
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Avis authentiques
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Service gratuit
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Catégories populaires</h2>
            <p className="mt-1 text-gray-500">Explorez nos services par catégorie</p>
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
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Services populaires</h2>
              <p className="mt-1 text-gray-500">Les services les plus demandés</p>
            </div>
            <Link
              to={ROUTES.SERVICES}
              className="hidden items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500 sm:flex"
            >
              Voir tout <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loadingServices ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">Aucun service disponible pour le moment.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prestataires recommandés</h2>
            <p className="mt-1 text-gray-500">Les professionnels les mieux notés</p>
          </div>
          <Link
            to={ROUTES.PROVIDERS}
            className="hidden items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500 sm:flex"
          >
            Voir tout <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {loadingProviders ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonProviderCard key={i} />
            ))}
          </div>
        ) : providers && providers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Comment ça marche ?</h2>
            <p className="mt-2 text-gray-500">Trouvez votre prestataire en 3 étapes simples</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                  <step.icon className="h-8 w-8" />
                </div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-5xl font-bold text-primary-100">
                  {index + 1}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Pourquoi COIN-IDEAL ?</h2>
          <p className="mt-2 text-gray-500">Les avantages de notre plateforme</p>
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
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Ce que disent nos utilisateurs</h2>
            <p className="mt-2 text-gray-500">Des milliers de clients satisfaits nous font confiance</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < testimonial.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">&ldquo;{testimonial.comment}&rdquo;</p>
                  <p className="text-sm font-medium text-gray-900">{testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-primary-600 px-8 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Vous êtes prestataire ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-100">
            Rejoignez COIN-IDEAL et trouvez de nouveaux clients. Créez votre profil, publiez vos services
            et développez votre activité.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                Créer mon compte prestataire
              </Button>
            </Link>
            <Link
              to={ROUTES.ABOUT}
              className="text-sm font-medium text-primary-200 hover:text-white"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
