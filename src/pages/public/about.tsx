import { Link } from "react-router-dom"
import { Target, Heart, Users, Shield } from "lucide-react"
import { Button, Card, CardContent } from "@/components/ui"
import { ROUTES } from "@/lib/constants"

const values = [
  {
    icon: Target,
    title: "Excellence",
    description:
      "Nous nous engageons a offrir la meilleure experience possible a nos utilisateurs, tant pour les clients que pour les prestataires.",
  },
  {
    icon: Shield,
    title: "Confiance",
    description:
      "La transparence et la securite sont au coeur de notre plateforme. Chaque prestataire est verifie et chaque avis est authentique.",
  },
  {
    icon: Heart,
    title: "Communaute",
    description:
      "Nous cultivons un esprit d'entraide et de solidarite entre les membres de notre communaute.",
  },
  {
    icon: Users,
    title: "Inclusion",
    description:
      "COIN-IDEAL s'adresse a tous, sans distinction. Nous rendons les services accessibles au plus grand nombre.",
  },
]

const team = [
  {
    name: "Equipe Fondatrice",
    role: "Vision et Strategie",
    description:
      "Une equipe passee par la technologie et le service, dediee a connecter les talents avec les opportunites.",
  },
  {
    name: "Equipe Technique",
    role: "Developpement & Innovation",
    description:
      "Des developpeurs talentueux qui construisent et ameliorent continuellement la plateforme pour une experience fluide.",
  },
  {
    name: "Equipe Support",
    role: "Accompagnement & Aide",
    description:
      "Une equipe reactive disponible pour accompagner les utilisateurs et resoudre leurs problemes rapidement.",
  },
]

function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            A propos de COIN-IDEAL
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
            La plateforme multi-services qui connecte les meilleurs prestataires avec les clients
            qui ont besoin d'eux.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Notre mission</h2>
        <div className="mt-6 space-y-4 text-gray-600">
          <p>
            COIN-IDEAL est nee d&apos;une conviction simple : trouver un prestataire de confiance
            ne devrait jamais etre complique. Notre mission est de creer un pont fiable entre
            les clients a la recherche de services de qualite et les professionnels qui les
            proposent.
          </p>
          <p>
            Nous croyons que chaque personne merite d&apos;acceder a des services fiables, transparents
            et abordables. Que vous cherchiez un plombier, un electricien, un formateur ou
            tout autre professionnel, COIN-IDEAL est la pour vous simplifier la vie.
          </p>
          <p>
            Pour les prestataires, nous offrons une vitrine numerique pour presenter leurs
            competences, attirer de nouveaux clients et developper leur activite dans un
            environnement securise et equitable.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Nos valeurs</h2>
            <p className="mt-2 text-gray-500">
              Les principes qui guident chaque decision
            </p>
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

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Notre equipe</h2>
          <p className="mt-2 text-gray-500">
            Les personnes qui rendent tout cela possible
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {team.map((member, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  {member.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm font-medium text-primary-600">{member.role}</p>
                <p className="text-sm text-gray-500">{member.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">Rejoignez-nous</h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">
            Que vous soyez client a la recherche de services ou prestataire souhaite developper
            votre activite, COIN-IDEAL est la plateforme qu&apos;il vous faut.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg">Creer un compte</Button>
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
